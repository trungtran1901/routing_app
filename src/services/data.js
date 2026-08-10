import axios from 'axios'

// Khởi tạo axios instance với base URL từ .env
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: {
    accept: 'application/json'
  }
})

// ── Routing Diagram API ──
export const routingAPI = {
  /**
   * Lấy sơ đồ tuyến (Diagram)
   * @param {Object} params - { tuyen_id?: string, ma_tuyen?: string }
   * @returns {Promise}
   */
  getDiagram (params) {
    return apiClient.get('/api/v1/routing/diagram', { params })
  },

  /**
   * Lấy sơ đồ sợi cáp (Cable Diagram) — dùng trong FiberNetworkDiagram.vue
   * @param {Object} params - { tuyen_id?: string, ma_tuyen?: string }
   * @returns {Promise}
   */
  getCableDiagram (params) {
    return apiClient.get('/api/v1/routing/diagram/fiber', { params })
  },

  /**
   * Lấy sơ đồ tuyến theo SID dịch vụ — dùng trong SidRouteDiagram.vue
   * @param {Object} params - { sid: string }
   * @returns {Promise}
   */
  getSidDiagram (params) {
    return apiClient.get('/api/v1/routing/diagram/sid', { params })
  }
}

export default apiClient