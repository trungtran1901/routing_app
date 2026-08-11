import apiClient from './data'

const BASE = '/api/v1/map'

/**
 * GIS Map API client — see README_GIS.md for the full contract.
 * Reuses the same axios instance (baseURL, headers) as routingAPI.
 */
export const gisAPI = {
  getPoints(params, signal) {
    return apiClient.get(`${BASE}/points`, { params, signal })
  },
  getPoint(pointId, signal) {
    return apiClient.get(`${BASE}/points/${encodeURIComponent(pointId)}`, { signal })
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
  getRoute(routeId, signal) {
    return apiClient.get(`${BASE}/routes/${encodeURIComponent(routeId)}`, { signal })
  },
  getNearby(params, signal) {
    return apiClient.get(`${BASE}/nearby`, { params, signal })
  },
  search(q, limit, signal) {
    return apiClient.get(`${BASE}/search`, { params: { q, limit }, signal })
  },
  sync() {
    return apiClient.post(`${BASE}/sync`)
  }
}

export default gisAPI
