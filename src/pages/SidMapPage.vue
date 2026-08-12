<template>
    <q-page class="sid-map-page">
        <div class="sid-map-overlay-top row items-center q-gutter-sm">
            <div class="sid-chip">
                <q-icon name="lan" size="16px" />
                <span>{{ sidValue }}</span>
            </div>
            <q-badge v-if="notFound" color="negative">Không tìm thấy SID</q-badge>
            <q-space />
            <q-input v-model="jumpValue" dense filled dark bg-color="dark" color="primary" placeholder="Xem SID khác..."
                style="width:200px" @keyup.enter="onJump">
                <template #append>
                    <q-btn dense flat round icon="search" color="grey-4" @click="onJump" />
                </template>
            </q-input>
            <q-btn dense flat round icon="fit_screen" color="grey-4" title="Vừa khung" @click="onFit" />
            <q-btn dense flat round icon="refresh" color="grey-4" title="Làm mới" @click="load" />
            <q-btn dense flat round icon="close" color="grey-4" title="Đóng" @click="router.push('/map')" />
        </div>

        <GoogleMapView ref="mapViewRef" :points="points" :segments="segments" :selected-segment-id="selectedSegmentId"
            @idle="() => { }" @point-click="onPointClick" @segment-click="onSegmentClick"
            @background-click="clearSelection" />

        <div class="sid-legend">
            <div class="legend-title">Chú thích</div>
            <div class="legend-row"><q-icon name="apartment" color="amber" size="15px" /><span>Trạm</span></div>
            <div class="legend-row"><q-icon name="hub" color="blue" size="15px" /><span>Măng xông</span></div>
            <div class="legend-row"><q-icon name="person" color="grey-4" size="15px" /><span>Khách hàng</span></div>
        </div>

        <q-card v-if="selectedNode" dark class="sid-info-panel">
            <q-card-section class="row items-center q-pb-none">
                <div class="text-subtitle2">{{ selectedNode.label }}</div>
                <q-space />
                <q-btn dense flat round icon="close" size="sm" @click="clearSelection" />
            </q-card-section>
            <q-card-section class="text-caption q-gutter-xs">
                <div><b>Mã điểm:</b> {{ selectedNode.id }}</div>
                <div><b>Loại:</b> {{ selectedNode.point_type }}</div>
                <div><b>Tuyến:</b> {{ selectedNode.ten_tuyen || selectedNode.ma_tuyen }}</div>
            </q-card-section>
        </q-card>

        <q-card v-if="selectedEdge" dark class="sid-info-panel">
            <q-card-section class="row items-center q-pb-none">
                <div class="text-subtitle2">Đoạn cáp</div>
                <q-space />
                <q-btn dense flat round icon="close" size="sm" @click="clearSelection" />
            </q-card-section>
            <q-card-section class="text-caption q-gutter-xs">
                <div><b>Mã:</b> {{ selectedEdge.code || selectedEdge.id }}</div>
                <div><b>Tuyến:</b> {{ selectedEdge.ten_tuyen || selectedEdge.ma_tuyen }}</div>
                <div><b>Từ:</b> {{ selectedEdge.from }}</div>
                <div><b>Đến:</b> {{ selectedEdge.to }}</div>
                <div><b>Nguồn geometry:</b> {{ selectedEdge.geometry_source || 'REAL' }}</div>
            </q-card-section>
            <q-card-section class="q-pt-none">
                <div class="row items-center q-gutter-xs q-mb-xs">
                    <q-icon name="cable" size="14px" color="amber" />
                    <span class="text-caption text-weight-bold">SID trên đoạn này</span>
                    <q-badge color="amber-9" text-color="dark">{{ (selectedEdge.list_sid || []).length }}</q-badge>
                </div>
                <q-list dense bordered dark class="sid-mini-list">
                    <q-item v-for="s in (selectedEdge.list_sid || [])" :key="s.sid_cable_id"
                        :class="{ 'sid-mine': s.sid === sidValue }">
                        <q-item-section>
                            <q-item-label :class="s.sid === sidValue ? 'text-amber-4 text-weight-bold' : 'text-grey-4'">
                                {{ s.sid }}
                            </q-item-label>
                            <q-item-label caption>{{ s.ten_khach_hang }}</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                            <q-badge color="grey-8">Sợi {{ s.cable_number }}</q-badge>
                        </q-item-section>
                    </q-item>
                </q-list>
            </q-card-section>
        </q-card>

        <q-inner-loading :showing="loading" dark color="primary">
            <q-spinner-cube size="46px" />
            <div class="q-mt-sm text-grey-4">Đang tải tuyến đi của SID...</div>
        </q-inner-loading>

        <q-banner v-if="error" dense class="sid-error-banner bg-negative text-white">{{ error }}</q-banner>
    </q-page>
</template>

<script setup>
import { ref, shallowRef, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GoogleMapView from '../components/gis/GoogleMapView.vue'
import gisAPI from '../services/gis'
import { getRouteColor } from '../utils/routeColors'

const route = useRoute()
const router = useRouter()

const mapViewRef = ref(null)
const loading = ref(false)
const error = ref('')
const notFound = ref(false)
const sidValue = ref('')
const jumpValue = ref('')

const points = shallowRef(new Map())
const segments = shallowRef(new Map())
const edgesRaw = ref({})

const selectedSegmentId = ref(null)
const selectedNode = ref(null)
const selectedEdge = ref(null)

function clearSelection() {
    selectedSegmentId.value = null
    selectedNode.value = null
    selectedEdge.value = null
}

function onPointClick(point) {
    selectedEdge.value = null
    selectedSegmentId.value = null
    selectedNode.value = point
}

function onSegmentClick(segmentId) {
    selectedNode.value = null
    selectedSegmentId.value = segmentId
    selectedEdge.value = edgesRaw.value[segmentId] || null
}

function onFit() {
    mapViewRef.value?.fitToCurrentData()
}

function onJump() {
    const v = jumpValue.value?.trim()
    if (!v) return
    router.push(`/sid/map/${encodeURIComponent(v)}`)
}

async function load() {
    const sid = route.params.sid
    if (!sid) return
    sidValue.value = sid
    loading.value = true
    error.value = ''
    notFound.value = false
    clearSelection()

    try {
        const res = await gisAPI.getSidMap(sid)
        const data = res.data?.data
        if (!data) throw new Error('empty')

        if (!data.nodes?.length && !data.edges?.length) {
            notFound.value = true
            points.value = new Map()
            segments.value = new Map()
            edgesRaw.value = {}
            return
        }

        const pMap = new Map()
        for (const n of data.nodes || []) {
            pMap.set(n.id, {
                source_id: n.id,
                ma_diem: n.id,
                ten_diem: n.label,
                lat: n.lat,
                lng: n.lng,
                point_type: n.point_type,
                ma_tuyen: n.ma_tuyen,
                ten_tuyen: n.ten_tuyen
            })
        }
        points.value = pMap

        const sMap = new Map()
        const rawMap = {}
        for (const e of data.edges || []) {
            rawMap[e.id] = e
            sMap.set(e.id, {
                source_id: e.id,
                start_point_id: e.from,
                end_point_id: e.to,
                ma_tuyen: e.ma_tuyen,
                geometry: e.geometry,
                geometry_source: e.geometry_source
            })
            getRouteColor(e.ma_tuyen)
        }
        segments.value = sMap
        edgesRaw.value = rawMap

        await nextTick()
        mapViewRef.value?.fitToCurrentData()
    } catch (err) {
        error.value = err?.response?.data?.detail || 'Không tải được tuyến đi của SID.'
    } finally {
        loading.value = false
    }
}

watch(() => route.params.sid, () => load(), { immediate: true })
</script>

<style scoped>
.sid-map-page {
    position: relative;
    width: 100%;
    height: calc(100vh - 50px);
    background: #0f172a;
}

.sid-map-overlay-top {
    position: absolute;
    top: 8px;
    left: 8px;
    right: 8px;
    z-index: 30;
    pointer-events: none;
}

.sid-map-overlay-top>* {
    pointer-events: auto;
}

.sid-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #1e3a5f;
    border: 1px solid #1d4ed8;
    border-radius: 20px;
    padding: 5px 14px;
    font-size: 13px;
    font-weight: 700;
    color: #60a5fa;
}

.sid-legend {
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

.sid-info-panel {
    position: absolute;
    right: 12px;
    top: 60px;
    width: 320px;
    z-index: 25;
    background: rgba(10, 18, 35, .95);
    max-height: 80vh;
    overflow-y: auto;
}

.sid-mini-list {
    max-height: 240px;
    overflow-y: auto;
    background: rgba(15, 23, 42, .5);
}

.sid-mine {
    background: rgba(245, 158, 11, .08);
}

.sid-error-banner {
    position: absolute;
    bottom: 12px;
    left: 12px;
    right: 12px;
    z-index: 30;
}
</style>