import { ref, onMounted, onBeforeUnmount } from 'vue'

// ── Hệ số scale giao diện dùng chung (thanh tìm kiếm, thanh công cụ...) ──
// Kích thước thiết kế gốc (hệ số = 1) ứng với vùng hiển thị 1920 x 1080 CSS px.
// Màn hình có vùng hiển thị nhỏ hơn (độ phân giải thấp, hoặc scale Windows 125% / 150%...)
// sẽ được thu nhỏ tương ứng; màn hình lớn hơn giữ tối đa 1 (không phóng to).
const BASE_WIDTH = 1920
const BASE_HEIGHT = 1080
const MIN_SCALE = 0.55
const MAX_SCALE = 1
const MOBILE_BREAKPOINT = 768 // ≤ ngưỡng này giữ nguyên 1 vì đã có layout responsive riêng

// Dùng chung một ref + một listener cho mọi component
const uiScale = ref(1)
let users = 0

function compute() {
    const w = window.innerWidth
    const h = window.innerHeight
    if (w <= MOBILE_BREAKPOINT) {
        uiScale.value = 1
        return
    }
    const raw = Math.min(w / BASE_WIDTH, h / BASE_HEIGHT)
    uiScale.value = Math.round(Math.max(MIN_SCALE, Math.min(MAX_SCALE, raw)) * 100) / 100
}

export function useUiScale() {
    onMounted(() => {
        if (users++ === 0) window.addEventListener('resize', compute)
        compute()
    })
    onBeforeUnmount(() => {
        if (--users === 0) window.removeEventListener('resize', compute)
    })
    return { uiScale }
}