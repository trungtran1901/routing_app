import axios from 'axios'
import { keycloakService } from '../boot/keycloak'

const PHAN_LOAI_URL =
  'https://api.hitc.vn/moappapiv2/api/data/danhmuc_qltuyen_phanloai_new_list/paging-combobox'
const APP_ID = '1f6000858ae34a709d471db1bca40db6'

export function fetchPhanLoaiTuyen(signal) {
  const token = keycloakService?.getToken?.()
  return axios({
    url: PHAN_LOAI_URL,
    method: 'post',
    signal,
    headers: {
      accept: 'application/json, text/plain, */*',
      appid: APP_ID,
      authorization: token ? `Bearer ${token}` : undefined,
      'content-type': 'application/json'
    },
    data: {
      condition: [],
      sort: [],
      projection: { field: ['name', 'code', 'mau_sac', 'mau_chu'] },
      page: 1,
      size: 20
    }
  })
}