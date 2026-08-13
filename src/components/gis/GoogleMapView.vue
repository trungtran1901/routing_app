<template>
    <div class="gis-map-root">
        <div ref="mapEl" class="gis-map-canvas" />
        <q-inner-loading :showing="!ready" dark color="primary">
            <q-spinner-cube size="42px" />
        </q-inner-loading>
    </div>
</template>

<script setup>
import { ref, shallowRef, onMounted, onBeforeUnmount, watch, markRaw } from 'vue'
import { loadGoogleMaps } from '../../utils/googleMapsLoader'
import { coordsToPath } from '../../utils/geo'
import { buildPointIcon, normalizePointType, pointTypeMeta } from '../../utils/pointTypes'
import { getRouteColor } from '../../utils/routeColors'

const props = defineProps({
    points: { type: Map, required: true },
    segments: { type: Map, required: true },
    routeSegments: { type: Array, default: () => [] },
    selectedSegmentId: { type: String, default: null },
    editingSegmentId: { type: String, default: null },
    currentGeometry: { type: Object, default: null },
    mapType: { type: String, default: 'roadmap' },
    center: { type: Object, default: () => ({ lat: 21.0278, lng: 105.8342 }) },
    zoom: { type: Number, default: 14 },
    pointsDraggable: { type: Boolean, default: false },
    visiblePointTypes: {
        type: Object,
        default: () => ({ station: true, closure: true, customer: true, other: true })
    }
})

const emit = defineEmits([
    'ready', 'idle', 'point-click', 'segment-click', 'background-click', 'geometry-changed', 'point-dragend', 'pin-change'
])

const mapEl = ref(null)
const ready = ref(false)

let map = null
let googleMaps = null
let geocoder = null
const pointMarkers = new Map()
const segmentPolylines = new Map()
const routePolylines = []
const pinMarker = shallowRef(null)
let editingPolyline = null
let editListeners = []
let idleListener = null

const SEGMENT_COLOR_SELECTED = '#facc15'
const EDIT_COLOR = '#ef4444'
const HIT_STROKE_WEIGHT = 18
const LABEL_ZOOM_MIN = 10

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
        gestureHandling: 'greedy',
        clickableIcons: false
    }))

    geocoder = markRaw(new googleMaps.Geocoder())

    map.addListener('click', e => {
        emit('background-click')
        if (!e.latLng) return
        dropPin(e.latLng.lat(), e.latLng.lng())
    })

    idleListener = map.addListener('idle', () => {
        emit('idle', { bounds: map.getBounds(), zoom: map.getZoom() })
    })

    map.addListener('zoom_changed', () => applyLabelVisibility())

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
    pointMarkers.forEach(m => m.marker.setMap(null))
    pointMarkers.clear()
    segmentPolylines.forEach(pair => { pair.hit.setMap(null); pair.visible.setMap(null) })
    segmentPolylines.clear()
    routePolylines.forEach(p => p.setMap(null))
    routePolylines.length = 0
    clearPin()
    stopEditingOverlay()
}

function isPointTypeVisible(pointType) {
    const key = normalizePointType(pointType)
    return props.visiblePointTypes?.[key] !== false
}

function applyPointVisibility() {
    pointMarkers.forEach(entry => {
        entry.marker.setMap(isPointTypeVisible(entry.pointType) ? map : null)
    })
}

function wrapLabelText(text) {
    const words = text.trim().split(/\s+/)
    if (words.length < 3) return text
    const mid = Math.ceil(words.length / 2)
    return words.slice(0, mid).join(' ') + '\n' + words.slice(mid).join(' ')
}

function buildLabelConfig(point) {
    const text = point.ten_diem || point.ma_diem || ''
    if (!text) return null
    return {
        text: wrapLabelText(text),
        color: pointTypeMeta(point.point_type).color,
        fontSize: '11px',
        fontWeight: '500',
        className: 'gis-marker-label'
    }
}

function applyLabelVisibility() {
    if (!map) return
    const show = map.getZoom() >= LABEL_ZOOM_MIN
    pointMarkers.forEach(entry => {
        entry.marker.setLabel(show ? entry.labelConfig : null)
    })
}

function syncPoints(pointsMap) {
    if (!map) return
    const seen = new Set()
    pointsMap.forEach((point, id) => {
        seen.add(id)
        let entry = pointMarkers.get(id)
        const position = { lat: point.lat, lng: point.lng }
        const visible = isPointTypeVisible(point.point_type)
        const labelConfig = buildLabelConfig(point)
        if (!entry) {
            const marker = new googleMaps.Marker({
                position,
                map: visible ? map : null,
                title: point.ten_diem || point.ma_diem,
                icon: buildPointIcon(googleMaps, point.point_type),
                draggable: props.pointsDraggable,
                zIndex: 30
            })
            marker.addListener('click', () => emit('point-click', point))
            marker.addListener('dragend', () => {
                const pos = marker.getPosition()
                emit('point-dragend', { point, lat: pos.lat(), lng: pos.lng() })
            })
            entry = { marker, pointType: point.point_type, labelConfig }
            pointMarkers.set(id, entry)
        } else {
            entry.marker.setPosition(position)
            entry.marker.setIcon(buildPointIcon(googleMaps, point.point_type))
            entry.marker.setMap(visible ? map : null)
            entry.pointType = point.point_type
            entry.labelConfig = labelConfig
        }
    })
    pointMarkers.forEach((entry, id) => {
        if (!seen.has(id)) {
            entry.marker.setMap(null)
            pointMarkers.delete(id)
        }
    })
    applyLabelVisibility()
}

function segmentColor(segment, id) {
    if (id === props.selectedSegmentId) return SEGMENT_COLOR_SELECTED
    return getRouteColor(segment.ma_tuyen)
}
function segmentWeight(id) {
    return id === props.selectedSegmentId ? 5 : 3
}

function syncSegments(segmentsMap) {
    if (!map) return
    const seen = new Set()
    segmentsMap.forEach((segment, id) => {
        seen.add(id)
        if (id === props.editingSegmentId) return

        let pair = segmentPolylines.get(id)
        const path = coordsToPath(segment.geometry?.coordinates)
        const color = segmentColor(segment, id)
        const weight = segmentWeight(id)
        if (!pair) {
            const hit = new googleMaps.Polyline({
                path, map,
                strokeColor: '#000000',
                strokeOpacity: 0.01,
                strokeWeight: HIT_STROKE_WEIGHT,
                clickable: true,
                zIndex: 5
            })
            const visible = new googleMaps.Polyline({
                path, map,
                strokeColor: color,
                strokeWeight: weight,
                strokeOpacity: 1,
                clickable: false,
                zIndex: 6
            })
            hit.addListener('click', () => emit('segment-click', id))
            hit.addListener('mouseover', () => visible.setOptions({ strokeWeight: weight + 2 }))
            hit.addListener('mouseout', () => visible.setOptions({ strokeWeight: weight }))
            pair = { hit, visible }
            segmentPolylines.set(id, pair)
        } else {
            pair.hit.setPath(path)
            pair.hit.setMap(map)
            pair.visible.setPath(path)
            pair.visible.setMap(map)
            pair.visible.setOptions({ strokeColor: color, strokeWeight: weight })
        }
    })
    segmentPolylines.forEach((pair, id) => {
        if (!seen.has(id)) {
            pair.hit.setMap(null)
            pair.visible.setMap(null)
            segmentPolylines.delete(id)
        }
    })
}

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

function fitToCurrentData() {
    if (!map) return
    const bounds = new googleMaps.LatLngBounds()
    let any = false
    props.points.forEach(p => {
        if (p.lat != null && p.lng != null) {
            bounds.extend({ lat: p.lat, lng: p.lng })
            any = true
        }
    })
    props.segments.forEach(s => {
        ; (s.geometry?.coordinates || []).forEach(c => {
            bounds.extend({ lat: c[1], lng: c[0] })
            any = true
        })
    })
    if (any) map.fitBounds(bounds, 48)
}

function startEditingOverlay(geometry) {
    stopEditingOverlay()
    const staticPair = segmentPolylines.get(props.editingSegmentId)
    if (staticPair) {
        staticPair.hit.setMap(null)
        staticPair.visible.setMap(null)
    }

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

function stopEditingOverlay(segmentId) {
    editListeners.forEach(l => googleMaps?.event.removeListener(l))
    editListeners = []
    if (editingPolyline) {
        editingPolyline.setMap(null)
        editingPolyline = null
    }
    const restoreId = segmentId || props.editingSegmentId
    if (restoreId) {
        const staticPair = segmentPolylines.get(restoreId)
        if (staticPair) {
            staticPair.hit.setMap(map)
            staticPair.visible.setMap(map)
        }
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

function buildPinIcon() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z" fill="#ff3b30" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="18" cy="18" r="7.5" fill="#ffffff"/>
    </svg>`
    return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
        scaledSize: new googleMaps.Size(36, 48),
        anchor: new googleMaps.Point(18, 48)
    }
}

function dropPin(lat, lng, silent) {
    if (!map) return
    if (pinMarker.value) {
        pinMarker.value.setPosition({ lat, lng })
    } else {
        pinMarker.value = new googleMaps.Marker({
            position: { lat, lng },
            map,
            draggable: true,
            zIndex: 60,
            icon: buildPinIcon()
        })
        pinMarker.value.addListener('dragend', () => {
            const pos = pinMarker.value.getPosition()
            resolvePin(pos.lat(), pos.lng())
        })
    }
    if (!silent) resolvePin(lat, lng)
}

function resolvePin(lat, lng) {
    emit('pin-change', { lat, lng, address: null })
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        const address = status === 'OK' && results?.[0] ? results[0].formatted_address : null
        emit('pin-change', { lat, lng, address })
    })
}

function clearPin() {
    if (pinMarker.value) {
        pinMarker.value.setMap(null)
        pinMarker.value = null
    }
}

function panAndPin(lat, lng, address, zoomTo = 17) {
    panToPoint({ lat, lng }, zoomTo)
    dropPin(lat, lng, true)
    emit('pin-change', { lat, lng, address: address || null })
}

watch(() => props.points, (val) => { if (ready.value) syncPoints(val) })
watch(() => props.segments, (val) => { if (ready.value) syncSegments(val) })
watch(() => props.routeSegments, (val) => { if (ready.value) syncRoute(val) })
watch(() => props.selectedSegmentId, () => { if (ready.value) syncSegments(props.segments) })
watch(() => props.pointsDraggable, (val) => {
    pointMarkers.forEach(entry => entry.marker.setDraggable(val))
})
watch(() => props.visiblePointTypes, () => { if (ready.value) applyPointVisibility() }, { deep: true })
watch(() => props.editingSegmentId, (id, prevId) => {
    if (!ready.value) return
    if (!id && prevId) {
        stopEditingOverlay(prevId)
        syncSegments(props.segments)
    }
})
watch(() => props.currentGeometry, (geometry) => {
    if (!ready.value || !props.editingSegmentId || editingPolyline) return
    startEditingOverlay(geometry)
})

defineExpose({ fitToSegment, fitToRoute, panToPoint, setMapType, fitToCurrentData, dropPin, clearPin, panAndPin })
</script>

<style scoped>
.gis-map-root {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 320px;
}

.gis-map-canvas {
    width: 100%;
    height: 100%;
}

@media (max-width: 768px) {
    .gis-map-root {
        min-height: 280px;
    }
}
</style>

<style>
.gis-marker-label {
    font-family: Roboto, Arial, sans-serif;
    font-weight: 500;
    white-space: pre-line;
    line-height: 1.25;
    pointer-events: none;
    letter-spacing: 0;
    text-shadow:
        -1px -1px 1px rgba(255, 255, 255, 0.95),
        1px -1px 1px rgba(255, 255, 255, 0.95),
        -1px 1px 1px rgba(255, 255, 255, 0.95),
        1px 1px 1px rgba(255, 255, 255, 0.95),
        0 0 3px rgba(255, 255, 255, 0.9);
}
</style>