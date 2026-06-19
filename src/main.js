import L from 'leaflet'

const map = L.map('map').setView([48.8566, 2.3522], 13)

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map)

L.marker([48.8566, 2.3522])
  .addTo(map)
  .bindPopup('Paris — a place in time.')
  .openPopup()