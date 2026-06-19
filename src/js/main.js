import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix Leaflet's default marker icon paths, which break under Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// ---------------------------------------------------------------------------
// parseEvents()
// Fetches src/data/events.xml and returns a plain JS array of event objects.
// This is the only function that knows about XML — everything else works with
// the plain array it returns, so swapping the data format later is easy.
// ---------------------------------------------------------------------------
async function parseEvents() {
  const response = await fetch('timeMapper2/events.xml')
  const text = await response.text()
  const xml = new DOMParser().parseFromString(text, 'application/xml')

  const nodes = Array.from(xml.querySelectorAll('event'))

  return nodes.map(node => ({
    title:       node.querySelector('title').textContent.trim(),
    date:        node.querySelector('date').textContent.trim(),
    description: node.querySelector('description').textContent.trim(),
    lat:         parseFloat(node.querySelector('lat').textContent),
    lon:         parseFloat(node.querySelector('lon').textContent),
    media:       node.querySelector('media')?.textContent.trim() ?? null,
  }))
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
      .bindPopup(`<strong>${event.title}</strong><br>${event.date}`)

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
      <div class="event-date">${formatDate(event.date)}</div>
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
// formatDate()
// Turns "1789-07-14" into "14 Jul 1789" for display.
// ---------------------------------------------------------------------------
function formatDate(isoString) {
  const [year, month, day] = isoString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
const events = await parseEvents()
const map = buildMap(events)
buildTimeline(events, map)