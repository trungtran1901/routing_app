import { ref } from 'vue'
import { fetchRouteInfo } from '../services/routeInfoApi'

const DEFAULT_COLOR = '#64748b'

const colorCache = new Map()      // parentId -> hex color (đã resolve xong)
const pendingFetches = new Map()  // parentId -> Promise đang chạy

// Đếm số lần cache có thay đổi — các `computed` phụ thuộc vào ref này
// (đọc .value) sẽ tự động re-run mỗi khi có màu thật mới được resolve,
// dù bản thân colorCache là Map thường (không reactive).
export const routeColorVersion = ref(0)

// ---- fallback hash-based (dùng khi chưa có parent_id) ----
const legacyCache = new Map()
function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return hash
}
function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const k = n => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = x => Math.round(255 * x).toString(16).padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}
export function getRouteColor(maTuyen) {
  const key = maTuyen || '__unknown_route__'
  if (legacyCache.has(key)) return legacyCache.get(key)
  const hash = Math.abs(hashString(key))
  const color = hslToHex(hash % 200, 65 + (hash % 20), 48 + (hash % 14))
  legacyCache.set(key, color)
  return color
}

export function getRouteColorByParentId(parentId, fallbackKey) {
  if (parentId && colorCache.has(parentId)) return colorCache.get(parentId)
  return getRouteColor(fallbackKey || parentId)
}

export function hasRouteColorCached(parentId) {
  return !!parentId && colorCache.has(parentId)
}

export function ensureRouteColorByParentId(parentId) {
  if (!parentId) return Promise.resolve(DEFAULT_COLOR)
  if (colorCache.has(parentId)) return Promise.resolve(colorCache.get(parentId))
  if (pendingFetches.has(parentId)) return pendingFetches.get(parentId)

  const promise = fetchRouteInfo(parentId)
    .then(res => {
      const color = res?.data?.data?.phan_loai?.option?.mau_chu || DEFAULT_COLOR
      colorCache.set(parentId, color)
      routeColorVersion.value++ // báo cho các computed biết có màu mới
      return color
    })
    .catch(() => {
      colorCache.set(parentId, DEFAULT_COLOR)
      routeColorVersion.value++
      return DEFAULT_COLOR
    })
    .finally(() => pendingFetches.delete(parentId))

  pendingFetches.set(parentId, promise)
  return promise
}

export function resetRouteColors() {
  colorCache.clear()
  pendingFetches.clear()
  legacyCache.clear()
  routeColorVersion.value++
}