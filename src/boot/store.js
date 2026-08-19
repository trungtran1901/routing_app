import { boot } from 'quasar/wrappers'
import store from '../store'
import { keycloakService } from './keycloak'

export default boot(async ({ app }) => {
  // Đăng ký store vào app Vue (để dùng useStore()/this.$store trong
  // chính routing app nếu cần sau này).
  app.use(store)

  // Expose ra window, cùng pattern với window.$keycloak — cho phép
  // code chạy trong ngữ cảnh remote (nếu có fallback tương ứng) đọc
  // được, thay vì phải dựa vào store nội bộ (rỗng) của remote khi
  // chạy standalone qua Module Federation.
  window.$store = store

  try {
    // keycloak boot chạy trước (xem quasar.config.js: boot: ['keycloak', 'store']),
    // nên tại đây keycloakService đã có token hợp lệ.
    await keycloakService.waitForAuthentication()
    await store.dispatch('getConfig')
  } catch (error) {
    console.error('[boot/store] Không bootstrap được config:', error)
    // Không throw — lỗi ở đây không nên chặn toàn bộ app khởi động,
    // chỉ ảnh hưởng tới các component phụ thuộc store.state.b (format).
  }
})