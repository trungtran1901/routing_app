/**
 * GeoJSON <-> Google Maps LatLng helpers.
 * GeoJSON coordinate order is ALWAYS [lng, lat] (per README_GIS.md).
 * Google Maps LatLng literal order is ALWAYS {lat, lng}.
 * Never swap this — it's the #1 source of "geometry drawn in the ocean" bugs.
 */

export function coordToLatLng([lng, lat]) {
  return { lat, lng }
}

export function coordsToPath(coordinates) {
  return (coordinates || []).map(coordToLatLng)
}

export function latLngToCoord(latLng) {
  // Accepts a google.maps.LatLng instance or a {lat,lng} literal
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

/**
 * Converts a server-provided bbox ({min_lng, min_lat, max_lng, max_lat})
 * into a google.maps.LatLngBounds instance, so callers can fitBounds()
 * into a cluster's coverage area without manually constructing LatLngs.
 */
export function bboxToBounds(googleMaps, bbox) {
  return new googleMaps.LatLngBounds(
    { lat: bbox.min_lat, lng: bbox.min_lng },
    { lat: bbox.max_lat, lng: bbox.max_lng }
  )
}

/**
 * Mirrors the backend's own validation rules (README_GIS.md §6) so the
 * frontend can give instant feedback — the backend remains authoritative.
 */
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