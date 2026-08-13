import { boot } from 'quasar/wrappers'
import Keycloak from 'keycloak-js'

const keycloakService = {
  keycloak: null,
  token: '',

  init() {
    this.keycloak = new Keycloak({
      url: import.meta.env.VITE_URL_AUTH,
      realm: import.meta.env.VITE_REALM,
      clientId: import.meta.env.VITE_CLIENT_ID
    })

    return this.keycloak.init({
      onLoad: 'login-required',
      checkLoginIframe: false,
      enableLogging: true,
      flow: 'implicit'
    })
  },

  createRefreshTokenTimer() {
    setInterval(() => {
      this.keycloak.updateToken(70).then(refreshed => {
        if (refreshed) {
          this.token = this.keycloak.token
          window.$keycloak = this.keycloak
        }
      }).catch(() => {})
    }, 60000)
  },

  waitForAuthentication() {
    return new Promise((resolve, reject) => {
      if (this.keycloak && this.keycloak.authenticated) {
        resolve(this.keycloak.token)
      } else {
        this.init().then(authenticated => {
          if (authenticated) {
            this.token = this.keycloak.token
            window.$keycloak = this.keycloak
            resolve(this.keycloak.token)
          } else {
            reject('User not authenticated')
          }
        }).catch(reject)
      }
    })
  },

  getToken() {
    return this?.token || this?.keycloak?.token || null
  }
}

export default boot(async ({ app }) => {
  try {
    await keycloakService.waitForAuthentication()
    app.config.globalProperties.$keycloak = keycloakService.keycloak
    keycloakService.createRefreshTokenTimer()
  } catch (error) {
    console.error('Keycloak authentication error:', error)
    throw new Error('User not authenticated')
  }
})

export { keycloakService }