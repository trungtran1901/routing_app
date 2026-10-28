import { reactive, computed, watch } from 'vue'
import { MAP_FEATURE_GROUPS, buildMapStyles } from '../utils/mapStyles'

const STORAGE_KEY = 'gis-map-display-v1'

function defaults() {
  const visibility = {}
  MAP_FEATURE_GROUPS.forEach(group => { visibility[group.key] = true })
  return { visibility, autoScale: true, scaleMultiplier: 1, traffic: false, transit: false }
}

function load() {
  const base = defaults()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const saved = JSON.parse(raw)
    return {
      visibility: { ...base.visibility, ...(saved.visibility || {}) },
      autoScale: saved.autoScale !== false,
      scaleMultiplier: Number(saved.scaleMultiplier) || 1,
      traffic: !!saved.traffic,
      transit: !!saved.transit
    }
  } catch {
    return base
  }
}

const state = reactive(load())

watch(state, value => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    return
  }
}, { deep: true })

const mapStyles = computed(() => buildMapStyles(state.visibility))

function toggleGroup(key) {
  state.visibility[key] = state.visibility[key] === false
}

function showAll() {
  Object.keys(state.visibility).forEach(key => { state.visibility[key] = true })
}

function reset() {
  const base = defaults()
  Object.assign(state.visibility, base.visibility)
  state.autoScale = base.autoScale
  state.scaleMultiplier = base.scaleMultiplier
  state.traffic = base.traffic
  state.transit = base.transit
}

export function useMapDisplay() {
  return { state, mapStyles, toggleGroup, showAll, reset }
}