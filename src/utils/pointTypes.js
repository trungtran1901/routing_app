export const POINT_TYPE_META = {
  station: {
    label: 'Trạm',
    color: '#f59e0b',
    size: 30,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
      <circle cx="15" cy="15" r="14" fill="#f59e0b" stroke="#0f172a" stroke-width="1.5"/>
      <path d="M15 6 L24 13.5 V24 H19 V17 H11 V24 H6 V13.5 Z"
            fill="#0f172a"/>
    </svg>`
  },
  closure: {
    label: 'Măng xông',
    color: '#3b82f6',
    size: 18,
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
    size: 16,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#94a3b8" stroke="#0f172a" stroke-width="2"/>
      <circle cx="12" cy="9" r="3" fill="#0f172a"/>
      <path d="M6 18c0-3.3 2.7-5 6-5s6 1.7 6 5" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
    </svg>`
  },
  underground: {
    label: 'Chuyển tiếp',
    color: '#a16207',
    size: 18,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
      <circle cx="13" cy="13" r="11" fill="#a16207" stroke="#0f172a" stroke-width="2"/>
      <ellipse cx="13" cy="10" rx="6" ry="2.4" fill="none" stroke="#fde68a" stroke-width="1.6"/>
      <path d="M13 9 V19 M9.5 15.5 L13 19 L16.5 15.5"
            fill="none" stroke="#fde68a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  },
  cabinet: {
    label: 'Tủ phối',
    color: '#0ea5e9',
    size: 18,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
      <circle cx="13" cy="13" r="11" fill="#0ea5e9" stroke="#0f172a" stroke-width="2"/>
      <rect x="8" y="6" width="10" height="14" rx="1.4" fill="none" stroke="#ffffff" stroke-width="1.8"/>
      <line x1="8" y1="12.5" x2="18" y2="12.5" stroke="#ffffff" stroke-width="1.6"/>
      <circle cx="10.3" cy="9" r="0.9" fill="#ffffff"/>
      <circle cx="10.3" cy="15.5" r="0.9" fill="#ffffff"/>
    </svg>`
  },
  collection: {
    label: 'Tập điểm',
    color: '#22c55e',
    size: 18,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
      <circle cx="13" cy="13" r="11" fill="#22c55e" stroke="#0f172a" stroke-width="2"/>
      <circle cx="13" cy="8.5" r="1.9" fill="#ffffff"/>
      <circle cx="8.2" cy="16.5" r="1.9" fill="#ffffff"/>
      <circle cx="17.8" cy="16.5" r="1.9" fill="#ffffff"/>
      <line x1="13" y1="10.4" x2="9.5" y2="14.8" stroke="#ffffff" stroke-width="1.4"/>
      <line x1="13" y1="10.4" x2="16.5" y2="14.8" stroke="#ffffff" stroke-width="1.4"/>
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

const LABEL_TO_KEY = {
  'Trạm': 'station',
  'Măng xông': 'closure',
  'Khách hàng': 'customer',
  'Chuyển tiếp': 'underground',
  'Hạ ngầm': 'underground',
  'Tủ phối': 'cabinet',
  'Tập điểm': 'collection'
}

export function normalizePointType(pointType) {
  return LABEL_TO_KEY[pointType] || 'other'
}

export function pointTypeMeta(pointType) {
  return POINT_TYPE_META[normalizePointType(pointType)]
}


const iconCache = new Map()

export function buildPointIcon(googleMaps, pointType) {
  const key = normalizePointType(pointType)
  if (iconCache.has(key)) return iconCache.get(key)

  const meta = POINT_TYPE_META[key]
  const url = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(meta.svg)
  const icon = {
    url,
    scaledSize: new googleMaps.Size(meta.size, meta.size),
    anchor: new googleMaps.Point(meta.size / 2, meta.size / 2),
    labelOrigin: new googleMaps.Point(meta.size + 42, meta.size / 2)
  }
  iconCache.set(key, icon)
  return icon
}