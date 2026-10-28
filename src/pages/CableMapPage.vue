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
                :measure-mode="gis.measureMode.value" @update:map-type="onMapTypeChange" @refresh="onRefresh"
                @fit-route="onFitRoute" @close-route="gis.clearRoute" @update:points-draggable="onTogglePointsDraggable"
                @update:measure-mode="gis.toggleMeasureMode" @exit-route-mode="onExitRouteMode" @go-sid="onGoSid" />
        </div>

        <GoogleMapView ref="mapViewRef" :points="activePoints" :clusters="gis.clusters.value" :segments="activeSegments"
            :route-segments="gis.routeSegments.value" :selected-segment-id="gis.selectedSegmentId.value"
            :editing-segment-id="gis.editingSegmentId.value" :current-geometry="gis.currentGeometry.value"
            :map-type="mapType" :points-draggable="gis.pointsDraggable.value"
            :visible-point-types="gis.visiblePointTypes" :measure-mode="gis.measureMode.value"
            :measure-points="gis.measurePoints.value" :measure-result="gis.measureResult.value" @ready="onMapReady"
            @idle="onMapIdle" @point-click="onPointClick" @segment-click="onSegmentClick"
            @background-click="onBackgroundClick" @geometry-changed="onGeometryChanged" @point-dragend="onPointDragEnd"
            @pin-change="onPinChange" @measure-click="onMeasureClick" @measure-undo="gis.undoMeasurePoint" />
        <MapDisplayBar />
        <!-- Nút bật/tắt toàn bộ khối chú thích -->
        <q-btn round unelevated size="sm" color="dark" text-color="grey-3" icon="layers" class="legend-toggle-fab"
            :class="{ 'legend-toggle-fab--active': legendsVisible }" @click="legendsVisible = !legendsVisible">
            <q-tooltip>{{ legendsVisible ? 'Ẩn chú thích' : 'Hiện chú thích' }}</q-tooltip>
        </q-btn>

        <!-- Cột chú thích bên trái: một khung flex duy nhất để các khối không chồng lấn -->
        <div ref="legendColumnRef" class="gis-left-column" v-show="legendsVisible">
            <div ref="legendInnerRef" class="gis-left-inner" :style="{ '--legend-scale': legendScale }">
                <div class="gis-legend">
                    <div class="legend-header" @click="pointLegendOpen = !pointLegendOpen">
                        <span class="legend-title">Loại điểm (bấm để ẩn/hiện)</span>
                        <q-icon :name="pointLegendOpen ? 'expand_more' : 'chevron_right'" size="16px" />
                    </div>
                    <div v-show="pointLegendOpen" class="legend-body">
                        <div v-for="(meta, key) in POINT_TYPE_META" :key="key" class="legend-row legend-row--toggle"
                            :class="{ 'legend-row--off': gis.visiblePointTypes[key] === false }"
                            @click="gis.togglePointTypeVisible(key)">
                            <q-checkbox dense :model-value="gis.visiblePointTypes[key] !== false" color="primary"
                                @update:model-value="gis.togglePointTypeVisible(key)" @click.stop />
                            <span class="legend-icon" v-html="meta.svg" />
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
                </div>

                <div class="gis-top-left-stack">
                    <div v-if="routeLegend.length" class="gis-route-legend">
                        <div class="legend-header" @click="routeLegendOpen = !routeLegendOpen">
                            <span class="legend-title">Tuyến trong khung nhìn ({{ routeLegend.length }})</span>
                            <q-icon :name="routeLegendOpen ? 'expand_more' : 'chevron_right'" size="16px" />
                        </div>
                        <div v-show="routeLegendOpen" class="legend-body">
                            <div v-for="r in routeLegend" :key="r.maTuyen" class="legend-row legend-row--toggle"
                                :class="{ 'legend-row--active': gis.routeMode.value && gis.routeModeLabel.value === r.maTuyen }"
                                @click="onSelectRouteLegend(r.maTuyen)">
                                <span class="legend-line" :style="{ background: r.color }" />
                                <span class="legend-route-label" :title="r.maTuyen">{{ r.maTuyen }}</span>
                            </div>
                        </div>
                    </div>

                    <div class="gis-phanloai-legend">
                        <div class="legend-header" @click="phanLoaiLegendOpen = !phanLoaiLegendOpen">
                            <span class="legend-title">Phân loại tuyến (bấm để ẩn/hiện)</span>
                            <q-icon :name="phanLoaiLegendOpen ? 'expand_more' : 'chevron_right'" size="16px" />
                        </div>
                        <div v-show="phanLoaiLegendOpen" class="legend-body">
                            <div v-if="gis.loadingPhanLoai.value" class="legend-loading">
                                <q-spinner-ios size="14px" /> Đang tải...
                            </div>
                            <template v-else>
                                <div v-for="item in gis.phanLoaiList.value" :key="item.code"
                                    class="legend-row legend-row--toggle"
                                    :class="{ 'legend-row--off': gis.selectedPhanLoai[item.code] === false }"
                                    @click="gis.togglePhanLoai(item.code)">
                                    <q-checkbox dense :model-value="gis.selectedPhanLoai[item.code] !== false"
                                        color="primary" @update:model-value="gis.togglePhanLoai(item.code)"
                                        @click.stop />
                                    <span class="legend-dot"
                                        :style="{ background: item.mau_chu || item.mau_sac || '#64748b' }" />
                                    <span :title="item.name">{{ item.name }}</span>
                                </div>
                                <div v-if="gis.phanLoaiError.value" class="legend-error">{{ gis.phanLoaiError.value }}
                                </div>
                            </template>
                        </div>
                    </div>
                </div>
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
            :auto-saving="gis.autoSaving.value" :finishing="finishingEdit"
            :save-error="gis.autoSaveError.value || gis.saveError.value" :conflict="gis.conflict.value"
            @close="gis.clearSelection" @start-edit="onStartEdit" @finish="onFinishEdit" @fit="onFitSegment"
            @view-route="onViewRoute" @reload-conflict="onReloadConflict" />

        <q-card v-if="gis.measureMode.value" dark class="measure-panel">
            <q-card-section class="row items-center q-pb-sm">
                <q-icon name="straighten" size="16px" color="orange-5" class="q-mr-sm" />
                <div class="text-subtitle2">Đo khoảng cách</div>
                <q-space />
                <q-btn dense flat round icon="close" size="sm" @click="gis.toggleMeasureMode(false)" />
            </q-card-section>

            <q-card-section class="q-pt-none text-caption">
                <div v-if="gis.measurePoints.value.length < 2" class="text-grey-5">
                    Bấm vào bản đồ để chọn điểm ({{ gis.measurePoints.value.length }} điểm, cần tối thiểu 2)
                </div>
                <template v-else>
                    <div v-if="gis.measureLoading.value" class="row items-center q-gutter-xs">
                        <q-spinner-ios size="14px" /><span>Đang tính...</span>
                    </div>
                    <div v-else-if="gis.measureResult.value" class="text-weight-bold text-orange-4">
                        {{ gis.measureResult.value.total_length_km }} km
                        <span class="text-grey-5 text-weight-regular">
                            ({{ Math.round(gis.measureResult.value.total_length_m) }} m ·
                            {{ gis.measurePoints.value.length }} điểm)
                        </span>
                    </div>
                    <div v-if="gis.measureError.value" class="text-negative">{{ gis.measureError.value }}</div>
                </template>
            </q-card-section>

            <q-card-section class="q-pt-none row q-gutter-sm">
                <q-btn dense no-caps flat color="grey-4" icon="undo" label="Xoá điểm cuối"
                    :disable="!gis.measurePoints.value.length" @click="gis.undoMeasurePoint" />
                <q-btn dense no-caps flat color="grey-4" icon="restart_alt" label="Làm lại"
                    :disable="!gis.measurePoints.value.length" @click="gis.resetMeasure" />
                <q-btn dense no-caps flat color="grey-4" icon="center_focus_strong" label="Vừa khung"
                    :disable="!gis.measurePoints.value.length" @click="onFitMeasure" />
            </q-card-section>
        </q-card>

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
                <div v-if="!gis.routeMode.value" class="text-amber">
                    <q-icon name="info" size="12px" /> Chọn xem một tuyến để có thể thêm điểm
                </div>
            </q-card-section>
            <q-card-section class="q-pt-none row q-gutter-sm">
                <q-btn dense no-caps flat color="grey-4" icon="content_copy" label="Copy toạ độ"
                    @click="copyPinCoords" />
                <q-btn dense no-caps flat color="grey-4" icon="center_focus_strong" label="Fit" @click="onFitPin" />
                <q-btn v-if="gis.routeMode.value" dense no-caps color="primary" icon="add_location_alt"
                    label="Thêm điểm" @click="openAddPoint" />
            </q-card-section>
        </q-card>
        <RemoteAddPointDrawer v-if="pinInfo" v-model="addPointOpen" :view="ADD_POINT_VIEW_NAME" :lat="pinInfo.lat"
            :lng="pinInfo.lng" :address="pinInfo.address" :ma-tuyen="currentRouteMaTuyen"
            :parent-id="currentRouteParentId" @created="onPointCreated" />
        <q-banner v-if="gis.mapError.value" dense class="gis-error-banner bg-negative text-white">
            {{ gis.mapError.value }}
        </q-banner>
        <q-banner v-if="gis.routeModeError.value" dense class="gis-error-banner bg-negative text-white">
            {{ gis.routeModeError.value }}
        </q-banner>
    </q-page>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Notify } from 'quasar'
import GoogleMapView from '../components/gis/GoogleMapView.vue'
import MapDisplayBar from '../components/gis/MapDisplayBar.vue'
import MapToolbar from '../components/gis/MapToolbar.vue'
import MapSearchBar from '../components/gis/MapSearchBar.vue'
import PlaceSearchBox from '../components/gis/PlaceSearchBox.vue'
import SegmentInfoPanel from '../components/gis/SegmentInfoPanel.vue'
import { useGisMap } from '../composables/useGisMap'
import { POINT_TYPE_META } from '../utils/pointTypes'
import {
    getRouteColor,
    getRouteColorByParentId,
    ensureRouteColorByParentId,
    routeColorVersion
} from '../utils/routeColors.js'
import RemoteAddPointDrawer from '../components/gis/RemoteAddPointDrawer.vue'
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
let routeIdleTimer = null
const ROUTE_IDLE_DEBOUNCE_MS = 400
const addPointOpen = ref(false)
const ADD_POINT_VIEW_NAME = 'hatang_quanlytuyen_newversion_detail_insert_maps'

const legendsVisible = ref(true)
const pointLegendOpen = ref(true)
const routeLegendOpen = ref(true)
const phanLoaiLegendOpen = ref(true)

const finishingEdit = ref(false)
const startingEdit = ref(false)

// ── Tự thu nhỏ cột chú thích cho vừa chiều cao khả dụng (riêng danh sách tuyến có scrollbar) ──
const legendColumnRef = ref(null)
const legendInnerRef = ref(null)
const legendScale = ref(1)
const LEGEND_MIN_SCALE = 0.5
let legendResizeObserver = null
let legendRaf = 0

function updateLegendScale() {
    cancelAnimationFrame(legendRaf)
    legendRaf = requestAnimationFrame(() => {
        const col = legendColumnRef.value
        const inner = legendInnerRef.value
        if (!col || !inner) return
        const avail = col.clientHeight
        const natural = inner.offsetHeight // chiều cao thật, không bị ảnh hưởng bởi transform
        if (!avail || !natural) return
        const next = Math.max(LEGEND_MIN_SCALE, Math.min(1, avail / natural))
        if (Math.abs(next - legendScale.value) > 0.005) legendScale.value = next
    })
}

const SMALL_SCREEN_BREAKPOINT = 640

function applyResponsiveLegendDefaults() {
    const isSmall = window.innerWidth <= SMALL_SCREEN_BREAKPOINT
    pointLegendOpen.value = true
    routeLegendOpen.value = !isSmall
    phanLoaiLegendOpen.value = !isSmall
}

function openAddPoint() {
    if (!gis.routeMode.value) {
        Notify.create({ type: 'warning', message: 'Vui lòng chọn xem một tuyến trước khi thêm điểm.' })
        return
    }
    addPointOpen.value = true
}
function resolveParentIdForRoute(maTuyen, segmentsMap, pointsMap) {
    for (const segment of segmentsMap.values()) {
        if (segment.ma_tuyen === maTuyen && segment.parent_id) return segment.parent_id
    }
    for (const point of pointsMap.values()) {
        if (point.ma_tuyen === maTuyen && point.parent_id) return point.parent_id
    }
    return null
}
const RELOAD_SETTLE_DELAY_MS = 400

function onPointCreated() {
    Notify.create({ type: 'positive', message: 'Đã thêm điểm mới trên bản đồ.' })
    clearPinInfo()
    mapViewRef.value?.clearPin()
    setTimeout(() => {
        if (gis.routeMode.value) {
            enterRouteModeFromRoute()
        } else if (lastBounds) {
            gis.loadViewport(lastBounds, lastZoom)
        }
    }, RELOAD_SETTLE_DELAY_MS)
}
const activePoints = computed(() => gis.routeMode.value ? gis.routeModePoints.value : gis.points.value)
const activeSegments = computed(() => gis.routeMode.value ? gis.routeModeSegments.value : gis.segments.value)

const currentRouteMaTuyen = computed(() => gis.routeMode.value ? gis.routeModeLabel.value : '')

const currentRouteParentId = computed(() => {
    if (!gis.routeMode.value || !gis.routeModeLabel.value) return ''
    return resolveParentIdForRoute(
        gis.routeModeLabel.value,
        gis.routeModeSegments.value,
        gis.routeModePoints.value
    ) || ''
})

const routeLegend = computed(() => {
    void routeColorVersion.value

    const activePointsMap = gis.routeMode.value ? gis.routeModePoints.value : gis.points.value
    const seen = new Map()

    activeSegments.value.forEach(segment => {
        if (segment.ma_tuyen && !seen.has(segment.ma_tuyen)) {
            const parentId = resolveParentIdForRoute(segment.ma_tuyen, activeSegments.value, activePointsMap)
            seen.set(segment.ma_tuyen, parentId)
        }
    })

    return [...seen.entries()]
        .map(([maTuyen, parentId]) => {
            if (parentId) ensureRouteColorByParentId(parentId)
            const color = parentId
                ? getRouteColorByParentId(parentId, maTuyen)
                : getRouteColor(maTuyen)
            return { maTuyen, color }
        })
        .sort((a, b) => a.maTuyen.localeCompare(b.maTuyen))
})

function onSelectRouteLegend(maTuyen) {
    if (!maTuyen) return
    if (gis.routeMode.value && gis.routeModeLabel.value === maTuyen) return
    router.push(`/route/map/${encodeURIComponent(maTuyen)}`)
}

function onMapReady(map) {
    mapInstance.value = map
}

function onMapIdle({ bounds, zoom }) {
    lastBounds = bounds
    lastZoom = zoom
    if (gis.routeMode.value) {
        if (routeIdleTimer) clearTimeout(routeIdleTimer)
        routeIdleTimer = setTimeout(() => { gis.reloadRouteMode() }, ROUTE_IDLE_DEBOUNCE_MS)
        return
    }
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
    if (gis.editingSegmentId.value) return
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
        setTimeout(() => {
            if (gis.routeMode.value) {
                gis.reloadRouteMode()
            } else if (lastBounds) {
                gis.loadViewport(lastBounds, lastZoom)
            }
        }, RELOAD_SETTLE_DELAY_MS)
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

async function onStartEdit() {
    const segmentId = gis.selectedSegmentId.value
    if (!segmentId || startingEdit.value) return
    startingEdit.value = true
    try {
        await gis.startEdit(segmentId, gis.segmentDetail.value?.segment?.geometry)
    } finally {
        startingEdit.value = false
    }
}

function onGeometryChanged(path) {
    gis.updateCurrentGeometryFromPath(path)
}

async function onFinishEdit() {
    finishingEdit.value = true
    const ok = await gis.finishEditing()
    finishingEdit.value = false
    if (ok) {
        Notify.create({ type: 'positive', message: 'Đã hoàn thành chỉnh sửa đoạn cáp.' })
    } else if (gis.autoSaveError.value) {
        Notify.create({ type: 'negative', message: gis.autoSaveError.value })
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

function onMeasureClick(pt) {
    gis.addMeasurePoint(pt.lat, pt.lng)
}

function onFitMeasure() {
    mapViewRef.value?.fitToMeasure()
}

function onMeasureKeydown(e) {
    if (e.key === 'Escape' && gis.measureMode.value) gis.undoMeasurePoint()
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

onMounted(() => {
    gis.loadPhanLoaiTuyen()
    window.addEventListener('keydown', onMeasureKeydown)
    applyResponsiveLegendDefaults()
    window.addEventListener('resize', applyResponsiveLegendDefaults)

    legendResizeObserver = new ResizeObserver(updateLegendScale)
    if (legendColumnRef.value) legendResizeObserver.observe(legendColumnRef.value)
    if (legendInnerRef.value) legendResizeObserver.observe(legendInnerRef.value)
    updateLegendScale()
})

onBeforeUnmount(() => {
    gis.dispose()
    window.removeEventListener('keydown', onMeasureKeydown)
    window.removeEventListener('resize', applyResponsiveLegendDefaults)
    if (routeIdleTimer) clearTimeout(routeIdleTimer)
    legendResizeObserver?.disconnect()
    cancelAnimationFrame(legendRaf)
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

.measure-panel {
    position: absolute;
    right: 12px;
    top: 60px;
    width: 260px;
    z-index: 27;
    background: rgba(10, 18, 35, .95);
}

.gis-error-banner {
    position: absolute;
    bottom: 12px;
    left: 12px;
    right: 12px;
    z-index: 30;
}

.legend-toggle-fab {
    position: absolute;
    left: 12px;
    bottom: 12px;
    z-index: 22;
    box-shadow: 0 4px 14px rgba(0, 0, 0, .4);
}

.legend-toggle-fab--active {
    color: #60a5fa;
}

/* ── Cột chú thích bên trái: tự thu nhỏ (transform: scale) cho vừa màn hình, trừ danh sách tuyến ── */
.gis-left-column {
    position: absolute;
    left: 12px;
    top: 60px;
    bottom: 58px;
    /* chừa chỗ cho nút bật/tắt chú thích */
    width: clamp(180px, 15vw, 240px);
    z-index: 20;
    overflow: hidden;
    pointer-events: none;
    /* vùng trống không chặn thao tác bản đồ */
}

.gis-left-inner {
    --legend-scale: 1;
    /* JS cập nhật theo chiều cao khả dụng */
    width: 100%;
    /* scale thu nhỏ đồng thời cả chiều ngang và chiều cao */
    display: flex;
    flex-direction: column;
    gap: 8px;
    transform: scale(var(--legend-scale));
    transform-origin: top left;
    pointer-events: none;
}

.gis-left-inner>* {
    pointer-events: auto;
}

/* Tuyến trong khung nhìn + Phân loại tuyến (nằm trên) */
.gis-top-left-stack {
    order: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

/* Loại điểm (nằm dưới) */
.gis-legend {
    order: 2;
    background: rgba(10, 18, 35, .92);
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 6px 10px;
    color: #94a3b8;
}

.gis-phanloai-legend,
.gis-route-legend {
    background: rgba(10, 18, 35, .92);
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 6px 10px;
    color: #94a3b8;
    flex-shrink: 0;
}

.gis-legend,
.gis-route-legend,
.gis-phanloai-legend {
    font-size: 11px;
}

/* Tuyến trong khung nhìn: hiện tối đa ~10 dòng, nhiều hơn thì cuộn (scrollbar mảnh) */
.gis-route-legend .legend-body {
    max-height: 245px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #475569 transparent;
}

.gis-route-legend .legend-body::-webkit-scrollbar {
    width: 4px;
}

.gis-route-legend .legend-body::-webkit-scrollbar-track {
    background: transparent;
}

.gis-route-legend .legend-body::-webkit-scrollbar-thumb {
    background: #475569;
    border-radius: 4px;
}

.gis-route-legend .legend-body::-webkit-scrollbar-thumb:hover {
    background: #60a5fa;
}

.legend-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    cursor: pointer;
    user-select: none;
    padding: 2px 0;
}

.legend-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .6px;
    color: #475569;
}

.legend-body {
    margin-top: 4px;
}

.legend-loading {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #64748b;
}

.legend-error {
    font-size: 10px;
    color: #f87171;
    margin-top: 4px;
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

.legend-row--active {
    background: #1e3a5f;
}

.legend-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.legend-icon :deep(svg) {
    width: 100%;
    height: 100%;
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
    .pin-info-panel,
    .measure-panel {
        left: 6px;
        right: 6px;
        top: auto;
        bottom: 120px;
        width: auto;
        max-width: none;
    }

    .gis-left-column {
        left: 6px;
        right: 6px;
        width: auto;
        bottom: 52px;
    }

    .legend-toggle-fab {
        left: 6px;
        bottom: 6px;
    }

    .gis-error-banner {
        left: 6px;
        right: 6px;
    }
}
</style>