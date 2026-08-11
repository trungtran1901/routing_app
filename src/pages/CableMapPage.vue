<template>
  <q-page class="gis-map-page">
    <div class="gis-map-overlay-top row items-start q-gutter-sm">
      <MapSearchBar
        :model-value="gis.searchQuery.value"
        :results="gis.searchResults.value"
        :loading="gis.searchLoading.value"
        :error="gis.searchError.value"
        @search="onSearch"
        @select="onSearchSelect"
        @clear="gis.clearSearch"
      />
      <MapToolbar
        :map-type="mapType"
        :loading="gis.loadingMap.value"
        :has-route="!!gis.selectedRouteId.value"
        @update:map-type="onMapTypeChange"
        @refresh="onRefresh"
        @fit-route="onFitRoute"
        @close-route="gis.clearRoute"
      />
    </div>

    <GoogleMapView
      ref="mapViewRef"
      :points="gis.points.value"
      :segments="gis.segments.value"
      :route-segments="gis.routeSegments.value"
      :selected-segment-id="gis.selectedSegmentId.value"
      :editing-segment-id="gis.editingSegmentId.value"
      :current-geometry="gis.currentGeometry.value"
      :map-type="mapType"
      @idle="onMapIdle"
      @point-click="onPointClick"
      @segment-click="onSegmentClick"
      @background-click="gis.clearSelection"
      @geometry-changed="onGeometryChanged"
    />

    <!-- Point type legend -->
    <div class="gis-legend">
      <div class="legend-title">Loại điểm</div>
      <div v-for="(meta, key) in POINT_TYPE_META" :key="key" class="legend-row">
        <span class="legend-dot" :style="{ background: meta.color }" />
        <span>{{ meta.label }}</span>
      </div>
    </div>

    <!-- Per-route color legend — each ma_tuyen currently in viewport gets its own color -->
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
        <div><b>Mã điểm:</b> {{ gis.selectedPoint.value.ma_diem }}</div>
        <div v-if="gis.selectedPoint.value.point_type"><b>Loại:</b> {{ gis.selectedPoint.value.point_type }}</div>
        <div><b>Tuyến:</b> {{ gis.selectedPoint.value.ma_tuyen }}</div>
        <div><b>Toạ độ:</b> {{ gis.selectedPoint.value.lat }}, {{ gis.selectedPoint.value.lng }}</div>
      </q-card-section>
      <q-card-section v-if="gis.selectedPoint.value.parent_id" class="q-pt-none">
        <q-btn dense no-caps flat color="grey-4" icon="route" label="Xem tuyến"
          @click="onViewRoute(gis.selectedPoint.value.parent_id)" />
      </q-card-section>
    </q-card>

    <SegmentInfoPanel
      v-if="gis.selectedSegmentId.value"
      :detail="gis.segmentDetail.value"
      :loading="gis.loadingSegmentDetail.value"
      :error="gis.segmentDetailError.value"
      :editing="gis.editingSegmentId.value === gis.selectedSegmentId.value"
      :is-dirty="gis.isDirty.value"
      :saving="gis.saving.value"
      :save-error="gis.saveError.value"
      :conflict="gis.conflict.value"
      @close="gis.clearSelection"
      @start-edit="onStartEdit"
      @save="onSaveEdit"
      @cancel="gis.cancelEdit"
      @fit="onFitSegment"
      @view-route="onViewRoute"
      @reload-conflict="onReloadConflict"
    />

    <q-banner v-if="gis.mapError.value" dense class="gis-error-banner bg-negative text-white">
      {{ gis.mapError.value }}
    </q-banner>
  </q-page>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { Notify } from 'quasar'
import GoogleMapView from '../components/gis/GoogleMapView.vue'
import MapToolbar from '../components/gis/MapToolbar.vue'
import MapSearchBar from '../components/gis/MapSearchBar.vue'
import SegmentInfoPanel from '../components/gis/SegmentInfoPanel.vue'
import { useGisMap } from '../composables/useGisMap'
import { POINT_TYPE_META } from '../utils/pointTypes'
import { getRouteColor } from '../utils/routeColors'

const gis = useGisMap()
const mapViewRef = ref(null)
const mapType = ref('roadmap')
let lastBounds = null
let lastZoom = null

// Distinct ma_tuyen currently loaded in the viewport, each with its stable
// route color — lets the user read the otherwise-arbitrary-looking colors.
const routeLegend = computed(() => {
  const seen = new Map()
  gis.segments.value.forEach(segment => {
    if (segment.ma_tuyen && !seen.has(segment.ma_tuyen)) {
      seen.set(segment.ma_tuyen, getRouteColor(segment.ma_tuyen))
    }
  })
  return [...seen.entries()]
    .map(([maTuyen, color]) => ({ maTuyen, color }))
    .sort((a, b) => a.maTuyen.localeCompare(b.maTuyen))
})

function onMapIdle({ bounds, zoom }) {
  lastBounds = bounds
  lastZoom = zoom
  gis.scheduleViewportLoad(bounds, zoom)
}

function onRefresh() {
  if (lastBounds) gis.loadViewport(lastBounds, lastZoom)
}

function onMapTypeChange(type) {
  mapType.value = type
  mapViewRef.value?.setMapType(type)
}

function onPointClick(point) {
  gis.selectPoint(point)
  mapViewRef.value?.panToPoint(point)
}

async function onSegmentClick(segmentId) {
  await gis.selectSegment(segmentId)
}

function onSearch(text) {
  gis.scheduleSearch(text)
}

function onSearchSelect(result) {
  if (result.lat == null || result.lng == null) {
    Notify.create({ type: 'warning', message: 'Điểm này chưa có toạ độ trên bản đồ.' })
    return
  }
  gis.selectPoint({
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

function onFitRoute() {
  mapViewRef.value?.fitToRoute()
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

onBeforeUnmount(() => {
  gis.dispose()
})
</script>

<style scoped>
.gis-map-page { position: relative; width: 100%; height: calc(100vh - 50px); }
.gis-map-overlay-top {
  position: absolute; top: 8px; left: 8px; right: 8px; z-index: 30;
  pointer-events: none;
}
.gis-map-overlay-top > * { pointer-events: auto; }
.point-info-panel {
  position: absolute; right: 12px; top: 60px; width: 280px; z-index: 25;
  background: rgba(10, 18, 35, .95);
}
.gis-error-banner { position: absolute; bottom: 12px; left: 12px; right: 12px; z-index: 30; }

.gis-legend {
  position: absolute; left: 12px; bottom: 12px; z-index: 20;
  background: rgba(10, 18, 35, .92);
  border: 1px solid #1e293b;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 11px;
  color: #94a3b8;
}
.legend-title {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .6px; color: #475569; margin-bottom: 6px;
}
.legend-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.legend-row:last-child { margin-bottom: 0; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

.gis-route-legend {
  position: absolute; left: 12px; top: 60px; z-index: 20;
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
.legend-line { width: 16px; height: 3px; border-radius: 2px; flex-shrink: 0; }
.legend-route-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
