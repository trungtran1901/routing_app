let loadPromise = null

/**
 * Loads the Google Maps JS API exactly once, on demand (not globally on app
 * boot), so pages that never open the map never pay for the script.
 */
export function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps)
  if (loadPromise) return loadPromise

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return Promise.reject(new Error('Thiếu VITE_GOOGLE_MAPS_API_KEY trong .env'))
  }

  loadPromise = new Promise((resolve, reject) => {
    const callbackName = '__gisMapsInit__'
    window[callbackName] = () => {
      delete window[callbackName]
      resolve(window.google.maps)
    }

    const script = document.createElement('script')
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}` +
      `&callback=${callbackName}&v=weekly&libraries=geometry`
    script.async = true
    script.defer = true
    script.onerror = () => {
      loadPromise = null
      reject(new Error('Không tải được Google Maps JavaScript API'))
    }
    document.head.appendChild(script)
  })

  return loadPromise
}
