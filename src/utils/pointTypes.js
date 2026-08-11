/**
 * Maps backend `point_type` (Vietnamese labels returned by GET /api/v1/map/points,
 * e.g. "Trạm", "Măng xông", "Khách hàng") to a normalized key + distinct icon
 * SVG + display metadata, so the map layer and the legend share one source
 * of truth instead of duplicating the mapping.
 */
export const POINT_TYPE_META = {
  station: {
    label: 'Trạm',
    color: '#f59e0b',
    size: 30,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
      <rect x="3" y="3" width="24" height="24" rx="6" fill="#f59e0b" stroke="#0f172a" stroke-width="2"/>
      <rect x="9" y="9" width="4" height="4" fill="#0f172a"/>
      <rect x="17" y="9" width="4" height="4" fill="#0f172a"/>
      <rect x="9" y="16" width="4" height="4" fill="#0f172a"/>
      <rect x="17" y="16" width="4" height="4" fill="#0f172a"/>
    </svg>`
  },
  closure: {
    label: 'Măng xông',
    color: '#3b82f6',
    size: 26,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
      <circle cx="13" cy="13" r="11" fill="#3b82f6" stroke="#0f172a" stroke-width="2"/>
      <circle cx="13" cy="13" r="3" fill="#ffffff"/>
      <line x1="13" y1="4" x2="13" y2="8" stroke="#ffffff" stroke-width="2"/>
      <line x1="13" y1="18" x2="13" y2="22" stroke="#ffffff" stroke-width="2"/>
      <line x1="4" y1="13" x2="8" y2="13" stroke="#ffffff" stroke-width="2"/>
      <line x1="18" y1="13" x2="22" y2="13" stroke="#ffffff" stroke-width="2"/>
    </svg>`
  },
  customer: {
    label: 'Khách hàng',
    color: '#94a3b8',
    size: 24,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#94a3b8" stroke="#0f172a" stroke-width="2"/>
      <circle cx="12" cy="9" r="3" fill="#0f172a"/>
      <path d="M6 18c0-3.3 2.7-5 6-5s6 1.7 6 5" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
    </svg>`
  },
  other: {
    label: 'Khác',
    color: '#60a5fa',
    size: 20,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8" fill="#60a5fa" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`
  }
}

// Reverse lookup: backend point_type label -> normalized key.
// Add new mappings here if the backend introduces more point_type values.
const LABEL_TO_KEY = {
  'Trạm': 'station',
  'Măng xông': 'closure',
  'Khách hàng': 'customer'
}

export function normalizePointType(pointType) {
  return LABEL_TO_KEY[pointType] || 'other'
}

export function pointTypeMeta(pointType) {
  return POINT_TYPE_META[normalizePointType(pointType)]
}

const iconCache = new Map()

/**
 * Builds (and caches) a google.maps.Icon for the given backend point_type.
 * Requires the Maps JS API to already be loaded (uses google.maps.Size/Point).
 */
export function buildPointIcon(googleMaps, pointType) {
  const key = normalizePointType(pointType)
  if (iconCache.has(key)) return iconCache.get(key)

  const meta = POINT_TYPE_META[key]
  const url = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(meta.svg)
  const icon = {
    url,
    scaledSize: new googleMaps.Size(meta.size, meta.size),
    anchor: new googleMaps.Point(meta.size / 2, meta.size / 2)
  }
  iconCache.set(key, icon)
  return icon
}
