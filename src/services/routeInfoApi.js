import axios from 'axios'
import { keycloakService } from '../boot/keycloak'

const ROUTE_INFO_URL =
  'https://api.hitc.vn/moappapiv2/api/data/hatang_quanlytuyen_newversion_update/by-id'
const APP_ID = '1f6000858ae34a709d471db1bca40db6'

// Chỉ cần field phan_loai (chứa mau_sac) nhưng giữ nguyên full list để BE
// trả cấu trúc quen thuộc / tránh phá vỡ cache phía server nếu có.
const FIELDS = [
  'ma_tuyen', 'ten_tuyen', 'phan_loai', 'so_huu', 'diem_dau', 'diem_cuoi'
]

export function fetchRouteInfo(parentId, signal) {
  const token = keycloakService?.getToken?.()
  return axios({
    url: ROUTE_INFO_URL,
    method: 'post',
    signal,
    params: { id: parentId },
    headers: {
      accept: 'application/json, text/plain, */*',
      appid: APP_ID,
      authorization: token ? `Bearer ${token}` : undefined,
      'content-type': 'application/json'
    },
    data: { field: FIELDS }
  })
}