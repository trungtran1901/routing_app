// ── Cấu hình icon cho từng loại điểm ──
// 5 loại (Tủ phối, Măng xông, Tập điểm, Khách hàng, Trạm) dùng kiểu "huy hiệu" theo ảnh mẫu:
//   viền ngoài màu đậm  →  khoảng trắng  →  hình khối đặc màu tươi bên trong.
// ODF dùng icon riêng (khối vuông + lưới ô trắng + dấu cộng ở góc).
// 2 loại còn lại (Chuyển tiếp, Khác) giữ nguyên kiểu cũ nhưng đã tăng size để cân với huy hiệu.
//
// kind (hình dáng huy hiệu):
//   triangle     = tam giác hướng lên   (Tủ phối)
//   ring         = vòng tròn + chấm     (Măng xông)
//   triangleDown = tam giác hướng xuống (Tập điểm)
//   pin          = ghim bản đồ          (Khách hàng) – neo tại mũi ghim
//   house        = ngôi nhà             (Trạm)
const LETTER_ICONS = {
  cabinet:     { badge: true, kind: 'triangle',     outline: '#14307a', color: '#2f80ff', size: 15 },
  closure:     { badge: true, kind: 'ring',         outline: '#0b6a78', color: '#00e0ff', size: 15 },
  collection:  { badge: true, kind: 'triangleDown', outline: '#136b36', color: '#1fe07f', size: 15 },
  customer:    { badge: true, kind: 'pin',          outline: '#6b3a0a', color: '#ff9500', size: 15 },
  station:     { badge: true, kind: 'house',        outline: '#7a0c25', color: '#ff1f4d', size: 30 },
  odf:         { custom: 'odf', color: '#f04e1e', size: 15 }, // ODF (cùng size với Măng xông)
  underground: { color: '#f97316', size: 16, shape: 'diamond', icon: 'swap' }, // Chuyển tiếp (tăng size 8 → 16)
  other:       { color: '#60a5fa', size: 9,  shape: 'circle',  icon: 'none' }  // Khác (tăng size 5 → 9)
}

const LABELS = {
  station: 'Trạm',
  closure: 'Măng xông',
  customer: 'Khách hàng',
  underground: 'Chuyển tiếp',
  cabinet: 'Tủ phối',
  collection: 'Tập điểm',
  odf: 'ODF',
  other: 'Khác'
}

// ───────────── Hình khối kiểu huy hiệu (viền - trắng - lõi màu) ─────────────
const f = n => Math.round(n * 100) / 100

// Trả về phần tử SVG của 1 hình theo kind, bán kính r quanh tâm (cx, cy).
// `attrs` là chuỗi thuộc tính (fill, stroke...) gắn vào phần tử.
function badgeShape(kind, cx, cy, r, attrs) {
  const poly = pts => `<polygon points="${pts.map(p => `${f(p[0])},${f(p[1])}`).join(' ')}" ${attrs}/>`
  switch (kind) {
    case 'triangle':
      return poly([[cx, cy - r * 0.95], [cx + r, cy + r * 0.8], [cx - r, cy + r * 0.8]])
    case 'triangleDown':
      return poly([[cx - r, cy - r * 0.8], [cx + r, cy - r * 0.8], [cx, cy + r * 0.95]])
    case 'house':
      return poly([
        [cx, cy - r * 0.98],
        [cx + r * 0.92, cy - r * 0.1],
        [cx + r * 0.92, cy + r * 0.92],
        [cx - r * 0.92, cy + r * 0.92],
        [cx - r * 0.92, cy - r * 0.1]
      ])
    case 'pin': {
      // Ghim giọt nước: đầu tròn phía trên, mũi nhọn chạm đáy (cy + r)
      const R = r * 0.72
      const oy = cy - r * 0.25 // tâm phần đầu tròn
      return `<path d="M ${f(cx)} ${f(cy + r)}
        C ${f(cx - R * 0.35)} ${f(cy + r * 0.55)} ${f(cx - R)} ${f(cy + r * 0.05)} ${f(cx - R)} ${f(oy)}
        A ${f(R)} ${f(R)} 0 1 1 ${f(cx + R)} ${f(oy)}
        C ${f(cx + R)} ${f(cy + r * 0.05)} ${f(cx + R * 0.35)} ${f(cy + r * 0.55)} ${f(cx)} ${f(cy + r)} Z" ${attrs}/>`
    }
    case 'ring':
    default:
      return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.95)}" ${attrs}/>`
  }
}

function badgeSvg(cfg, w, h, filterId) {
  const cx = w / 2
  const cy = h / 2
  const sw = w * 0.07 // độ dày nét viền ngoài
  const r = w / 2 - sw * 1.4

  // 1) Viền ngoài màu đậm, nền trắng bên trong
  const outer = badgeShape(
    cfg.kind, cx, cy, r,
    `fill="#ffffff" stroke="${cfg.outline}" stroke-width="${f(sw)}" stroke-linejoin="round" filter="url(#${filterId})"`
  )
  // 2) Lõi màu tươi (nhỏ hơn, bo tròn góc nhờ stroke cùng màu)
  const inner = badgeShape(
    cfg.kind, cx, cy, r * 0.56,
    `fill="${cfg.color}" stroke="${cfg.color}" stroke-width="${f(sw * 0.8)}" stroke-linejoin="round"`
  )
  return outer + inner
}

// ───────────── Icon ODF: khối vuông + lưới ô trắng + dấu cộng ở góc ─────────────
function odfSvg(cfg, w, h, filterId) {
  const c = cfg.color
  // Vẽ trên hệ toạ độ 100x100 rồi scale theo size
  const cells = []
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      cells.push(
        `<rect x="${12 + col * 17}" y="${34.5 + row * 17}" width="11" height="11" rx="1.5" fill="#ffffff"/>`
      )
    }
  }
  return `
    <g filter="url(#${filterId})">
      <g transform="scale(${f(w / 100)})">
        <rect x="4" y="18" width="78" height="78" rx="9" fill="${c}"/>
        ${cells.join('')}
        <circle cx="78" cy="22" r="21" fill="#ffffff"/>
        <circle cx="78" cy="22" r="16" fill="#ffffff" stroke="${c}" stroke-width="5"/>
        <path d="M 70 22 H 86 M 78 14 V 30" stroke="${c}" stroke-width="5" stroke-linecap="round" fill="none"/>
      </g>
    </g>`
}

// ───────────── Hình cũ cho Chuyển tiếp / Khác ─────────────
function polygonPoints(cx, cy, r, sides, rotateDeg) {
  const rot = (rotateDeg * Math.PI) / 180
  const pts = []
  for (let i = 0; i < sides; i++) {
    const a = rot + (i * 2 * Math.PI) / sides
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
  }
  return pts
}

function pointsToPath(pts) {
  return 'M ' + pts.map(p => p.map(f).join(',')).join(' L ') + ' Z'
}

function bgShapeSvg(shape, cx, cy, r, color, filterId) {
  const sw = f(r * 0.16)
  const stroke = `stroke="#cbd5e1" stroke-width="${sw}"`
  if (shape === 'diamond') {
    // Hình thoi dùng gần hết bán kính (đỉnh chạm sát mép canvas, đã chừa nửa nét viền
    // để không bị cắt). Đường chéo ≈ 2r nên nhìn cân với các huy hiệu.
    return `<path d="${pointsToPath(polygonPoints(cx, cy, r, 4, 0))}"
      fill="${color}" ${stroke} stroke-linejoin="round" filter="url(#${filterId})"/>`
  }
  return `<circle cx="${cx}" cy="${cy}" r="${f(r * 0.92)}" fill="${color}" ${stroke} filter="url(#${filterId})"/>`
}

function iconSvg(icon, cx, cy, r) {
  const s = r * 0.95
  if (icon !== 'swap') return ''
  // Mũi tên đảo chiều 2 hàng (Chuyển tiếp)
  const w = s * 0.72
  const yTop = cy - s * 0.28
  const yBot = cy + s * 0.28
  const sw = f(s * 0.16)
  const line = 'fill="none" stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round"'
  return `
    <path d="M ${f(cx - w)} ${f(yTop)} L ${f(cx + w)} ${f(yTop)}" ${line} stroke-width="${sw}"/>
    <path d="M ${f(cx + w * 0.35)} ${f(yTop - s * 0.32)} L ${f(cx + w)} ${f(yTop)} L ${f(cx + w * 0.35)} ${f(yTop + s * 0.32)}" ${line} stroke-width="${sw}"/>
    <path d="M ${f(cx + w)} ${f(yBot)} L ${f(cx - w)} ${f(yBot)}" ${line} stroke-width="${sw}"/>
    <path d="M ${f(cx - w * 0.35)} ${f(yBot - s * 0.32)} L ${f(cx - w)} ${f(yBot)} L ${f(cx - w * 0.35)} ${f(yBot + s * 0.32)}" ${line} stroke-width="${sw}"/>
  `
}

// ───────────── Sinh SVG hoàn chỉnh ─────────────
function buildSvg(cfg) {
  const w = cfg.size
  const h = cfg.size
  const filterId = `shadow-${cfg.color.replace('#', '')}`
  const defs = `<defs>
      <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="0.5" stdDeviation="0.5" flood-color="#000000" flood-opacity="0.35"/>
      </filter>
    </defs>`

  let body
  if (cfg.custom === 'odf') {
    body = odfSvg(cfg, w, h, filterId)
  } else if (cfg.badge) {
    body = badgeSvg(cfg, w, h, filterId)
  } else {
    const cx = w / 2
    const cy = h / 2
    const r = w / 2 - 1 // trước: - 1.5 (giảm lề để hình lấp đầy canvas hơn)
    body = bgShapeSvg(cfg.shape, cx, cy, r, cfg.color, filterId) + iconSvg(cfg.icon, cx, cy, r)
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      ${defs}
      ${body}
    </svg>`
}

export const POINT_TYPE_META = Object.fromEntries(
  Object.entries(LETTER_ICONS).map(([key, cfg]) => [
    key,
    {
      label: LABELS[key],
      // Chỉ hiển thị label cạnh marker cho loại "Trạm"
      showLabel: key === 'station',
      color: cfg.color,
      size: cfg.size,
      kind: cfg.kind || cfg.shape || cfg.custom,
      // Ghim (Khách hàng) neo tại mũi nhọn, các loại khác neo tại tâm
      anchorBottom: cfg.kind === 'pin',
      svg: buildSvg(cfg)
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
  'Tập điểm': 'collection',
  'ODF': 'odf'
}

export function normalizePointType(pointType) {
  return LABEL_TO_KEY[pointType] || 'other'
}

export function pointTypeMeta(pointType) {
  return POINT_TYPE_META[normalizePointType(pointType)]
}

export function shouldShowLabel(pointType) {
  return normalizePointType(pointType) === 'station'
}

const iconCache = new Map()

export function buildPointIcon(googleMaps, pointType) {
  const key = normalizePointType(pointType)
  if (iconCache.has(key)) return iconCache.get(key)

  const meta = POINT_TYPE_META[key]
  const url = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(meta.svg)
  const w = meta.size
  const h = meta.size
  // Ghim: neo ở mũi nhọn (đáy hình); các loại khác: neo ở tâm
  const anchorY = meta.anchorBottom ? h * 0.93 : h / 2
  const icon = {
    url,
    scaledSize: new googleMaps.Size(w, h),
    anchor: new googleMaps.Point(w / 2, anchorY),
    labelOrigin: new googleMaps.Point(w + 40, h / 2)
  }
  iconCache.set(key, icon)
  return icon
}