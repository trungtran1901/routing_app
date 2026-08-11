<template>
  <div class="gis-map-root">
    <div ref="mapEl" class="gis-map-canvas" />
    <q-inner-loading :showing="!ready" dark color="primary">
      <q-spinner-cube size="42px" />
    </q-inner-loading>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, markRaw } from 'vue'
import { loadGoogleMaps } from '../../utils/googleMapsLoader'
import { coordsToPath } from '../../utils/geo'
import { buildPointIcon } from '../../utils/pointTypes'
import { getRouteColor } from '../../utils/routeColors'

const props = defineProps({
  points: { type: Map, required: true },
  segments: { type: Map, required: true },
  routeSegments: { type: Array, default: () => [] },
  selectedSegmentId: { type: String, default: null },
  editingSegmentId: { type: String, default: null },
  currentGeometry: { type: Object, default: null },
  mapType: { type: String, default: 'roadmap' },
  center: { type: Object, default: () => ({ lat: 21.0278, lng: 105.8342 }) }, // Hà Nội
  zoom: { type: Number, default: 14 }
})

const emit = defineEmits([
  'ready', 'idle', 'point-click', 'segment-click', 'background-click', 'geometry-changed'
])

const mapEl = ref(null)
const ready = ref(false)

let map = null
let googleMaps = null
// Plain JS Maps, deliberately NOT reactive — Vue must never deep-track
// Google Maps' internal overlay objects (see task brief §35).
const pointMarkers = new Map()
const segmentPolylines = new Map()
const routePolylines = []
let editingPolyline = null
let editListeners = []
let idleListener = null

// Selection/editing overlays stay fixed colors so they always stand out
// regardless of which route's color they happen to land on; the base
// segment color is otherwise derived per-route via getRouteColor().
const SEGMENT_COLOR_SELECTED = '#facc15'
const EDIT_COLOR = '#ef4444'

onMounted(async () => {
  try {
    googleMaps = markRaw(await loadGoogleMaps())
  } catch (err) {
    console.error('[GoogleMapView] load error', err)
    return
  }
  if (!mapEl.value) return

  map = markRaw(new googleMaps.Map(mapEl.value, {
    center: props.center,
    zoom: props.zoom,
    mapTypeId: props.mapType,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: false
  }))

  map.addListener('click', () => emit('background-click'))

  // Only fetch after the map settles — never on every drag/zoom tick (§12)
  idleListener = map.addListener('idle', () => {
    emit('idle', { bounds: map.getBounds(), zoom: map.getZoom() })
  })

  ready.value = true
  emit('ready', map)

  syncPoints(props.points)
  syncSegments(props.segments)
  syncRoute(props.routeSegments)
})

onBeforeUnmount(() => {
  clearAllOverlays()
  if (idleListener) googleMaps?.event.removeListener(idleListener)
})

function clearAllOverlays() {
  pointMarkers.forEach(m => m.setMap(null))
  pointMarkers.clear()
  segmentPolylines.forEach(p => p.setMap(null))
  segmentPolylines.clear()
  routePolylines.forEach(p => p.setMap(null))
  routePolylines.length = 0
  stopEditingOverlay()
}

// ── Points ──
function syncPoints(pointsMap) {
  if (!map) return
  const seen = new Set()
  pointsMap.forEach((point, id) => {
    seen.add(id)
    let marker = pointMarkers.get(id)
    const position = { lat: point.lat, lng: point.lng }
    if (!marker) {
      marker = new googleMaps.Marker({
        position,
        map,
        title: point.ten_diem || point.ma_diem,
        icon: buildPointIcon(googleMaps, point.point_type)
      })
      marker.addListener('click', () => emit('point-click', point))
      pointMarkers.set(id, marker)
    } else {
      marker.setPosition(position)
      // point_type can't change on an existing point in practice, but keep
      // the icon in sync in case the backend reclassifies it between loads
      marker.setIcon(buildPointIcon(googleMaps, point.point_type))
    }
  })
  // Drop markers that fell out of the current viewport response
  pointMarkers.forEach((marker, id) => {
    if (!seen.has(id)) {
      marker.setMap(null)
      pointMarkers.delete(id)
    }
  })
}

// ── Segments ──
function syncSegments(segmentsMap) {
  if (!map) return
  const seen = new Set()
  segmentsMap.forEach((segment, id) => {
    seen.add(id)
    // The segment being edited is owned by the editing overlay, not this layer
    if (id === props.editingSegmentId) return

    let polyline = segmentPolylines.get(id)
    const path = coordsToPath(segment.geometry?.coordinates)
    if (!polyline) {
      polyline = new googleMaps.Polyline({
        path,
        map,
        strokeColor: segmentColor(segment, id),
        strokeWeight: segmentWeight(id),
        clickable: true
      })
      polyline.addListener('click', () => emit('segment-click', id))
      segmentPolylines.set(id, polyline)
    } else {
      polyline.setPath(path)
      polyline.setOptions({ strokeColor: segmentColor(segment, id), strokeWeight: segmentWeight(id) })
    }
  })
  segmentPolylines.forEach((polyline, id) => {
    if (!seen.has(id)) {
      polyline.setMap(null)
      segmentPolylines.delete(id)
    }
  })
}

function segmentColor(segment, id) {
  // Selection highlight takes priority over the route color so the picked
  // segment is always unambiguous, even if its route color is similar to
  // a neighboring route.
  if (id === props.selectedSegmentId) return SEGMENT_COLOR_SELECTED
  return getRouteColor(segment.ma_tuyen)
}
function segmentWeight(id) {
  return id === props.selectedSegmentId ? 5 : 3
}

// ── Route (full tuyến, independent of viewport BBox) ──
function syncRoute(list) {
  routePolylines.forEach(p => p.setMap(null))
  routePolylines.length = 0
  if (!map || !list?.length) return
  list.forEach(segment => {
    const path = coordsToPath(segment.geometry?.coordinates)
    const polyline = new googleMaps.Polyline({
      path, map,
      strokeColor: getRouteColor(segment.ma_tuyen),
      strokeWeight: 7,
      strokeOpacity: 0.95,
      zIndex: 5
    })
    routePolylines.push(polyline)
  })
  fitToPaths(list.map(s => coordsToPath(s.geometry?.coordinates)))
}

function fitToPaths(paths) {
  if (!map || !paths?.length) return
  const bounds = new googleMaps.LatLngBounds()
  let any = false
  paths.forEach(path => path.forEach(pt => { bounds.extend(pt); any = true }))
  if (any) map.fitBounds(bounds, 48)
}

// ── Geometry editing overlay ──
function startEditingOverlay(geometry) {
  stopEditingOverlay()
  const staticSeg = segmentPolylines.get(props.editingSegmentId)
  if (staticSeg) staticSeg.setMap(null) // hide the static line while its editable twin is shown

  const path = coordsToPath(geometry?.coordinates)
  editingPolyline = new googleMaps.Polyline({
    path, map,
    strokeColor: EDIT_COLOR,
    strokeWeight: 4,
    editable: true,
    zIndex: 20
  })

  const emitChange = () => emit('geometry-changed', currentPolylinePath())
  const mvcPath = editingPolyline.getPath()
  editListeners.push(googleMaps.event.addListener(mvcPath, 'set_at', emitChange))
  editListeners.push(googleMaps.event.addListener(mvcPath, 'insert_at', emitChange))
  editListeners.push(googleMaps.event.addListener(mvcPath, 'remove_at', emitChange))
}

function currentPolylinePath() {
  const mvcPath = editingPolyline.getPath()
  const arr = []
  mvcPath.forEach(latLng => arr.push(latLng))
  return arr
}

function stopEditingOverlay() {
  editListeners.forEach(l => googleMaps?.event.removeListener(l))
  editListeners = []
  if (editingPolyline) {
    editingPolyline.setMap(null)
    editingPolyline = null
  }
  if (props.editingSegmentId) {
    const staticSeg = segmentPolylines.get(props.editingSegmentId)
    if (staticSeg) staticSeg.setMap(map)
  }
}

function fitToSegment(segmentId) {
  const segment = props.segments.get(segmentId)
  if (!segment) return
  fitToPaths([coordsToPath(segment.geometry?.coordinates)])
}

function fitToRoute() {
  fitToPaths(props.routeSegments.map(s => coordsToPath(s.geometry?.coordinates)))
}

function panToPoint(point, targetZoom = 17) {
  if (!map || !point) return
  map.panTo({ lat: point.lat, lng: point.lng })
  if (map.getZoom() < targetZoom) map.setZoom(targetZoom)
}

function setMapType(type) {
  map?.setMapTypeId(type)
}

// ── Watchers ──
watch(() => props.points, (val) => { if (ready.value) syncPoints(val) })
watch(() => props.segments, (val) => { if (ready.value) syncSegments(val) })
watch(() => props.routeSegments, (val) => { if (ready.value) syncRoute(val) })
watch(() => props.selectedSegmentId, () => { if (ready.value) syncSegments(props.segments) })
watch(() => props.editingSegmentId, (id, prevId) => {
  if (!ready.value) return
  if (!id && prevId) {
    // edit ended (save or cancel) — drop the editable overlay, restore static line
    stopEditingOverlay()
    syncSegments(props.segments)
  }
})
watch(() => props.currentGeometry, (geometry) => {
  if (!ready.value || !props.editingSegmentId || editingPolyline) return
  startEditingOverlay(geometry)
})

defineExpose({ fitToSegment, fitToRoute, panToPoint, setMapType })
</script>

<style scoped>
.gis-map-root { position: relative; width: 100%; height: 100%; min-height: 480px; }
.gis-map-canvas { width: 100%; height: 100%; }
</style>
