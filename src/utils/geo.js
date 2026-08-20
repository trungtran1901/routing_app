export function coordToLatLng([lng, lat]) {
  return { lat, lng }
}

export function coordsToPath(coordinates) {
  return (coordinates || []).map(coordToLatLng)
}

export function latLngToCoord(latLng) {
  const lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat
  const lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng
  return [lng, lat]
}

export function pathToCoords(path) {
  return (path || []).map(latLngToCoord)
}

export function pathToLineString(path) {
  return { type: 'LineString', coordinates: pathToCoords(path) }
}

export function cloneGeometry(geometry) {
  return geometry ? JSON.parse(JSON.stringify(geometry)) : null
}

export function boundsToBBox(bounds) {
  const sw = bounds.getSouthWest()
  const ne = bounds.getNorthEast()
  return {
    min_lng: sw.lng(),
    min_lat: sw.lat(),
    max_lng: ne.lng(),
    max_lat: ne.lat()
  }
}

export function bboxToBounds(googleMaps, bbox) {
  return new googleMaps.LatLngBounds(
    { lat: bbox.min_lat, lng: bbox.min_lng },
    { lat: bbox.max_lat, lng: bbox.max_lng }
  )
}

export function isValidLineString(geometry) {
  if (!geometry || geometry.type !== 'LineString') return false
  const coords = geometry.coordinates
  if (!Array.isArray(coords) || coords.length < 2) return false
  return coords.every(
    ([lng, lat]) =>
      typeof lng === 'number' && typeof lat === 'number' &&
      lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90
  )
}

export function formatLength(meters) {
  if (meters == null || Number.isNaN(meters)) return ''
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`
  }
  return `${Math.round(meters)} m`
}