import { createStore } from 'vuex'
import menuApi from '../services/menuApi'

// Store này CHỦ ĐÍCH giữ cùng shape (state/mutations/actions/getters)
// với store bên master app (index.js), để nếu component remote (hoặc
// bất kỳ code nào của master app đọc qua window.$store khi chạy
// standalone) truy cập, nó nhận đúng cấu trúc dữ liệu mong đợi.
//
// Trọng tâm hiện tại: state.b (chứa format/custom_format) — cần cho
// việc format Date/DateTime/Number trong MenuAddRightDrawerProV1.vue.
const store = createStore({
  state() {
    return {
      a: '',
      b: '',
      c: '',
      app: '',
      tenVietTat: null,
      logoToChuc: null,
      imageSrc: null,
      user: null,
      giaodien: null
    }
  },
  mutations: {
    SET_A(state, value) {
      state.a = value
    },
    SET_B(state, value) {
      state.b = value
    },
    SET_C(state, value) {
      state.c = value
    },
    SET_APP(state, value) {
      state.app = value
    },
    SET_USER(state, value) {
      state.user = value
    }
  },
  actions: {
    getConfig({ commit }) {
      return menuApi.getConfig()
        .then((result) => {
          commit('SET_B', result.data)
          return result.data
        })
        .catch((error) => {
          console.error('[routing-store] Không tải được config:', error)
          throw error
        })
    },
    updateProfile({ commit }, profile) {
      commit('SET_USER', profile)
    }
  },
  getters: {
    getConfigData: (state) => state.b,
    getProfile: (state) => state.user
  }
})

export default store