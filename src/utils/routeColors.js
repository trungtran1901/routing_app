/**
 * Assigns a distinct color to each `ma_tuyen` (route code) so segments from
 * different routes are visually distinguishable on the map.
 *
 * Colors are derived deterministically from the route code (hash -> HSL hue),
 * NOT re-randomized on every render — the same ma_tuyen always gets the same
 * color across pans/zooms/reloads. True per-render randomness would make the
 * map repaint arbitrarily on every viewport change, which is worse than a
 * small, unavoidable chance of two routes landing on similar-looking hues.
 */

const colorCache = new Map()

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0 // force 32-bit int
  }
  return hash
}

function hslToHex(h, s, l) {
  s /= 100
  l /= 100
  const k = n => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = x => Math.round(255 * x).toString(16).padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

/**
 * Returns a stable hex color for the given route code.
 * Google Maps Polyline strokeColor requires a plain hex/named CSS color
 * (HSL(A) strings are not reliably supported), so we convert to hex here.
 */
export function getRouteColor(maTuyen) {
  const key = maTuyen || '__unknown_route__'
  if (colorCache.has(key)) return colorCache.get(key)

  const hash = Math.abs(hashString(key))
  const hue = hash % 200
  const saturation = 65 + (hash % 20) // 65–85%, keeps colors vivid enough to read
  const lightness = 48 + (hash % 14) // 48–62%, avoids near-black/near-white on dark bg

  const color = hslToHex(hue, saturation, lightness)
  colorCache.set(key, color)
  return color
}

export function resetRouteColors() {
  colorCache.clear()
}
