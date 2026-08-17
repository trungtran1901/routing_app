<template>
    <q-page class="gis-map-page">
        <div class="gis-map-overlay-top row items-start q-gutter-sm">
            <MapSearchBar :model-value="gis.searchQuery.value" :results="gis.searchResults.value"
                :loading="gis.searchLoading.value" :error="gis.searchError.value" @search="onSearch"
                @select="onSearchSelect" @clear="gis.clearSearch" />
            <PlaceSearchBox ref="placeSearchRef" @select="onPlaceSelect" />
            <MapToolbar :map-type="mapType" :loading="gis.loadingMap.value || gis.loadingRouteMode.value"
                :has-route="!!gis.selectedRouteId.value" :points-draggable="gis.pointsDraggable.value"
                :route-mode="gis.routeMode.value" :route-mode-label="gis.routeModeLabel.value"
                @update:map-type="onMapTypeChange" @refresh="onRefresh" @fit-route="onFitRoute"
                @close-route="gis.clearRoute" @update:points-draggable="onTogglePointsDraggable"
                @exit-route-mode="onExitRouteMode" @go-sid="onGoSid" />
        </div>

        <GoogleMapView ref="mapViewRef" :points="activePoints" :clusters="gis.clusters.value" :segments="activeSegments"
            :route-segments="gis.routeSegments.value" :selected-segment-id="gis.selectedSegmentId.value"
            :editing-segment-id="gis.editingSegmentId.value" :current-geometry="gis.currentGeometry.value"
            :map-type="mapType" :points-draggable="gis.pointsDraggable.value"
            :visible-point-types="gis.visiblePointTypes" @ready="onMapReady" @idle="onMapIdle"
            @point-click="onPointClick" @segment-click="onSegmentClick" @background-click="onBackgroundClick"
            @geometry-changed="onGeometryChanged" @point-dragend="onPointDragEnd" @pin-change="onPinChange" />

        <div class="gis-legend">
            <div class="legend-title">Loại điểm (bấm để ẩn/hiện)</div>
            <div v-for="(meta, key) in POINT_TYPE_META" :key="key" class="legend-row legend-row--toggle"
                :class="{ 'legend-row--off': gis.visiblePointTypes[key] === false }"
                @click="gis.togglePointTypeVisible(key)">
                <q-checkbox dense :model-value="gis.visiblePointTypes[key] !== false" color="primary"
                    @update:model-value="gis.togglePointTypeVisible(key)" @click.stop />
                <span class="legend-dot" :style="{ background: meta.color }" />
                <span>{{ meta.label }}</span>
            </div>
            <div class="legend-row">
                <span class="legend-cluster-dot" />
                <span>Cụm điểm (gom theo lưới)</span>
            </div>
            <div v-if="gis.pointsDraggable.value" class="drag-hint">
                <q-icon name="info" size="12px" /> Kéo marker để lưu vị trí mới
            </div>
            <div class="drag-hint pin-hint">
                <q-icon name="push_pin" size="12px" /> Bấm vào bản đồ để ghim toạ độ
            </div>
        </div>

        <div v-if="routeLegend.length" class="gis-route-legend">
            <div class="legend-title">Tuyến trong khung nhìn ({{ routeLegend.length }})</div>
            <div v-for="r in routeLegend" :key="r.maTuyen" class="legend-row">
                <span class="legend-line" :style="{ background: r.color }" />
                <span class="legend-route-label" :title="r.maTuyen">{{ r.maTuyen }}</span>
            </div>
        </div>

        <q-card v-if="gis.selectedPoint.value" dark class="point-info-panel">
            <q-card-section class="row items-center q-pb-none">
                <div class="text-subtitle2">
                    {{ gis.selectedPoint.value.ten_diem || gis.selectedPoint.value.ma_diem }}
                </div>
                <q-space />
                <q-btn dense flat round icon="close" size="sm" @click="gis.clearSelection" />
            </q-card-section>
            <q-card-section class="text-caption q-gutter-xs">
                <div><b>Mã điểm:</b> {{ gis.selectedPoint.value.ma_diem || gis.selectedPoint.value.source_id }}</div>
                <div v-if="gis.selectedPoint.value.point_type"><b>Loại:</b> {{ gis.selectedPoint.value.point_type }}
                </div>
                <div><b>Tuyến:</b> {{ gis.selectedPoint.value.ma_tuyen }}</div>
                <div><b>Toạ độ:</b> {{ gis.selectedPoint.value.lat }}, {{ gis.selectedPoint.value.lng }}</div>
                <div v-if="gis.savingPointId.value === gis.selectedPoint.value.source_id" class="text-amber">
                    <q-spinner size="12px" /> Đang lưu vị trí mới...
                </div>
            </q-card-section>
            <q-card-section v-if="gis.selectedPoint.value.parent_id" class="q-pt-none">
                <q-btn dense no-caps flat color="grey-4" icon="route" label="Xem tuyến"
                    @click="onViewRoute(gis.selectedPoint.value.parent_id)" />
            </q-card-section>
        </q-card>

        <SegmentInfoPanel v-if="gis.selectedSegmentId.value" :detail="gis.segmentDetail.value"
            :loading="gis.loadingSegmentDetail.value" :error="gis.segmentDetailError.value"
            :editing="gis.editingSegmentId.value === gis.selectedSegmentId.value" :is-dirty="gis.isDirty.value"
            :saving="gis.saving.value" :save-error="gis.saveError.value" :conflict="gis.conflict.value"
            @close="gis.clearSelection" @start-edit="onStartEdit" @save="onSaveEdit" @cancel="gis.cancelEdit"
            @fit="onFitSegment" @view-route="onViewRoute" @reload-conflict="onReloadConflict" />

        <q-card v-if="pinInfo" dark class="pin-info-panel">
            <q-card-section class="row items-center q-pb-none">
                <q-icon name="push_pin" color="red-5" size="18px" class="q-mr-sm" />
                <div class="text-subtitle2">Vị trí đã ghim</div>
                <q-space />
                <q-btn dense flat round icon="close" size="sm" @click="clearPinInfo" />
            </q-card-section>
            <q-card-section class="text-caption q-gutter-xs">
                <div><b>Toạ độ:</b> {{ pinInfo.lat.toFixed(6) }}, {{ pinInfo.lng.toFixed(6) }}</div>
                <div v-if="pinInfo.address"><b>Địa chỉ:</b> {{ pinInfo.address }}</div>
                <div v-else class="text-grey-6"><q-spinner size="12px" /> Đang tra địa chỉ...</div>
            </q-card-section>
            <q-card-section class="q-pt-none row q-gutter-sm">
                <q-btn dense no-caps flat color="grey-4" icon="content_copy" label="Copy toạ độ"
                    @click="copyPinCoords" />
                <q-btn dense no-caps flat color="grey-4" icon="center_focus_strong" label="Fit" @click="onFitPin" />
            </q-card-section>
        </q-card>

        <q-banner v-if="gis.mapError.value" dense class="gis-error-banner bg-negative text-white">
            {{ gis.mapError.value }}
        </q-banner>
        <q-banner v-if="gis.routeModeError.value" dense class="gis-error-banner bg-negative text-white">
            {{ gis.routeModeError.value }}
        </q-banner>
    </q-page>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Notify } from 'quasar'
import GoogleMapView from '../components/gis/GoogleMapView.vue'
import MapToolbar from '../components/gis/MapToolbar.vue'
import MapSearchBar from '../components/gis/MapSearchBar.vue'
import PlaceSearchBox from '../components/gis/PlaceSearchBox.vue'
import SegmentInfoPanel from '../components/gis/SegmentInfoPanel.vue'
import { useGisMap } from '../composables/useGisMap'
import { POINT_TYPE_META } from '../utils/pointTypes'
import { getRouteColor } from '../utils/routeColors'

const route = useRoute()
const router = useRouter()
const gis = useGisMap()
const mapViewRef = ref(null)
const placeSearchRef = ref(null)
const mapInstance = ref(null)
const mapType = ref('roadmap')
const pinInfo = ref(null)
let lastBounds = null
let lastZoom = null

const activePoints = computed(() => gis.routeMode.value ? gis.routeModePoints.value : gis.points.value)
const activeSegments = computed(() => gis.routeMode.value ? gis.routeModeSegments.value : gis.segments.value)

const routeLegend = computed(() => {
    const seen = new Map()
    activeSegments.value.forEach(segment => {
        if (segment.ma_tuyen && !seen.has(segment.ma_tuyen)) {
            seen.set(segment.ma_tuyen, getRouteColor(segment.ma_tuyen))
        }
    })
    return [...seen.entries()]
        .map(([maTuyen, color]) => ({ maTuyen, color }))
        .sort((a, b) => a.maTuyen.localeCompare(b.maTuyen))
})

function onMapReady(map) {
    mapInstance.value = map
}

function onMapIdle({ bounds, zoom }) {
    lastBounds = bounds
    lastZoom = zoom
    gis.scheduleViewportLoad(bounds, zoom)
}

function onRefresh() {
    if (gis.routeMode.value) {
        enterRouteModeFromRoute()
        return
    }
    if (lastBounds) gis.loadViewport(lastBounds, lastZoom)
}

function onMapTypeChange(type) {
    mapType.value = type
    mapViewRef.value?.setMapType(type)
}

function onTogglePointsDraggable(val) {
    gis.setPointsDraggable(val)
    if (val) {
        Notify.create({ type: 'info', message: 'Chế độ chỉnh điểm bật: kéo marker để lưu vị trí mới.' })
    }
}

function onPointClick(point) {
    gis.selectPoint(point)
    mapViewRef.value?.panToPoint(point)
}

async function onSegmentClick(segmentId) {
    await gis.selectSegment(segmentId)
}

function onBackgroundClick() {
    gis.clearSelection()
}

async function onPointDragEnd({ point, lat, lng }) {
    const result = await gis.updatePointGeometry(point, lat, lng)
    if (result?.point) {
        Notify.create({ type: 'positive', message: 'Đã lưu vị trí điểm mới.' })
        if ((result.refreshed_auto_segments || []).length) {
            Notify.create({
                type: 'info',
                message: `Đã tự cập nhật ${result.refreshed_auto_segments.length} đoạn cáp AUTO liên quan.`
            })
        }
    } else if (gis.pointSaveError.value) {
        Notify.create({ type: 'negative', message: gis.pointSaveError.value })
    }
}

function onSearch(text) {
    gis.scheduleSearch(text, 'point,route')
}

function onSearchSelect(result) {
    if (result.type === 'route') {
        gis.clearSearch()
        router.push(`/route/map/${encodeURIComponent(result.ma_tuyen)}`)
        return
    }
    if (result.lat == null || result.lng == null) {
        Notify.create({ type: 'warning', message: 'Điểm này chưa có toạ độ trên bản đồ.' })
        return
    }
    gis.selectPoint({
        source_id: result.source_id,
        ma_diem: result.source_id,
        ten_diem: result.label,
        lat: result.lat,
        lng: result.lng,
        ma_tuyen: result.ma_tuyen,
        point_type: result.point_type || ''
    })
    mapViewRef.value?.panToPoint({ lat: result.lat, lng: result.lng })
    gis.clearSearch()
}

function onPlaceSelect(place) {
    mapViewRef.value?.panAndPin(place.lat, place.lng, place.address || place.name)
}

function onPinChange(info) {
    pinInfo.value = info
}

function clearPinInfo() {
    pinInfo.value = null
    mapViewRef.value?.clearPin()
}

function copyPinCoords() {
    if (!pinInfo.value) return
    const text = `${pinInfo.value.lat}, ${pinInfo.value.lng}`
    navigator.clipboard?.writeText(text)
    Notify.create({ type: 'positive', message: 'Đã copy toạ độ.' })
}

function onFitPin() {
    if (!pinInfo.value) return
    mapViewRef.value?.panToPoint({ lat: pinInfo.value.lat, lng: pinInfo.value.lng })
}

function onGoSid(sidValue) {
    router.push(`/sid/map/${encodeURIComponent(sidValue)}`)
}

function onFitRoute() {
    mapViewRef.value?.fitToRoute()
}

function onExitRouteMode() {
    gis.exitRouteMode()
    router.push('/map')
}

async function onViewRoute(routeId) {
    if (!routeId) return
    await gis.loadRoute(routeId)
}

function onStartEdit() {
    const segmentId = gis.selectedSegmentId.value
    const geometry = gis.segmentDetail.value?.segment?.geometry
    if (!segmentId || !geometry) return
    gis.startEdit(segmentId, geometry)
}

function onGeometryChanged(path) {
    gis.updateCurrentGeometryFromPath(path)
}

async function onSaveEdit() {
    const result = await gis.saveEdit()
    if (result) {
        Notify.create({ type: 'positive', message: 'Đã lưu geometry.' })
    } else if (gis.saveError.value && !gis.conflict.value) {
        Notify.create({ type: 'negative', message: gis.saveError.value })
    }
}

async function onReloadConflict() {
    const segmentId = gis.selectedSegmentId.value
    if (!segmentId) return
    await gis.reloadSegmentAfterConflict(segmentId)
    gis.cancelEdit()
}

function onFitSegment() {
    if (gis.selectedSegmentId.value) mapViewRef.value?.fitToSegment(gis.selectedSegmentId.value)
}

async function enterRouteModeFromRoute() {
    const maTuyen = route.params.maTuyen
    if (!maTuyen) return
    await gis.enterRouteMode({ maTuyen })
    await nextTick()
    mapViewRef.value?.fitToCurrentData()
}

watch(() => route.params.maTuyen, (val) => {
    if (val) {
        enterRouteModeFromRoute()
    } else if (gis.routeMode.value) {
        gis.exitRouteMode()
    }
}, { immediate: true })

onBeforeUnmount(() => {
    gis.dispose()
})
</script>

<style scoped>
.gis-map-page {
    position: relative;
    width: 100%;
    height: calc(100vh - 50px);
}

.gis-map-overlay-top {
    position: absolute;
    top: 8px;
    left: 8px;
    right: 8px;
    z-index: 30;
    pointer-events: none;
}

.gis-map-overlay-top>* {
    pointer-events: auto;
}

.point-info-panel {
    position: absolute;
    right: 12px;
    top: 60px;
    width: 280px;
    z-index: 25;
    background: rgba(10, 18, 35, .95);
}

.pin-info-panel {
    position: absolute;
    right: 12px;
    top: 60px;
    width: 280px;
    z-index: 26;
    background: rgba(10, 18, 35, .95);
}

.gis-error-banner {
    position: absolute;
    bottom: 12px;
    left: 12px;
    right: 12px;
    z-index: 30;
}

.gis-legend {
    position: absolute;
    left: 12px;
    bottom: 12px;
    z-index: 20;
    background: rgba(10, 18, 35, .92);
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 8px 12px;
    font-size: 11px;
    color: #94a3b8;
}

.legend-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .6px;
    color: #475569;
    margin-bottom: 6px;
}

.legend-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
}

.legend-row:last-child {
    margin-bottom: 0;
}

.legend-row--toggle {
    cursor: pointer;
    border-radius: 6px;
    padding: 2px 4px;
    transition: background .15s, opacity .15s;
}

.legend-row--toggle:hover {
    background: #1e293b;
}

.legend-row--off {
    opacity: .4;
}

.legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
}

.legend-cluster-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #0a84ff;
    border: 2px solid rgba(10, 132, 255, .35);
    flex-shrink: 0;
}

.drag-hint {
    margin-top: 6px;
    font-size: 10px;
    color: #f59e0b;
    display: flex;
    align-items: center;
    gap: 4px;
}

.pin-hint {
    color: #ff453a;
}

.gis-route-legend {
    position: absolute;
    left: 12px;
    top: 60px;
    z-index: 20;
    background: rgba(10, 18, 35, .92);
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 8px 12px;
    font-size: 11px;
    color: #94a3b8;
    max-width: 220px;
    max-height: 260px;
    overflow-y: auto;
}

.legend-line {
    width: 16px;
    height: 3px;
    border-radius: 2px;
    flex-shrink: 0;
}

.legend-route-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

@media (max-width: 768px) {
    .gis-map-page {
        height: calc(100vh - 50px);
    }

    .gis-map-overlay-top {
        top: 6px;
        left: 6px;
        right: 6px;
    }

    .point-info-panel,
    .pin-info-panel {
        left: 6px;
        right: 6px;
        top: auto;
        bottom: 120px;
        width: auto;
        max-width: none;
    }

    .gis-route-legend {
        left: 6px;
        right: 6px;
        top: auto;
        bottom: 120px;
        max-width: none;
    }

    .gis-legend {
        left: 6px;
        right: 6px;
        bottom: 6px;
        max-width: none;
    }

    .gis-error-banner {
        left: 6px;
        right: 6px;
    }
}

@media (max-width: 480px) {
    .gis-legend {
        font-size: 10px;
        padding: 6px 8px;
    }

    .legend-row {
        margin-bottom: 2px;
    }
}
</style>