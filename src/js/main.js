
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
 
// Fix Leaflet's default marker icon paths, which break under Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})
// ---------------------------------------------------------------------------
// getChild()
// Helper: finds a direct child element by tag name.
// Uses tagName comparison instead of getElementsByTagName, which has
// proven unreliable for XML documents parsed with DOMParser in some browsers.
// ---------------------------------------------------------------------------
function getChild(node, tag) {
  if (!node) {
    console.log('getChild called with null node, tag:', tag)
    return null
  }
  const result = Array.from(node.children).find(el => el.tagName === tag) ?? null
  console.log(`getChild(${tag}):`, result)
  return result
}
// ---------------------------------------------------------------------------
// parseDate()
// Reads a <date> node and returns a structured object.
// year and era are always present; month and day are optional.
// ---------------------------------------------------------------------------
function parseDate(dateNode) {
  const year  = parseInt(getChild(dateNode, 'year')?.textContent.trim())
  const month = getChild(dateNode, 'month')?.textContent.trim() ?? null
  const day   = getChild(dateNode, 'day')?.textContent.trim()   ?? null
  const era   = getChild(dateNode, 'era')?.textContent.trim()
 
  return { year, month, day, era }
}
 
// ---------------------------------------------------------------------------
// toAstronomicalYear()
// Converts a parsed date to a single number on a continuous timeline.
// AD 1  =  1
// BC 1  =  0
// BC 55 = -54
// This is the number used for all proportional positioning arithmetic.
// ---------------------------------------------------------------------------
function toAstronomicalYear(parsedDate) {
  if (parsedDate.era === 'BC') {
    return -(parsedDate.year - 1)
  } else {
    return parsedDate.year
  }
}
 
// ---------------------------------------------------------------------------
// formatDate()
// Turns a parsed date object into a human-readable string.
// Handles all combinations of year-only, year+month, year+month+day.
// Examples:
//   { year: 55,   month: null, day: null, era: 'BC' } → "55 BC"
//   { year: 31,   month: '09', day: null, era: 'BC' } → "Sep 31 BC"
//   { year: 1789, month: '07', day: '14', era: 'AD' } → "14 Jul 1789"
// ---------------------------------------------------------------------------
function formatDate({ year, month, day, era }) {
  const monthNames = [
    'Jan','Feb','Mar','Apr','May','Jun',
    'Jul','Aug','Sep','Oct','Nov','Dec'
  ]
  const parts = []
  if (day)   parts.push(parseInt(day))
  if (month) parts.push(monthNames[parseInt(month) - 1])
  parts.push(year)
  if (era === 'BC') parts.push('BC')
  return parts.join(' ')
}
 
// ---------------------------------------------------------------------------
// parseEvents()
// Fetches public/events.xml and returns a plain JS array of event objects.
// Uses import.meta.env.BASE_URL so paths work in both dev and gh-pages.
// ---------------------------------------------------------------------------
async function parseEvents() {
  const response = await fetch(`${import.meta.env.BASE_URL}events.xml`)
  const text = await response.text()
  const xml = new DOMParser().parseFromString(text, 'application/xml')
 
  const nodes = Array.from(xml.documentElement.children)
 
console.log('first node type:', nodes[0].nodeType, 'tag:', nodes[0].tagName)
  return nodes.map(node => {
    const parsedDate = parseDate(getChild(node, 'date'))
    return {
      title:           getChild(node, 'title')?.textContent.trim(),
      date:            parsedDate,
      astronomicalYear: toAstronomicalYear(parsedDate),
      displayDate:     formatDate(parsedDate),
      description:     getChild(node, 'description')?.textContent.trim(),
      lat:             parseFloat(getChild(node, 'lat')?.textContent),
      lon:             parseFloat(getChild(node, 'lon')?.textContent),
      media:           getChild(node, 'media')?.textContent.trim() ?? null,
    }
  })
}

// ---------------------------------------------------------------------------
// buildMap()
// Initialises a Leaflet map and adds one marker per event.
// Clicking a marker highlights the matching card in the timeline panel.
// ---------------------------------------------------------------------------
function buildMap(events) {
  const map = L.map('map').setView([48.8566, 2.3522], 12)
 
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map)
 
  events.forEach((event, index) => {
    const marker = L.marker([event.lat, event.lon])
      .addTo(map)
      .bindPopup(`<strong>${event.title}</strong><br>${event.displayDate}`)
 
    marker.on('click', () => {
      highlightCard(index)
    })
  })
 
  return map
}
 
// ---------------------------------------------------------------------------
// buildTimeline()
// Renders a horizontal strip of event cards below the map.
// Clicking a card pans the map to that event's location.
// ---------------------------------------------------------------------------
function buildTimeline(events, map) {
  const container = document.getElementById('timeline')
 
  events.forEach((event, index) => {
    const card = document.createElement('div')
    card.className = 'event-card'
    card.dataset.index = index
 
    card.innerHTML = `
      <div class="event-date">${event.displayDate}</div>
      <div class="event-title">${event.title}</div>
      <div class="event-desc">${event.description}</div>
      ${event.media ? `<img class="event-media" src="${event.media}" alt="${event.title}" />` : ''}
    `
 
    card.addEventListener('click', () => {
      map.setView([event.lat, event.lon], 14)
      highlightCard(index)
    })
 
    container.appendChild(card)
  })
}
 
// ---------------------------------------------------------------------------
// highlightCard()
// Adds an .active class to the selected card and removes it from others.
// Also scrolls the timeline panel so the active card is visible.
// ---------------------------------------------------------------------------
function highlightCard(index) {
  document.querySelectorAll('.event-card').forEach(card => {
    card.classList.remove('active')
  })
  const active = document.querySelector(`.event-card[data-index="${index}"]`)
  if (active) {
    active.classList.add('active')
    active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }
}
// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
const events = await parseEvents()
events.sort((a, b) => a.astronomicalYear - b.astronomicalYear);
const map = buildMap(events)
buildTimeline(events, map)
