import axios from 'axios'
import { keycloakService } from '../boot/keycloak'

// Base URL của hệ thống quản lý app/config (moadminapi) — KHÁC với
// VITE_API_BASE_URL đang dùng cho routingAPI (services/data.js), vì
// đây là backend riêng cho menu/app/config, không phải backend routing.
const BASE_ADMIN_API_URL = import.meta.env.VITE_ADMIN_API_BASE_URL || 'https://api.hitc.vn/moadminapi/'

function getToken() {
  try {
    const token = keycloakService?.getToken()
    if (token) {
      console.log('Sử dụng token từ keycloakService')
      return token
    }
    console.warn('keycloakService.getToken() trả về null hoặc không hợp lệ')
  } catch (error) {
    console.error('Lỗi khi gọi keycloakService.getToken():', error)
  }

  const fallbackToken = window.$keycloak?.token
  if (fallbackToken) {
    console.log('Sử dụng token từ window.$keycloak')
    return fallbackToken
  }

  console.error('Không thể lấy token từ cả keycloakService và window.$keycloak')
  return null
}

function getAppId() {
  const fromQuery = new URLSearchParams(window.location.search).get('appid')
  if (fromQuery) return fromQuery
  return window.appid || null
}

const menuApi = {
  /**
   * Lấy config mặc định của hệ thống (format ngày tháng, số, v.v.)
   * Đây là API chính cần cho việc bootstrap store.state.b, dùng bởi
   * các component remote (vd MenuAddRightDrawerProV1.vue) để format
   * Date/DateTime/Number.
   */
  getConfig() {
    const client = axios.create({
      baseURL: BASE_ADMIN_API_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    return client.get('config/app-default-config')
  },

  getMenu(appId) {
    const client = axios.create({
      baseURL: BASE_ADMIN_API_URL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + getToken(),
        appid: appId || getAppId()
      }
    })
    return client.get('app/danh-sach-menu-duoc-phan-quyen')
  },

  getApp() {
    const client = axios.create({
      baseURL: BASE_ADMIN_API_URL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + getToken()
      }
    })
    return client.get('app/danh-sach-ung_dung-duoc-phan-quyen')
  }
}

export default menuApi