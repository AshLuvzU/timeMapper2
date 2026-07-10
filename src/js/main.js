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
      title:            getChild(node, 'title')?.textContent.trim(),
      date:             parsedDate,
      astronomicalYear: toAstronomicalYear(parsedDate),
      displayDate:      formatDate(parsedDate),
      description:      getChild(node, 'description')?.textContent.trim(),
      lat:              parseFloat(getChild(node, 'lat')?.textContent),
      lon:              parseFloat(getChild(node, 'lon')?.textContent),
      media:            getChild(node, 'media')?.textContent.trim() ?? null,
    }
  })
}

// ---------------------------------------------------------------------------
// buildMap()
// Initialises a Leaflet map and adds one marker per event.
// Clicking a marker triggers full event selection.
// Preserves your custom pin icon and popup style.
// ---------------------------------------------------------------------------
function buildMap(events, onSelect) {
  const map = L.map('map').setView([48.8566, 2.3522], 4)

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map)

  var pinIcon = L.icon({
    iconUrl: './images/pin.png',
    iconSize:   [50, 60],
    iconAnchor: [25, 60],
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
// Renders the detail card panel for the currently selected event.
// ---------------------------------------------------------------------------
function buildCard(event) {
  const panel = document.getElementById('card-panel')
  panel.innerHTML = `
    <div class="card-date">${event.displayDate}</div>
    <div class="card-title">${event.title}</div>
    <div class="card-desc">${event.description}</div>
    ${event.media ? `<img class="card-media" src="${event.media}" alt="${event.title}" />` : ''}
  `
}

// ---------------------------------------------------------------------------
// buildTimelineSVG()
// Generates the proportional SVG timeline ruler from event data.
// Replicates the XSLT logic from timeline.xsl:
//   - x-spacer of 10 units per year
//   - tick marks every 10 years (short), 50 years (medium), 100 years (tall)
//   - red circles for each event, positioned by astronomicalYear
//   - group translated so negative (BC) coordinates are visible
// ---------------------------------------------------------------------------
function buildTimelineSVG(events, onSelect) {
  const xSpacer    = 10
  const svgHeight  = 260
  const rulerY     = 10
  const rulerHeight = 220

  const years = events.map(e => e.astronomicalYear)
  const earliestDate = Math.min(...years)
  const latestDate   = Math.max(...years)
  const padding    = 100  // extra units on each side — adjust to taste
  const rulerWidth = (latestDate - earliestDate) * xSpacer + padding * 2
  const translateX   = Math.abs(earliestDate) * xSpacer + 140
  const svgWidth     = rulerWidth + translateX + 100

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
  rect.setAttribute('rx', 20)
  rect.setAttribute('ry', 20)
  rect.setAttribute('fill', '#7edbcfa6')
  rect.setAttribute('stroke', '#5a8f82')
  rect.setAttribute('stroke-width', '3')
  rect.style.filter = 'drop-shadow(3px 3px 5px rgba(102, 17, 2, 0.45))'
  g.appendChild(rect)

  // Tick marks — every 10 / 50 / 100 years
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
      text.setAttribute('fill', '#ffffff'); text.setAttribute('font-size', 18); text.setAttribute('style', 'font-weight: 900;')
      text.setAttribute('text-anchor', 'middle')
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
      text.setAttribute('fill', '#ffffff'); text.setAttribute('font-size', 15); text.setAttribute('style', 'font-weight: 700;')
      text.setAttribute('text-anchor', 'middle')
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
      text.setAttribute('fill', '#ffffff'); text.setAttribute('font-size', 13); text.setAttribute('style', 'font-weight: 500;')
      text.setAttribute('text-anchor', 'middle')
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
  hole.setAttribute('cx', -600)
  hole.setAttribute('cy', 120)
  hole.setAttribute('r', 20)
  hole.setAttribute('fill', '#f1dbba')
  hole.setAttribute('stroke', '#5a8f82')
  hole.setAttribute('stroke-width', '3')
  hole.style.filter = 'drop-shadow(3px 3px 5px #a7e0d9af)'
  g.appendChild(hole)

  // Event dots — drawn last so they appear on top of tick marks
 events.forEach((event, index) => {
  const cx = event.astronomicalYear * xSpacer
  const cy = parseInt(event.date.month) * 15 + 30

  const face = document.createElementNS(svgNS, 'g')
  face.setAttribute('class', 'event-dot')
  face.setAttribute('data-index', index)
  face.style.cursor = 'pointer'

  // Head
  const head = document.createElementNS(svgNS, 'circle')
  head.setAttribute('class', 'face-head')
  head.setAttribute('cx', cx)
  head.setAttribute('cy', cy)
  head.setAttribute('r', 30)
  head.setAttribute('fill', '#FFD54A')
  head.setAttribute('stroke', '#f5f5f5')
  head.setAttribute('stroke-width', '2')
  head.style.filter = 'drop-shadow(3px 3px 5px rgba(2, 102, 77, 0.47))'
  face.appendChild(head)

  // Left eye
  const leftEye = document.createElementNS(svgNS, 'circle')
  leftEye.setAttribute('cx', cx - 6)
  leftEye.setAttribute('cy', cy - 5)
  leftEye.setAttribute('r', 2)
  leftEye.setAttribute('fill', '#222')
  face.appendChild(leftEye)

  // Right eye
  const rightEye = document.createElementNS(svgNS, 'circle')
  rightEye.setAttribute('cx', cx + 6)
  rightEye.setAttribute('cy', cy - 5)
  rightEye.setAttribute('r', 2)
  rightEye.setAttribute('fill', '#222')
  face.appendChild(rightEye)

  // Smile
  const smile = document.createElementNS(svgNS, 'path')
  smile.setAttribute(
    'd',
    `M ${cx - 8} ${cy + 2} Q ${cx} ${cy + 10} ${cx + 8} ${cy + 2}`
  )
  smile.setAttribute('fill', 'none')
  smile.setAttribute('stroke', '#222')
  smile.setAttribute('stroke-width', '2')
  smile.setAttribute('stroke-linecap', 'round')
  face.appendChild(smile)

  // Angry
  const angryV = document.createElementNS(svgNS, 'path')
  angryV.setAttribute(
  'd',
  `M ${cx - 4} ${cy - 9} L ${cx} ${cy - 5} L ${cx + 4} ${cy - 9}`
)
  angryV.setAttribute('fill', 'none')
  angryV.setAttribute('stroke', '#222')
  angryV.setAttribute('stroke-width', '2')
  angryV.setAttribute('class', 'face-v')
  angryV.style.display = 'none'
  face.appendChild(angryV)

  face.dataset.cx = cx
  
  face.addEventListener('click', () => onSelect(index))

  g.appendChild(face)
})

  svg.appendChild(g)
  return { svg, translateX, xSpacer }
}

// ---------------------------------------------------------------------------
// selectEvent()
// Central selection handler — called by map markers, timeline dots.
// Updates the card panel, highlights the active dot, pans the map,
// and scrolls the timeline ruler to centre the active dot.
// ---------------------------------------------------------------------------
function selectEvent(index, events, map, svgInfo) {
  const event = events[index]

  buildCard(event)
  map.setView([event.lat, event.lon], 14)

  // Reset all faces to happy yellow
  document.querySelectorAll('.event-dot').forEach(dot => {
    dot.querySelector('.face-head').setAttribute('fill', '#FFD54A')
    dot.querySelector('.face-v').style.display = 'none'
  })

  // Set active face to angry red
  const activeDot = document.querySelector(`.event-dot[data-index="${index}"]`)
  if (activeDot) {
    activeDot.querySelector('.face-head').setAttribute('fill', '#ff0000')
    activeDot.querySelector('.face-v').style.display = 'block'

    // Scroll timeline ruler so active face is centred
    const dotCX = parseFloat(activeDot.dataset.cx)
    const scrollTarget = (dotCX + svgInfo.translateX) - window.innerWidth / 2
    document.getElementById('timeline-ruler').scrollLeft = scrollTarget
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
const events = await parseEvents()
events.sort((a, b) => a.astronomicalYear - b.astronomicalYear)

const onSelect = (index) => selectEvent(index, events, map, svgInfo)

const map = buildMap(events, onSelect)

const { svg, translateX, xSpacer } = buildTimelineSVG(events, onSelect)
const svgInfo = { translateX, xSpacer }
document.getElementById('timeline-ruler').appendChild(svg)

// Show the first event's card on load
selectEvent(0, events, map, svgInfo)