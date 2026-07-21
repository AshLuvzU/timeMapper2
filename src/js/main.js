
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
  const month = getChild(dateNode, 'month')?.textContent.trim() ?? 0
  const day   = getChild(dateNode, 'day')?.textContent.trim()   ?? 0
  const era   = getChild(dateNode, 'era')?.textContent.trim()
 
  return { year, month, day, era }
}
 
// ---------------------------------------------------------------------------
// toAstronomicalYear()
// Converts a parsed date to a single number on a continuous timeline.
// BC 55 = -55, BC 1 = -1, year 0 = 0, AD 1 = 1, AD 1789 = 1789
// ---------------------------------------------------------------------------
function toAstronomicalYear(parsedDate) {
  if (parsedDate.era === 'BC') {
    return -(parsedDate.year)
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
 
function formatDateEnd({ year, month, day, era }) {
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
// Reads both type="start" and type="end" date elements.
// ---------------------------------------------------------------------------
async function parseEvents() {
  const response = await fetch(`${import.meta.env.BASE_URL}events.xml`)
  const text = await response.text()
  const xml = new DOMParser().parseFromString(text, 'application/xml')
 
  const nodes = Array.from(xml.documentElement.children)
 
  console.log('first node type:', nodes[0].nodeType, 'tag:', nodes[0].tagName)
 
  return nodes.map(node => {
    const startDateNode = Array.from(node.children).find(el => el.tagName === 'date' && el.getAttribute('type') === 'start')
    const endDateNode   = Array.from(node.children).find(el => el.tagName === 'date' && el.getAttribute('type') === 'end')
 
    const startDate = parseDate(startDateNode)
    const endDate   = endDateNode && endDateNode.children.length > 0 ? parseDate(endDateNode) : null
 
    return {
      title:               getChild(node, 'title')?.textContent.trim(),
      date:                startDate,
      endDate:             endDate,
      astronomicalYear:    toAstronomicalYear(startDate),
      astronomicalYearEnd: endDate ? toAstronomicalYear(endDate) : null,
      displayDate:         formatDate(startDate),
      displayDateEnd: endDate ? formatDate(endDate) : "", 
      description:         getChild(node, 'description')?.textContent.trim(),
      lat:                 parseFloat(getChild(node, 'lat')?.textContent),
      lon:                 parseFloat(getChild(node, 'lon')?.textContent),
      media:               getChild(node, 'media')?.textContent.trim() ?? null,
    }
  })
}
 
// ---------------------------------------------------------------------------
// buildMap()
// Initialises a Leaflet map and adds one marker per event.
// Clicking a marker triggers full event selection.
// ---------------------------------------------------------------------------
function buildMap(events, onSelect) {
  const map = L.map('map').setView([48.8566, 2.3522], 4)
 
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map)
 
  var pinIcon = L.icon({
    iconUrl: './images/pin.png',
    iconSize:    [50, 60],
    iconAnchor:  [25, 60],
    popupAnchor: [0, -60]
  })
 
  events.forEach((event, index) => {
    const marker = L.marker([event.lat, event.lon], { icon: pinIcon })
      .addTo(map)
      .bindPopup(`<strong>${event.title}</strong><br>${event.displayDate}`)
 
    marker.on('click', () => onSelect(index))
  })
 
  return map
}
 
// ---------------------------------------------------------------------------
// buildCard()
// Renders the SVG detail card panel for the currently selected event.
// ---------------------------------------------------------------------------
function buildCard(event, index, events, onSelect) {
  const panel = document.getElementById('card-panel')
  panel.innerHTML = ''
 
  const screenWidth = window.innerWidth
  const svgHeight = 159
  const svgWidth = screenWidth
 
  const svgNS = "http://www.w3.org/2000/svg"
 
  const svg = document.createElementNS(svgNS, "svg")
  svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
  svg.setAttribute('width', svgWidth)
  svg.setAttribute('height', svgHeight)
  svg.style.flexShrink = 0
 
  const Hline1 = document.createElementNS(svgNS, "line")
  Hline1.setAttribute('x1', 0); Hline1.setAttribute('y1', 40)
  Hline1.setAttribute('x2', svgWidth); Hline1.setAttribute('y2', 40)
  Hline1.setAttribute('stroke', '#173aff'); Hline1.setAttribute('stroke-width', 3)
  svg.appendChild(Hline1)
 
  const Hline2 = document.createElementNS(svgNS, "line")
  Hline2.setAttribute('x1', 0); Hline2.setAttribute('y1', 65)
  Hline2.setAttribute('x2', svgWidth); Hline2.setAttribute('y2', 65)
  Hline2.setAttribute('stroke', '#173aff'); Hline2.setAttribute('stroke-width', 3)
  svg.appendChild(Hline2)
 
  const Hline3 = document.createElementNS(svgNS, "line")
  Hline3.setAttribute('x1', 0); Hline3.setAttribute('y1', 90)
  Hline3.setAttribute('x2', svgWidth); Hline3.setAttribute('y2', 90)
  Hline3.setAttribute('stroke', '#173aff'); Hline3.setAttribute('stroke-width', 3)
  svg.appendChild(Hline3)
 
  const Hline4 = document.createElementNS(svgNS, "line")
  Hline4.setAttribute('x1', 0); Hline4.setAttribute('y1', 115)
  Hline4.setAttribute('x2', svgWidth); Hline4.setAttribute('y2', 115)
  Hline4.setAttribute('stroke', '#173aff'); Hline4.setAttribute('stroke-width', 3)
  svg.appendChild(Hline4)
 
  const Hline5 = document.createElementNS(svgNS, "line")
  Hline5.setAttribute('x1', 0); Hline5.setAttribute('y1', 140)
  Hline5.setAttribute('x2', svgWidth); Hline5.setAttribute('y2', 140)
  Hline5.setAttribute('stroke', '#173aff'); Hline5.setAttribute('stroke-width', 3)
  svg.appendChild(Hline5)
 
  const Vline = document.createElementNS(svgNS, "line")
  Vline.setAttribute('x1', 30); Vline.setAttribute('y1', 0)
  Vline.setAttribute('x2', 30); Vline.setAttribute('y2', svgHeight)
  Vline.setAttribute('stroke', '#ff0000'); Vline.setAttribute('stroke-width', 6)
  svg.appendChild(Vline)
 
  const date = document.createElementNS(svgNS, "text")
  date.setAttribute('x', 40); date.setAttribute('y', 35)
  date.setAttribute('fill', '#ff0000'); date.setAttribute('font-size', 40)
  date.textContent = `${event.displayDate} - ${event.displayDateEnd}`
  svg.appendChild(date)
 
  const title = document.createElementNS(svgNS, "text")
  title.setAttribute('x', 40); title.setAttribute('y', 62)
  title.setAttribute('fill', '#173aff'); title.setAttribute('font-size', 25)
  title.textContent = `${event.title}`
  svg.appendChild(title)
 
  const desc = document.createElementNS(svgNS, "text")
  desc.setAttribute('x', 40); desc.setAttribute('y', 89)
  desc.setAttribute('fill', '#363636'); desc.setAttribute('font-size', 20)
  desc.textContent = `${event.description}`
  svg.appendChild(desc)
 
  console.log(events)
  console.log(index)
 
  // Next button — only show if there's a next event
  if (index < events.length - 1) {
    const nextBtn = document.createElementNS(svgNS, 'g')
    nextBtn.style.cursor = 'pointer'
 
    const btnRect = document.createElementNS(svgNS, 'rect')
    btnRect.setAttribute('x', 600); btnRect.setAttribute('y', 200)
    btnRect.setAttribute('width', 500); btnRect.setAttribute('height', 700)
    btnRect.setAttribute('rx', 6); btnRect.setAttribute('fill', 'url(#arrow)')
    nextBtn.appendChild(btnRect)
 
    nextBtn.addEventListener('click', () => onSelect(index + 1))
    svg.appendChild(nextBtn)
 
    const arrow = document.createElementNS(svgNS, "image")
    arrow.setAttribute("href", "./images/arrow.png")
    arrow.setAttribute("x", svgWidth - 400); arrow.setAttribute("y", 55)
    arrow.setAttribute("width", 200); arrow.setAttribute("height", 120)
    arrow.setAttribute('class', 'arrow')
    nextBtn.appendChild(arrow)
  }
 
  // Previous button — only show if there's a previous event
  if (index > 0) {
    const prevBtn = document.createElementNS(svgNS, 'g')
    prevBtn.style.cursor = 'pointer'
 
    const btnRect = document.createElementNS(svgNS, 'rect')
    btnRect.setAttribute('x', 20); btnRect.setAttribute('y', 120)
    btnRect.setAttribute('width', 80); btnRect.setAttribute('height', 30)
    btnRect.setAttribute('rx', 6); btnRect.setAttribute('fill', 'url(#arrowB)')
    prevBtn.appendChild(btnRect)
 
    prevBtn.addEventListener('click', () => onSelect(index - 1))
    svg.appendChild(prevBtn)
 
    const arrowB = document.createElementNS(svgNS, "image")
    arrowB.setAttribute("href", "./images/arrowB.png")
    arrowB.setAttribute("x", svgWidth - 500); arrowB.setAttribute("y", 5)
    arrowB.setAttribute("width", 200); arrowB.setAttribute("height", 120)
    arrowB.setAttribute('class', 'arrow')
    prevBtn.appendChild(arrowB)
  }
 
  panel.appendChild(svg)
 
  const titleWidth = title.getComputedTextLength()
 
  const highlight = document.createElementNS(svgNS, "line")
  highlight.setAttribute("x1", 35); highlight.setAttribute("y1", 52.5)
  highlight.setAttribute("x2", 40 + titleWidth); highlight.setAttribute("y2", 52.5)
  highlight.setAttribute("stroke", "#17aaff77"); highlight.setAttribute("stroke-width", 20)
  svg.insertBefore(highlight, title)
}
 
// ---------------------------------------------------------------------------
// buildTimelineSVG()
// Generates the proportional SVG timeline ruler from event data.
// Replicates the XSLT logic from timeline.xsl:
//   - x-spacer of 10 units per year
//   - tick marks every 5 / 10 / 50 / 100 years
//   - span rectangles from start to end date for each event
//   - group translated so negative (BC) coordinates are visible
// ---------------------------------------------------------------------------
function buildTimelineSVG(events, onSelect) {
  const xSpacer     = 10
  const svgHeight   = 260
  const rulerY      = 10
  const rulerHeight = 220
 
  const years = events.map(e => e.astronomicalYear)
  const earliestDate = Math.min(...years)
  const latestDate   = Math.max(...years)
  const padding    = 100
  const rulerWidth = (latestDate - earliestDate) * xSpacer + padding * 2
  const translateX = Math.abs(earliestDate) * xSpacer + 140
  const svgWidth   = rulerWidth + translateX + 100
 
  const svgNS = 'http://www.w3.org/2000/svg'
 
  const svg = document.createElementNS(svgNS, 'svg')
  svg.setAttribute('width', svgWidth)
  svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
  svg.style.display = 'block'
 
  const g = document.createElementNS(svgNS, 'g')
  const translateY = 10
  g.setAttribute('transform', `translate(${translateX}, ${translateY})`)
 
  // Background rectangle
  const rect = document.createElementNS(svgNS, 'rect')
  rect.setAttribute('width', rulerWidth)
  rect.setAttribute('height', rulerHeight)
  rect.setAttribute('x', earliestDate * xSpacer - padding)
  rect.setAttribute('y', rulerY)
  rect.setAttribute('rx', 20); rect.setAttribute('ry', 20)
  rect.setAttribute('fill', '#7edbcfa6')
  rect.setAttribute('stroke', '#5a8f82'); rect.setAttribute('stroke-width', '3')
  rect.style.filter = 'drop-shadow(3px 3px 5px rgba(102, 17, 2, 0.45))'
  g.appendChild(rect)
 
  // Tick marks — every 5 / 10 / 50 / 100 years
  for (let year = Math.ceil(earliestDate / 5) * 5; year <= latestDate; year += 5) {
    const x = year * xSpacer
    const isCentury     = year % 100 === 0
    const isHalfCentury = year % 50  === 0
    const isDecade      = year % 10  === 0
    const isHalfDecade  = year % 5   === 0
 
    if (isCentury) {
      const line = document.createElementNS(svgNS, 'line')
      line.setAttribute('x1', x); line.setAttribute('y1', rulerY)
      line.setAttribute('x2', x); line.setAttribute('y2', rulerY + 190)
      line.setAttribute('stroke', 'white'); line.setAttribute('stroke-width', 10)
      line.style.filter = 'drop-shadow(3px 3px 5px rgba(2, 102, 47, 0.25))'
      g.appendChild(line)
      const text = document.createElementNS(svgNS, 'text')
      text.setAttribute('x', x); text.setAttribute('y', rulerY + 210)
      text.setAttribute('fill', '#ffffff'); text.setAttribute('font-size', 18)
      text.setAttribute('style', 'font-weight: 900;'); text.setAttribute('text-anchor', 'middle')
      text.textContent = year
      g.appendChild(text)
    } else if (isHalfCentury) {
      const line = document.createElementNS(svgNS, 'line')
      line.setAttribute('x1', x); line.setAttribute('y1', rulerY)
      line.setAttribute('x2', x); line.setAttribute('y2', rulerY + 140)
      line.setAttribute('stroke', 'white'); line.setAttribute('stroke-width', 5)
      line.style.filter = 'drop-shadow(3px 3px 5px rgba(2, 102, 47, 0.25))'
      g.appendChild(line)
      const text = document.createElementNS(svgNS, 'text')
      text.setAttribute('x', x); text.setAttribute('y', rulerY + 157)
      text.setAttribute('fill', '#ffffff'); text.setAttribute('font-size', 15)
      text.setAttribute('style', 'font-weight: 700;'); text.setAttribute('text-anchor', 'middle')
      text.textContent = year
      g.appendChild(text)
    } else if (isDecade) {
      const line = document.createElementNS(svgNS, 'line')
      line.setAttribute('x1', x); line.setAttribute('y1', rulerY)
      line.setAttribute('x2', x); line.setAttribute('y2', rulerY + 90)
      line.setAttribute('stroke', 'white'); line.setAttribute('stroke-width', 2)
      line.style.filter = 'drop-shadow(3px 3px 5px rgba(2, 102, 47, 0.25))'
      g.appendChild(line)
      const text = document.createElementNS(svgNS, 'text')
      text.setAttribute('x', x); text.setAttribute('y', rulerY + 106)
      text.setAttribute('fill', '#ffffff'); text.setAttribute('font-size', 13)
      text.setAttribute('style', 'font-weight: 500;'); text.setAttribute('text-anchor', 'middle')
      text.textContent = year
      g.appendChild(text)
    } else if (isHalfDecade) {
      const line = document.createElementNS(svgNS, 'line')
      line.setAttribute('x1', x); line.setAttribute('y1', rulerY)
      line.setAttribute('x2', x); line.setAttribute('y2', rulerY + 50)
      line.setAttribute('stroke', 'white'); line.setAttribute('stroke-width', 1)
      line.style.filter = 'drop-shadow(3px 3px 5px rgba(2, 102, 47, 0.25))'
      g.appendChild(line)
    }
  }
 
  const hole = document.createElementNS(svgNS, 'circle')
  hole.setAttribute('cx', -600); hole.setAttribute('cy', 120); hole.setAttribute('r', 20)
  hole.setAttribute('fill', '#f1dbba')
  hole.setAttribute('stroke', '#5a8f82'); hole.setAttribute('stroke-width', '3')
  hole.style.filter = 'drop-shadow(3px 3px 5px #a7e0d9af)'
  g.appendChild(hole)
 
  // Event span rectangles — drawn from start to end date
  events.forEach((event, index) => {
    const startX = event.astronomicalYear * xSpacer
    const endX   = event.astronomicalYearEnd !== null
      ? event.astronomicalYearEnd * xSpacer
      : startX + 20
    const spanWidth = Math.max(endX - startX, 20)
 
    const y = parseInt(event.date.month) * 15 + 30
 
    const note = document.createElementNS(svgNS, 'rect')
    note.setAttribute('width', spanWidth)
    note.setAttribute('height', 50)
    note.setAttribute('x', startX)
    note.setAttribute('y', y)
    note.setAttribute('fill', '#6700a3a6')
    note.setAttribute('class', 'event-span')
    note.setAttribute('data-index', index)
    note.dataset.cx = startX
    note.style.cursor = 'pointer'
    note.addEventListener('click', () => onSelect(index))
    g.appendChild(note)
  })
 
  svg.appendChild(g)
  return { svg, translateX, xSpacer }
}
 
// ---------------------------------------------------------------------------
// selectEvent()
// Central selection handler — called by map markers, timeline spans, cards.
// Updates the card panel, pans the map, and scrolls the timeline ruler.
// ---------------------------------------------------------------------------
function selectEvent(index, events, map, svgInfo, onSelect) {
  const event = events[index]

  buildCard(event, index, events, onSelect)
  map.setView([event.lat, event.lon], 14)

  // Reset all spans to default colour
  document.querySelectorAll('.event-span').forEach(span => {
    span.setAttribute('fill', '#6700a3a6')
    span.setAttribute('stroke', '#4c0079d5')
  })

  // Highlight active span
  const activeSpan = document.querySelector(`.event-span[data-index="${index}"]`)
  if (activeSpan) {
    activeSpan.setAttribute('fill', '#ff0000c0')
    activeSpan.setAttribute('stroke', '#ff0000')

    // Scroll timeline ruler so active span is centred
    const spanCX = parseFloat(activeSpan.dataset.cx)
    const scrollTarget = (spanCX + svgInfo.translateX) - window.innerWidth / 2
    document.getElementById('timeline-ruler').scrollLeft = scrollTarget
  }
}
 
// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
const events = await parseEvents()
events.sort((a, b) => a.astronomicalYear - b.astronomicalYear)
 
const onSelect = (index) => selectEvent(index, events, map, svgInfo, onSelect)
 
const map = buildMap(events, onSelect)
 
const { svg, translateX, xSpacer } = buildTimelineSVG(events, onSelect)
const svgInfo = { translateX, xSpacer }
document.getElementById('timeline-ruler').appendChild(svg)
 
// Show the first event's card on load
selectEvent(0, events, map, svgInfo, onSelect)
 