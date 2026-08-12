import apiClient from './data'

const BASE = '/api/v1/map'

export const gisAPI = {
  getPoints(params, signal) {
    return apiClient.get(`${BASE}/points`, { params, signal })
  },
  getPoint(pointId, signal) {
    return apiClient.get(`${BASE}/points/${encodeURIComponent(pointId)}`, { signal })
  },
  updatePointGeometry(pointId, payload) {
    return apiClient.put(`${BASE}/points/${encodeURIComponent(pointId)}/geometry`, payload)
  },
  getSegments(params, signal) {
    return apiClient.get(`${BASE}/segments`, { params, signal })
  },
  getSegment(segmentId, signal) {
    return apiClient.get(`${BASE}/segments/${encodeURIComponent(segmentId)}`, { signal })
  },
  getSegmentGeometry(segmentId, signal) {
    return apiClient.get(`${BASE}/segments/${encodeURIComponent(segmentId)}/geometry`, { signal })
  },
  updateSegmentGeometry(segmentId, payload) {
    return apiClient.put(`${BASE}/segments/${encodeURIComponent(segmentId)}/geometry`, payload)
  },
  getRouteMap(params, signal) {
    return apiClient.get(`${BASE}/routes`, { params, signal })
  },
  getSidMap(sidValue, signal) {
    return apiClient.get(`${BASE}/sid/${encodeURIComponent(sidValue)}`, { signal })
  },
  getNearby(params, signal) {
    return apiClient.get(`${BASE}/nearby`, { params, signal })
  },
  search(q, limit, signal, type) {
    return apiClient.get(`${BASE}/search`, { params: { q, limit, type }, signal })
  },
  sync() {
    return apiClient.post(`${BASE}/sync`)
  }
}

export default gisAPI