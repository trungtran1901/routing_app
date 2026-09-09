// ── Cấu hình icon dạng pin + hình khối riêng cho từng loại điểm ──
// Mỗi loại điểm có: chữ viết tắt, màu, kích thước, và HÌNH DẠNG khối bên trong
// (tròn / vuông / tam giác / kim cương / lục giác / ngôi sao...) để phân biệt
// nhanh bằng mắt kể cả khi thu nhỏ, không chỉ dựa vào chữ cái.
const LETTER_ICONS = {
  station:     { letter: 'T',  color: '#f59e0b', size: 30, shape: 'circle'   },
  closure:     { letter: 'MX', color: '#3b82f6', size: 28, shape: 'square'   },
  customer:    { letter: 'KH', color: '#94a3b8', size: 28, shape: 'triangle' },
  underground: { letter: 'CT', color: '#a16207', size: 28, shape: 'diamond'  },
  cabinet:     { letter: 'TP', color: '#8b5cf6', size: 28, shape: 'hexagon'  }, // đổi màu (tím) so với măng xông
  collection:  { letter: 'TĐ', color: '#22c55e', size: 28, shape: 'star'     },
  other:       { letter: '',   color: '#60a5fa', size: 22, shape: 'circle'   }
}

const LABELS = {
  station: 'Trạm',
  closure: 'Măng xông',
  customer: 'Khách hàng',
  underground: 'Chuyển tiếp',
  cabinet: 'Tủ phối',
  collection: 'Tập điểm',
  other: 'Khác'
}

// ── Tạo path SVG cho từng hình dạng, tất cả được vẽ vừa khít trong
// một hình tròn bán kính r quanh tâm (cx, cy) để dễ căn giữa trong đầu pin.
function polygonPoints(cx, cy, r, sides, rotateDeg) {
  const rot = (rotateDeg * Math.PI) / 180
  const pts = []
  for (let i = 0; i < sides; i++) {
    const a = rot + (i * 2 * Math.PI) / sides
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
  }
  return pts
}

function starPoints(cx, cy, rOuter, rInner, spikes, rotateDeg) {
  const rot = (rotateDeg * Math.PI) / 180
  const pts = []
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner
    const a = rot + (i * Math.PI) / spikes
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
  }
  return pts
}

function pointsToPath(pts) {
  return 'M ' + pts.map(p => p.join(',')).join(' L ') + ' Z'
}

function shapePath(shape, cx, cy, r) {
  switch (shape) {
    case 'square':
      // hình vuông xoay 45° để các cạnh nằm ngang/dọc, kích thước quy đổi để vừa vòng tròn bán kính r
      return pointsToPath(polygonPoints(cx, cy, r, 4, -45))
    case 'triangle':
      return pointsToPath(polygonPoints(cx, cy, r * 1.12, 3, -90))
    case 'diamond':
      return pointsToPath(polygonPoints(cx, cy, r, 4, 0))
    case 'hexagon':
      return pointsToPath(polygonPoints(cx, cy, r, 6, -90))
    case 'pentagon':
      return pointsToPath(polygonPoints(cx, cy, r, 5, -90))
    case 'star':
      return pointsToPath(starPoints(cx, cy, r * 1.15, r * 0.48, 5, -90))
    case 'circle':
    default:
      return null // dùng thẻ <circle> riêng cho mượt hơn path
  }
}

// Sinh SVG: CHỈ hình khối (không còn khung "pin giọt nước" bao ngoài),
// tô màu theo loại điểm, chữ viết tắt màu trắng nằm giữa.
function buildLetterSvg(letter, color, size, shape = 'circle') {
  const w = size
  const h = size
  const cx = w / 2
  const cy = h / 2
  const r = w / 2 - 1.5           // bán kính khối, chừa lề cho viền + đổ bóng
  const fontSize = Math.round(r * (letter.length > 1 ? 0.9 : 1.15))

  const text = letter
    ? `<text x="${cx}" y="${cy + fontSize * 0.02}" text-anchor="middle" dominant-baseline="central"
        font-family="system-ui,sans-serif" font-weight="300"
        font-size="${fontSize}" fill="#ffffff">${letter}</text>`
    : ''

  const filterId = `shadow-${color.replace('#', '')}`

  const shapeD = shapePath(shape, cx, cy, r)
  const shapeSvg = shapeD
    ? `<path d="${shapeD}" fill="${color}" stroke="#0f172a" stroke-width="1" filter="url(#${filterId})"/>`
    : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="#0f172a" stroke-width="1" filter="url(#${filterId})"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0.5" stdDeviation="0.5" flood-color="#000000" flood-opacity="0.35"/>
        </filter>
      </defs>
      ${shapeSvg}
      ${text}
    </svg>`
}

export const POINT_TYPE_META = Object.fromEntries(
  Object.entries(LETTER_ICONS).map(([key, cfg]) => [
    key,
    {
      label: LABELS[key],
      color: cfg.color,
      size: cfg.size,
      shape: cfg.shape,
      svg: buildLetterSvg(cfg.letter, cfg.color, cfg.size, cfg.shape)
    }
  ])
)

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
  const w = meta.size
  const h = meta.size
  const icon = {
    url,
    scaledSize: new googleMaps.Size(w, h),
    anchor: new googleMaps.Point(w / 2, h / 2), // neo tại tâm hình khối
    labelOrigin: new googleMaps.Point(w + 40, h / 2)
  }
  iconCache.set(key, icon)
  return icon
}