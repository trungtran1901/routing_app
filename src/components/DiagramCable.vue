<template>
    <div class="network-component-wrapper">
        <div class="network-card">
            <div class="toolbar">
                <!-- Breadcrumb -->
                <div class="breadcrumb">
                    <template v-for="(bc, i) in breadcrumbs" :key="i">
                        <span class="bc-item" :class="{ active: i === breadcrumbs.length - 1 }"
                            @click="onBreadcrumbClick(bc, i)">{{ bc.label }}</span>
                        <span v-if="i < breadcrumbs.length - 1" class="bc-sep">›</span>
                    </template>
                </div>

                <span class="level-badge" :class="`level-${currentLevel}`">{{ LEVEL_LABELS[currentLevel] }}</span>

                <!-- <div class="toolbar-spacer" /> -->

                <!-- Layout toggle — chỉ active ở level route -->
                <div class="layout-toggle" :class="{ 'lt-disabled': currentLevel !== 'route' }">
                    <button v-for="lt in LAYOUT_OPTIONS" :key="lt.value" class="lt-btn"
                        :class="{ active: layoutMode === lt.value }" :disabled="currentLevel !== 'route'"
                        @click="setLayout(lt.value)">
                        <q-icon :name="lt.icon" size="13px" />
                        {{ lt.label }}
                    </button>
                </div>

                <!-- Fit button -->
                <button class="toolbar-btn" @click="fitNetwork" title="Vừa khung">
                    <q-icon name="fit_screen" size="14px" />
                </button>
            </div>

            <div class="network-wrapper">
                <div ref="networkContainer" class="network-canvas" />

                <!-- Pagination bar -->
                <transition name="fade">
                    <div v-if="pagination.visible" class="pagination-bar">
                        <button class="pg-btn" :disabled="pagination.page === 0" @click="gotoPage(pagination.page - 1)">
                            <q-icon name="chevron_left" size="16px" />
                        </button>
                        <span class="pg-info">
                            Trang {{ pagination.page + 1 }} / {{ pagination.totalPages }}
                            &nbsp;·&nbsp;
                            Sợi {{ pagination.page * PAGE_SIZE + 1 }}–{{ Math.min((pagination.page + 1) * PAGE_SIZE,
                                pagination.total) }}
                            / {{ pagination.total }}
                        </span>
                        <button class="pg-btn" :disabled="pagination.page >= pagination.totalPages - 1"
                            @click="gotoPage(pagination.page + 1)">
                            <q-icon name="chevron_right" size="16px" />
                        </button>
                        <button class="pg-btn pg-btn-collapse" @click="collapseCable(pagination.activeCableId)">
                            <q-icon name="compress" size="14px" />
                            Thu gọn
                        </button>
                    </div>
                </transition>

                <!-- Detail side panel -->
                <transition name="slide-panel">
                    <div v-if="selectedNode" class="detail-panel">
                        <button class="panel-close" @click="selectedNode = null">
                            <q-icon name="close" size="16px" />
                        </button>

                        <!-- Node type badge + icon -->
                        <div class="panel-header">
                            <div class="panel-icon-wrap" :class="`icon-${selectedNode.nodeType}`">
                                <q-icon :name="NODE_TYPE_ICONS[selectedNode.nodeType]" size="20px" />
                            </div>
                            <div>
                                <div class="panel-type-badge">{{ NODE_TYPE_LABELS[selectedNode.nodeType] }}</div>
                                <h3 class="panel-title">{{ selectedNode.title }}</h3>
                            </div>
                        </div>

                        <div class="panel-divider" />

                        <!-- Regular rows -->
                        <div class="panel-rows">
                            <template v-for="row in selectedNode.rows" :key="row.k">
                                <!-- SID list section header -->
                                <div v-if="row._type === 'sid-header'" class="sid-section-header">
                                    <q-icon name="cable" size="13px" class="q-mr-xs" />
                                    Dịch vụ đang chạy
                                    <span class="sid-count-badge">{{ row.count }}</span>
                                </div>
                                <!-- SID card -->
                                <div v-else-if="row._type === 'sid-item'" class="sid-card">
                                    <div class="sid-card-top">
                                        <span class="sid-label">{{ row.sid }}</span>
                                    </div>
                                    <div class="sid-card-customer">
                                        <q-icon name="business" size="11px" class="q-mr-xs" style="opacity:.6" />
                                        {{ row.customer }}
                                    </div>
                                    <div v-if="row.address" class="sid-card-addr">
                                        <q-icon name="place" size="11px" class="q-mr-xs" style="opacity:.5" />
                                        {{ row.address }}
                                    </div>
                                </div>
                                <!-- Empty SID notice -->
                                <div v-else-if="row._type === 'sid-empty'" class="sid-empty">
                                    <q-icon name="radio_button_unchecked" size="13px" class="q-mr-xs" />
                                    Không có dịch vụ
                                </div>
                                <!-- Divider row -->
                                <div v-else-if="row._type === 'divider'" class="panel-section-divider" />
                                <!-- Normal key-value row -->
                                <div v-else class="panel-row">
                                    <span class="row-key">{{ row.k }}</span>
                                    <span class="row-val" v-html="row.v" />
                                </div>
                            </template>
                        </div>

                        <div v-if="selectedNode.canExpand" class="expand-hint">
                            <q-icon name="touch_app" size="14px" />
                            Double-click để xem chi tiết hơn
                        </div>
                    </div>
                </transition>

                <!-- Legend -->
                <div class="legend-panel">
                    <div class="legend-section-title">Loại node</div>
                    <div class="legend-item"><q-icon name="apartment" color="amber" size="18px" /><span>Trạm /
                            OLT</span></div>
                    <div class="legend-item"><q-icon name="hub" color="blue" size="18px" /><span>Măng xông</span></div>
                    <div class="legend-item"><q-icon name="call_split" color="red" size="18px" /><span>Điểm rẽ
                        nhánh</span></div>
                    <div class="legend-item"><q-icon name="person" color="grey-4" size="18px" /><span>Khách hàng</span>
                    </div>
                    <div class="legend-item"><q-icon name="cable" color="purple-4" size="18px" /><span>Cáp
                            (cluster)</span></div>
                    <q-separator dark class="q-my-sm" />
                    <div class="legend-section-title">Trạng thái sợi</div>
                    <div class="legend-item">
                        <div class="fiber-line" style="background:#22c55e" /><span>Đang hoạt động</span>
                    </div>
                    <div class="legend-item">
                        <div class="fiber-line" style="background:#ef4444" /><span>Lỗi</span>
                    </div>
                    <div class="legend-item">
                        <div class="fiber-line" style="background:#6b7280" /><span>Không sử dụng</span>
                    </div>
                </div>

                <!-- Fiber stats bar -->
                <transition name="fade">
                    <div v-if="fiberStats" class="fiber-stats-bar">
                        <div class="stat-item stat-active"><q-icon name="check_circle" size="14px" />{{
                            fiberStats.active }} hoạt động</div>
                        <div class="stat-item stat-error"><q-icon name="error" size="14px" />{{ fiberStats.error }} lỗi
                        </div>
                        <div class="stat-item stat-idle"><q-icon name="radio_button_unchecked" size="14px" />{{
                            fiberStats.idle }} rảnh</div>
                        <div class="stat-item stat-total"><q-icon name="grain" size="14px" />{{ fiberStats.total }} tổng
                        </div>
                    </div>
                </transition>

                <!-- Fiber hover tooltip -->
                <transition name="tooltip-fade">
                    <div v-if="fiberTooltip.visible" class="fiber-hover-tooltip"
                        :style="{ left: fiberTooltip.x + 'px', top: fiberTooltip.y + 'px' }">
                        <!-- Header -->
                        <div class="ftt-header">
                            <span class="ftt-num">Sợi {{ fiberTooltip.fiberNum }}</span>
                            <span class="ftt-status" :class="`ftt-status--${fiberTooltip.status}`">
                                {{ { active: 'Hoạt động', error: 'Lỗi', idle: 'Không dùng' }[fiberTooltip.status] }}
                            </span>
                        </div>
                        <div class="ftt-route">
                            {{ fiberTooltip.from }} → {{ fiberTooltip.to }}
                        </div>
                        <div class="ftt-divider" />
                        <!-- SID list -->
                        <div class="ftt-sid-title">
                            Dịch vụ
                            <span v-if="fiberTooltip.listSid.length" class="ftt-sid-count">
                                {{ fiberTooltip.listSid.length }}
                            </span>
                        </div>
                        <template v-if="fiberTooltip.listSid.length">
                            <div v-for="item in fiberTooltip.listSid" :key="item.SID?.value" class="ftt-sid-card">
                                <div class="ftt-sid-label">{{ item.SID?.label || item.SID?.value }}</div>
                                <div class="ftt-sid-customer">{{ item.ten_khach_hang }}</div>
                                <div v-if="item.dia_chi_dich_vu_diem_dau" class="ftt-sid-addr">
                                    {{ item.dia_chi_dich_vu_diem_dau }}
                                </div>
                            </div>
                        </template>
                        <div v-else class="ftt-sid-empty">Không có dịch vụ</div>
                    </div>
                </transition>

                <q-inner-loading :showing="loading" dark color="primary">
                    <q-spinner-cube size="50px" />
                    <div class="q-mt-sm text-grey-4">Đang tải cấu trúc tuyến...</div>
                </q-inner-loading>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue'
import { Network } from 'vis-network'
import { DataSet } from 'vis-data'
import { routingAPI } from '../services/data'

const props = defineProps({
    tuyenId: { type: String, default: '' },
    maTuyen: { type: String, default: '' }
})

// ── Constants ──────────────────────────────
const ICON_FACE = "'Material Icons'"
const FONT_BASE = { color: '#f1f5f9', size: 12, strokeWidth: 2, strokeColor: '#0f172a' }

const PAGE_SIZE = 24
const GRID_COLS = 8
const GRID_COL_GAP = 110
const GRID_ROW_GAP = 80

const LEVEL_LABELS = { route: 'Route', cable: 'Cable', fiber: 'Fiber' }

const LAYOUT_OPTIONS = [
    { value: 'free', label: 'Tự do', icon: 'grain' },
    { value: 'hierarchical', label: 'LR', icon: 'swap_horiz' }
]

const NODE_TYPE_LABELS = {
    station: 'Trạm / OLT',
    closure: 'Măng xông',
    branch: 'Điểm rẽ nhánh',
    customer: 'Khách hàng',
    cable: 'Cáp quang',
    fiber: 'Sợi quang'
}

// Icons cho từng loại node trong panel
const NODE_TYPE_ICONS = {
    station: 'apartment',
    closure: 'hub',
    branch: 'call_split',
    customer: 'person',
    cable: 'cable',
    fiber: 'fiber_manual_record'
}

const FIBER_COLOR = { active: '#22c55e', error: '#ef4444', idle: '#6b7280' }
const FIBER_STATUS_LABEL = { active: 'Đang hoạt động', error: 'Lỗi', idle: 'Không sử dụng' }

// ── State ──────────────────────────────────
const networkContainer = ref(null)
const loading = ref(false)
const currentLevel = ref('route')
const breadcrumbs = ref([])
const selectedNode = ref(null)
const fiberStats = ref(null)
const layoutMode = ref('free')

const pagination = reactive({
    visible: false,
    activeCableId: null,
    page: 0,
    totalPages: 1,
    total: 0
})

// ── Hover tooltip state ────────────────────
const fiberTooltip = reactive({
    visible: false,
    x: 0,
    y: 0,
    fiberNum: '',
    status: 'idle',
    from: '',
    to: '',
    listSid: []
})
let tooltipHideTimer = null

let networkInstance = null
let visNodes = null
let visEdges = null
let cableEdgeMap = {}
let cableFiberIds = {}

// ── Status helpers ─────────────────────────
function getFiberStatus(edge) {
    const sv = edge.customData?.status?.value || edge.customData?.status?.label || ''
    if (sv.includes('Lỗi') || sv.toLowerCase().includes('loi')) return 'error'
    if (sv.includes('Đang hoạt động') || sv.toLowerCase().includes('hoat dong')) return 'active'
    return 'idle'
}

function countStatuses(edges) {
    const c = { active: 0, error: 0, idle: 0, total: edges.length }
    edges.forEach(e => { c[getFiberStatus(e)]++ })
    return c
}

// ── Node type ──────────────────────────────
function getNodeType(rawNode) {
    const t = rawNode.customData?.type || rawNode.customData?.point_type?.value || ''
    if (rawNode.customData?.start_point_route != null) return 'branch'
    if (t.includes('Trạm')) return 'station'
    if (t.includes('Măng xông')) return 'closure'
    if (t.includes('Khách hàng')) return 'customer'
    return 'station'
}

function stationIconConfig(nodeType) {
    if (nodeType === 'station') return { face: ICON_FACE, code: '\uea40', color: '#f59e0b', size: 44 }
    if (nodeType === 'closure') return { face: ICON_FACE, code: '\ue9f4', color: '#3b82f6', size: 36 }
    if (nodeType === 'branch') return { face: ICON_FACE, code: '\ue0b6', color: '#ef4444', size: 38 }
    if (nodeType === 'customer') return { face: ICON_FACE, code: '\ue7fd', color: '#94a3b8', size: 30 }
    return { face: ICON_FACE, code: '\uea40', color: '#f59e0b', size: 44 }
}

// ── Group by cable ─────────────────────────
function groupByCable(rawEdges) {
    const map = {}
    rawEdges.forEach(edge => {
        const cid = edge.customData?.parent_id
        if (!cid) return
        if (!map[cid]) {
            map[cid] = {
                parentId: cid,
                fromNode: edge.customData._cable_start_point,
                toNode: edge.customData._cable_end_point,
                fromText: edge.customData._cable_start_point_text || '',
                toText: edge.customData._cable_end_point_text || '',
                edges: []
            }
        }
        map[cid].edges.push(edge)
    })
    return map
}

// ── Node builders ──────────────────────────
function buildStationNode(rawNode) {
    const nType = getNodeType(rawNode)
    const icon = stationIconConfig(nType)
    return {
        id: rawNode.id, label: rawNode.label || rawNode.id,
        shape: 'icon', icon,
        font: { ...FONT_BASE, vadjust: icon.size === 44 ? 42 : 34 },
        _nodeType: nType, _raw: rawNode
    }
}

function buildCableNode(cableVId, meta, allEdges) {
    const stats = countStatuses(allEdges)
    const hasErr = stats.error > 0
    return {
        id: cableVId,
        label: `${meta.fromText} → ${meta.toText}\n${stats.total} sợi`,
        shape: 'icon',
        icon: { face: ICON_FACE, code: '\ue870', color: hasErr ? '#c084fc' : '#a855f7', size: 30 },
        font: { ...FONT_BASE, size: 11, vadjust: 32 },
        borderWidth: hasErr ? 3 : 1,
        color: { border: hasErr ? '#ef4444' : '#7e22ce' },
        _nodeType: 'cable',
        _meta: { ...meta, stats }
    }
}

function calcGridPositions(cableVId, count) {
    const pos = networkInstance.getPositions([cableVId])[cableVId] || { x: 0, y: 0 }
    const cols = Math.min(GRID_COLS, count)
    const totalW = (cols - 1) * GRID_COL_GAP
    const startX = pos.x - totalW / 2
    const startY = pos.y + 120
    const positions = []
    for (let i = 0; i < count; i++) {
        positions.push({
            x: startX + (i % cols) * GRID_COL_GAP,
            y: startY + Math.floor(i / cols) * GRID_ROW_GAP
        })
    }
    return positions
}

function buildFiberNode(edge, globalIdx, cableVId, pos) {
    const status = getFiberStatus(edge)
    const fiberNum = edge.customData?.cable_number ?? (globalIdx + 1)
    const fiberLabel = `Sợi ${fiberNum}`
    const codes = { active: '\ue5ca', error: '\ue000', idle: '\ue15b' }
    return {
        id: `__fiber__${edge.id}`,
        label: `${fiberLabel}\n${FIBER_STATUS_LABEL[status]}`,
        shape: 'icon',
        icon: { face: ICON_FACE, code: codes[status], color: FIBER_COLOR[status], size: 22 },
        font: { ...FONT_BASE, size: 10, vadjust: 24 },
        physics: false,
        x: pos.x, y: pos.y,
        _nodeType: 'fiber',
        _meta: {
            edgeId: edge.id,
            fiberNum,
            fiberLabel,
            status,
            cableVId,
            from: edge.customData?._cable_start_point_text || '',
            to: edge.customData?._cable_end_point_text || '',
            ghi_chu: edge.customData?.ghi_chu || '',
            total_sid: edge.customData?.total_sid ?? 0,
            list_sid: edge.customData?.list_sid || []
        }
    }
}

function mkEdge(from, to, color = '#334155', width = 1, dashes = false, extraProps = {}) {
    return {
        id: `e_${from}__${to}`,
        from, to,
        color: { color, hover: color },
        width,
        hoverWidth: width + 1.5,
        arrows: { to: { enabled: false } },
        dashes,
        ...extraProps
    }
}

// Tạo HTML tooltip hiển thị khi hover lên edge sợi quang
function buildFiberEdgeTitle(edge, status) {
    const fiberNum = edge.customData?.cable_number ?? '?'
    const listSid = edge.customData?.list_sid || []
    const statusColors = { active: '#22c55e', error: '#ef4444', idle: '#6b7280' }
    const statusLabels = { active: 'Đang hoạt động', error: 'Lỗi', idle: 'Không sử dụng' }
    const color = statusColors[status]
    const label = statusLabels[status]

    let sidHtml = ''
    if (listSid.length > 0) {
        sidHtml = listSid.map(item => `
            <div style="margin-top:6px;padding:5px 7px;background:rgba(255,255,255,.05);border-radius:5px;border-left:2px solid #3b82f6">
                <div style="font-weight:700;color:#60a5fa;font-size:11px;font-family:monospace">${item.SID?.label || '—'}</div>
                <div style="color:#94a3b8;font-size:10px;margin-top:2px">${item.ten_khach_hang || ''}</div>
                ${item.dia_chi_dich_vu_diem_dau ? `<div style="color:#64748b;font-size:10px;margin-top:1px">${item.dia_chi_dich_vu_diem_dau}</div>` : ''}
            </div>`).join('')
    } else {
        sidHtml = `<div style="color:#475569;font-size:10px;margin-top:6px;font-style:italic">Không có dịch vụ</div>`
    }

    return `<div style="
        background:#0f172a;
        border:1px solid #1e293b;
        border-radius:8px;
        padding:10px 12px;
        min-width:180px;
        max-width:240px;
        font-family:system-ui,sans-serif;
        box-shadow:0 8px 24px rgba(0,0,0,.6)">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-weight:700;color:#f1f5f9;font-size:12px">Sợi ${fiberNum}</span>
            <span style="
                font-size:10px;font-weight:600;padding:1px 7px;border-radius:10px;
                background:${color}22;color:${color}">${label}</span>
        </div>
        <div style="font-size:10px;color:#475569;margin-bottom:2px">
            ${edge.customData?._cable_start_point_text || ''} → ${edge.customData?._cable_end_point_text || ''}
        </div>
        <div style="height:1px;background:#1e293b;margin:6px 0"></div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#475569">
            Dịch vụ ${listSid.length > 0 ? `(${listSid.length})` : ''}
        </div>
        ${sidHtml}
    </div>`
}

// ── Route level builder ────────────────────
function buildRouteLevel(rawNodes, rawEdges) {
    const ns = []
    const es = []
    const maTuyenFromData = rawNodes.reduce((found, rn) => {
        return found || rn.customData?.ma_tuyen || rn.customData?.maTuyen || null
    }, null)
    rawNodes.forEach(rn => ns.push(buildStationNode(rn)))
    const cableGroups = groupByCable(rawEdges)
    Object.entries(cableGroups).forEach(([parentId, meta]) => {
        const cableVId = `__cable__${parentId}`
        meta.edges.sort((a, b) => (a.customData?.cable_number || 0) - (b.customData?.cable_number || 0))
        cableEdgeMap[cableVId] = meta.edges
        ns.push(buildCableNode(cableVId, meta, meta.edges))
        es.push(mkEdge(meta.fromNode, cableVId, '#334155', 1, true))
        es.push(mkEdge(cableVId, meta.toNode, '#334155', 1, true))
    })
    return { ns, es, maTuyenFromData }
}

// ── Clear fiber của 1 cable ────────────────
function clearFibersOfCable(cableVId) {
    const ids = cableFiberIds[cableVId]
    if (!ids?.size) return
    visNodes.remove([...ids])
    visEdges.remove([...ids].map(nid => `e_${cableVId}__${nid}`))
    ids.clear()
}

// ── Render 1 trang fiber ───────────────────
function renderFiberPage(cableVId, page) {
    clearFibersOfCable(cableVId)
    if (!cableFiberIds[cableVId]) cableFiberIds[cableVId] = new Set()

    const allEdges = cableEdgeMap[cableVId] || []
    const slice = allEdges.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    const positions = calcGridPositions(cableVId, slice.length)

    const newNodes = []
    const newEdges = []
    slice.forEach((edge, idx) => {
        const globalIdx = page * PAGE_SIZE + idx
        const fNode = buildFiberNode(edge, globalIdx, cableVId, positions[idx])
        const fStatus = getFiberStatus(edge)
        newNodes.push(fNode)
        newEdges.push(mkEdge(
            cableVId, fNode.id,
            FIBER_COLOR[fStatus], 1.2, false,
            {
                title: buildFiberEdgeTitle(edge, fStatus),
                _fiberNodeId: fNode.id
            }
        ))
        cableFiberIds[cableVId].add(fNode.id)
    })

    visNodes.add(newNodes)
    visEdges.add(newEdges)

    const total = allEdges.length
    pagination.visible = true
    pagination.activeCableId = cableVId
    pagination.page = page
    pagination.totalPages = Math.ceil(total / PAGE_SIZE)
    pagination.total = total

    setTimeout(() => {
        networkInstance?.fit({ nodes: [cableVId, ...[...cableFiberIds[cableVId]]], animation: { duration: 400 } })
    }, 80)
}

function gotoPage(page) {
    if (!pagination.activeCableId) return
    renderFiberPage(pagination.activeCableId, page)
    refreshFiberStats()
}

function collapseCable(cableVId) {
    if (!cableVId) return
    clearFibersOfCable(cableVId)
    delete cableFiberIds[cableVId]
    pagination.visible = false
    pagination.activeCableId = null
    currentLevel.value = 'route'
    fiberStats.value = null
    selectedNode.value = null
    breadcrumbs.value = breadcrumbs.value.slice(0, 1)
    setTimeout(() => networkInstance?.fit({ animation: true }), 100)
}

// ── Badge helpers ──────────────────────────
function statBadge(status, label) {
    const cls = { active: 'badge-active', error: 'badge-error', idle: 'badge-idle' }[status] || 'badge-idle'
    return `<span class="stat-badge ${cls}">${label}</span>`
}

// ── Panel: Station / Closure / Customer ───
function showStation(node) {
    const d = node._raw?.customData || {}
    const type = getNodeType(node._raw || {})

    // Thông tin chung
    const rows = [
        { k: 'Mã điểm', v: d.ma_diem || node.id },
        { k: 'Tên điểm', v: d.ten_diem || node.label || '' },
    ]

    if (d.dia_chi) rows.push({ k: 'Địa chỉ', v: d.dia_chi })
    if (d.ngay_van_hanh) rows.push({ k: 'Ngày vận hành', v: d.ngay_van_hanh })
    if (d.ghi_chu) rows.push({ k: 'Ghi chú', v: d.ghi_chu })

    // Thông tin riêng theo loại
    if (type === 'station' && d.station?.label) {
        rows.push({ _type: 'divider' })
        rows.push({ k: 'Tên trạm', v: d.station.label })
        rows.push({ k: 'Mã trạm HTC', v: d.station.value || '' })
    }

    if (type === 'closure') {
        rows.push({ _type: 'divider' })
        rows.push({ k: 'Thứ tự', v: String(d.thu_tu ?? '') })
        if (d.start_point?.label) {
            rows.push({ k: 'Điểm bắt đầu', v: d.start_point.label })
        }
    }

    if (type === 'customer' && d.vi_tri_khach_hang?.label) {
        rows.push({ _type: 'divider' })
        rows.push({ k: 'Tên KH', v: d.vi_tri_khach_hang.label })
        rows.push({ k: 'Mã POP', v: d.vi_tri_khach_hang.value || '' })
    }

    rows.push({ _type: 'divider' })
    rows.push({ k: 'Trạng thái', v: d.is_active ? '<span class="badge-active stat-badge">Hoạt động</span>' : '<span class="badge-idle stat-badge">Không hoạt động</span>' })
    rows.push({ k: 'Cập nhật bởi', v: d.modified_by_fullname || '' })

    selectedNode.value = {
        nodeType: type,
        title: node.label?.split('\n')[0] || node.id,
        canExpand: false,
        rows
    }
}

function showCable(node) {
    const m = node._meta || {}
    const st = m.stats || {}
    const isExpanded = cableFiberIds[node.id]?.size > 0
    selectedNode.value = {
        nodeType: 'cable',
        title: `${m.fromText} → ${m.toText}`,
        canExpand: !isExpanded,
        rows: [
            { k: 'Tổng sợi', v: String(st.total || 0) },
            { k: 'Hoạt động', v: statBadge('active', `${st.active || 0} sợi`) },
            { k: 'Lỗi', v: statBadge('error', `${st.error || 0} sợi`) },
            { k: 'Không dùng', v: statBadge('idle', `${st.idle || 0} sợi`) },
            { _type: 'divider' },
            { k: 'Điểm đầu', v: m.fromText || '' },
            { k: 'Điểm cuối', v: m.toText || '' }
        ]
    }
}

// ── Panel: Fiber (với list_sid) ────────────
function showFiber(node) {
    const m = node._meta || {}
    const listSid = m.list_sid || []

    const rows = [
        { k: 'Trạng thái', v: statBadge(m.status, FIBER_STATUS_LABEL[m.status]) },
        { k: 'Số sợi', v: String(m.fiberNum) },
        { k: 'Điểm đầu', v: m.from || '' },
        { k: 'Điểm cuối', v: m.to || '' },
    ]

    if (m.ghi_chu) rows.push({ k: 'Ghi chú', v: m.ghi_chu })

    // Divider + SID section
    rows.push({ _type: 'divider' })
    rows.push({ _type: 'sid-header', k: 'sid-header', count: listSid.length })

    if (listSid.length === 0) {
        rows.push({ _type: 'sid-empty', k: 'sid-empty' })
    } else {
        listSid.forEach(item => {
            rows.push({
                _type: 'sid-item',
                k: `sid-${item.SID?.value}`,
                sid: item.SID?.label || item.SID?.value || '—',
                customer: item.ten_khach_hang || '',
                address: item.dia_chi_dich_vu_diem_dau || ''
            })
        })
    }

    selectedNode.value = {
        nodeType: 'fiber',
        title: m.fiberLabel || `Sợi ${m.fiberNum}`,
        canExpand: false,
        rows
    }
}

// ── Breadcrumb ─────────────────────────────
function resetBreadcrumb(labelFromData) {
    breadcrumbs.value = [{ label: labelFromData || props.maTuyen || props.tuyenId || 'Tuyến', level: 'route' }]
}
function onBreadcrumbClick(bc, idx) {
    if (idx === breadcrumbs.value.length - 1) return
    if (bc.level === 'route') loadDiagramData()
}

function refreshFiberStats() {
    const cableVId = pagination.activeCableId
    if (!cableVId) { fiberStats.value = null; return }
    const allEdges = cableEdgeMap[cableVId] || []
    fiberStats.value = allEdges.length ? countStatuses(allEdges) : null
}

// ── Network options ────────────────────────
function getNetworkOptions(mode) {
    const base = {
        nodes: { physics: true },
        edges: { font: { color: '#f1f5f9', size: 10, strokeWidth: 1, strokeColor: '#0f172a' } },
        interaction: {
            hover: true, zoomView: true, dragNodes: true, dragView: true,
            navigationButtons: true, keyboard: true, tooltipDelay: 100
        }
    }

    if (mode === 'hierarchical') {
        return {
            ...base,
            layout: {
                hierarchical: {
                    enabled: true,
                    direction: 'LR',
                    sortMethod: 'directed',
                    nodeSpacing: 200,
                    levelSeparation: 300,
                    treeSpacing: 220
                }
            },
            physics: { enabled: false }
        }
    }

    // free (force-directed)
    return {
        ...base,
        layout: { hierarchical: { enabled: false } },
        physics: {
            enabled: true,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
                gravitationalConstant: -180,
                springLength: 160,
                springConstant: 0.05,
                damping: 0.6,
                avoidOverlap: 1
            },
            stabilization: { iterations: 200 }
        }
    }
}

// ── Layout switch (chỉ áp dụng ở level route) ──
function setLayout(mode) {
    if (layoutMode.value === mode || !networkInstance) return
    // Khi đang xem fiber, không cho đổi layout (tránh vỡ grid)
    if (currentLevel.value !== 'route') return
    layoutMode.value = mode
    networkInstance.setOptions(getNetworkOptions(mode))
    if (mode === 'hierarchical') {
        // hierarchical không cần stabilize, fit luôn
        setTimeout(() => networkInstance?.fit({ animation: true }), 200)
    } else {
        networkInstance.setOptions({ physics: { enabled: true } })
        if (layoutMode.value === 'hierarchical') {
            setTimeout(() => networkInstance?.fit({ animation: true }), 300)
        } else {
            networkInstance.once('stabilizationIterationsDone', () => {
                networkInstance.setOptions({ physics: { enabled: false } })
                networkInstance.fit({ animation: true })
            })
        }
        networkInstance.startSimulation()
    }
}

function fitNetwork() {
    networkInstance?.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } })
}

// ── Events ─────────────────────────────────
function setupEvents() {
    networkInstance.on('doubleClick', params => {
        if (!params.nodes.length) return
        const node = visNodes.get(params.nodes[0])
        if (!node) return
        if (node._nodeType === 'cable') {
            if (cableFiberIds[node.id]?.size > 0) {
                collapseCable(node.id)
            } else {
                networkInstance.setOptions({ physics: { enabled: false } })
                currentLevel.value = 'fiber'
                breadcrumbs.value = [
                    breadcrumbs.value[0],
                    { label: `${node._meta?.fromText} → ${node._meta?.toText}`, level: 'cable', id: node.id }
                ]
                renderFiberPage(node.id, 0)
                refreshFiberStats()
            }
        }
    })

    networkInstance.on('click', params => {
        // Click trúng node
        if (params.nodes.length) {
            const node = visNodes.get(params.nodes[0])
            if (!node) return
            if (['station', 'closure', 'customer'].includes(node._nodeType)) showStation(node)
            else if (node._nodeType === 'cable') showCable(node)
            else if (node._nodeType === 'fiber') showFiber(node)
            return
        }
        // Click trúng edge (sợi quang) — lấy fiber node tương ứng
        if (params.edges.length) {
            const edge = visEdges.get(params.edges[0])
            if (edge?._fiberNodeId) {
                const fNode = visNodes.get(edge._fiberNodeId)
                if (fNode?._nodeType === 'fiber') { showFiber(fNode); return }
            }
        }
        // Click vào vùng trống
        selectedNode.value = null
    })

    networkInstance.on('hoverNode', () => { document.body.style.cursor = 'pointer' })

    networkInstance.on('hoverEdge', params => {
        const edge = visEdges.get(params.edge)
        if (!edge?._fiberNodeId) {
            document.body.style.cursor = 'alias'
            return
        }
        document.body.style.cursor = 'pointer'
        // Lấy dữ liệu fiber từ node tương ứng
        const fNode = visNodes.get(edge._fiberNodeId)
        if (!fNode?._meta) return
        const m = fNode._meta
        if (tooltipHideTimer) { clearTimeout(tooltipHideTimer); tooltipHideTimer = null }
        fiberTooltip.fiberNum = m.fiberNum
        fiberTooltip.status = m.status
        fiberTooltip.from = m.from
        fiberTooltip.to = m.to
        fiberTooltip.listSid = m.list_sid || []
        fiberTooltip.visible = true
    })

    networkInstance.on('blurEdge', () => {
        document.body.style.cursor = 'default'
        // Delay ẩn để tránh flicker khi di chuyển chuột chậm
        tooltipHideTimer = setTimeout(() => { fiberTooltip.visible = false }, 120)
    })

    networkInstance.on('blurNode', () => { document.body.style.cursor = 'default' })

    // Theo dõi vị trí chuột để đặt tooltip đúng chỗ
    networkContainer.value.addEventListener('mousemove', e => {
        if (!fiberTooltip.visible) return
        const rect = networkContainer.value.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        // Tooltip bên phải con trỏ, lật sang trái nếu gần mép phải
        const tw = 240
        fiberTooltip.x = (x + tw + 16 > rect.width) ? x - tw - 8 : x + 16
        fiberTooltip.y = y - 10
    })
}

// ── Main load ──────────────────────────────
const loadDiagramData = async () => {
    const apiParams = {}
    if (props.tuyenId?.trim()) apiParams.tuyen_id = props.tuyenId
    else if (props.maTuyen?.trim()) apiParams.ma_tuyen = props.maTuyen
    else return

    loading.value = true
    selectedNode.value = null
    fiberStats.value = null
    pagination.visible = false
    pagination.activeCableId = null
    cableEdgeMap = {}
    cableFiberIds = {}

    try {
        await document.fonts.load('12px "Material Icons"')
        const response = await routingAPI.getCableDiagram(apiParams)
        const apiResponse = response.data
        if (!apiResponse?.success || !apiResponse?.data) {
            console.error('[FiberDiagram] Dữ liệu không đúng cấu trúc')
            return
        }
        const { ns, es, maTuyenFromData } = buildRouteLevel(apiResponse.data.nodes || [], apiResponse.data.edges || [])
        visNodes = new DataSet(ns)
        visEdges = new DataSet(es)
        if (networkInstance) { networkInstance.destroy(); networkInstance = null }
        networkInstance = new Network(networkContainer.value, { nodes: visNodes, edges: visEdges }, getNetworkOptions(layoutMode.value))
        setupEvents()
        currentLevel.value = 'route'
        resetBreadcrumb(maTuyenFromData)
        networkInstance.once('stabilizationIterationsDone', () => {
            networkInstance.setOptions({ physics: { enabled: false } })
            networkInstance.fit({ animation: true })
        })
    } catch (err) {
        console.error('[FiberDiagram] Lỗi tải sơ đồ:', err)
    } finally {
        loading.value = false
    }
}

watch([() => props.tuyenId, () => props.maTuyen], () => { loadDiagramData() })
onMounted(() => { loadDiagramData() })
onBeforeUnmount(() => {
    if (tooltipHideTimer) clearTimeout(tooltipHideTimer)
    if (networkInstance) { networkInstance.destroy(); networkInstance = null }
})
</script>

<style scoped>
.network-component-wrapper {
    width: 100%;
    height: 100%;
    padding: 4px;
    background: #0f172a;
}

.network-card {
    background: rgba(30, 41, 59, 0.4);
    border: 1px solid #1e293b;
    border-radius: 16px;
    overflow: hidden;
    width: 100%;
    display: flex;
    flex-direction: column;
}

/* Toolbar */
.toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 14px;
    background: #0f172a;
    border-bottom: 1px solid #1e293b;
    flex-shrink: 0;
    flex-wrap: wrap;
}

.breadcrumb {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    font-size: 12px;
    flex-wrap: wrap;
}

.bc-item {
    color: #94a3b8;
    cursor: pointer;
    padding: 3px 8px;
    border-radius: 6px;
    transition: background 0.15s;
}

.bc-item:hover {
    background: #1e293b;
}

.bc-item.active {
    color: #f1f5f9;
    font-weight: 600;
    cursor: default;
}

.bc-sep {
    color: #334155;
}

.toolbar-spacer {
    flex: 1;
    min-width: 8px;
}

/* Layout toggle */
.layout-toggle {
    display: flex;
    align-items: center;
    background: #0a1020;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 2px;
    gap: 2px;
    transition: opacity .2s;
}

.layout-toggle.lt-disabled {
    opacity: .4;
    pointer-events: none;
}

.lt-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    color: #475569;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 9px;
    border-radius: 6px;
    cursor: pointer;
    transition: background .15s, color .15s;
    white-space: nowrap;
}

.lt-btn:hover:not(:disabled) {
    color: #94a3b8;
    background: #1e293b;
}

.lt-btn.active {
    background: #1e3a5f;
    color: #60a5fa;
}

.lt-btn:disabled {
    cursor: not-allowed;
}

/* Fit button */
.toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1e293b;
    border: 1px solid #334155;
    color: #64748b;
    border-radius: 8px;
    padding: 5px 7px;
    cursor: pointer;
    transition: background .15s, color .15s;
    flex-shrink: 0;
}

.toolbar-btn:hover {
    background: #334155;
    color: #94a3b8;
}

.level-badge {
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 20px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}

.level-route {
    background: #1e3a5f;
    color: #60a5fa;
}

.level-cable {
    background: #2d1b6e;
    color: #c084fc;
}

.level-fiber {
    background: #14532d;
    color: #4ade80;
}

/* Canvas */
.network-wrapper {
    position: relative;
    width: 100%;
    height: 88vh;
    min-height: 460px;
}

.network-canvas {
    width: 100%;
    height: 100%;
}

/* Pagination bar */
.pagination-bar {
    position: absolute;
    bottom: 14px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(10, 18, 35, .95);
    border: 1px solid #1e293b;
    border-radius: 24px;
    padding: 6px 12px;
    backdrop-filter: blur(10px);
    z-index: 15;
    box-shadow: 0 4px 24px rgba(0, 0, 0, .5);
}

.pg-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #1e293b;
    border: 1px solid #334155;
    color: #94a3b8;
    border-radius: 8px;
    padding: 4px 10px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    transition: background .15s, color .15s;
}

.pg-btn:hover:not(:disabled) {
    background: #334155;
    color: #f1f5f9;
}

.pg-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

.pg-btn-collapse {
    color: #f87171;
    border-color: #450a0a;
    background: #1c0a0a;
}

.pg-btn-collapse:hover:not(:disabled) {
    background: #450a0a;
    color: #fca5a5;
}

.pg-info {
    font-size: 11px;
    color: #94a3b8;
    padding: 0 6px;
    white-space: nowrap;
}

/* ── Detail panel ── */
.detail-panel {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 260px;
    background: rgba(8, 15, 30, .98);
    border-left: 1px solid #1e293b;
    padding: 14px 14px 20px;
    overflow-y: auto;
    z-index: 20;
    backdrop-filter: blur(8px);
    scrollbar-width: thin;
    scrollbar-color: #1e293b transparent;
}

.detail-panel::-webkit-scrollbar {
    width: 4px;
}

.detail-panel::-webkit-scrollbar-thumb {
    background: #1e293b;
    border-radius: 4px;
}

.slide-panel-enter-active,
.slide-panel-leave-active {
    transition: transform .25s cubic-bezier(.4, 0, .2, 1);
}

.slide-panel-enter-from,
.slide-panel-leave-to {
    transform: translateX(100%);
}

.panel-close {
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    color: #475569;
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    transition: background .15s, color .15s;
}

.panel-close:hover {
    background: #1e293b;
    color: #94a3b8;
}

/* Panel header with icon */
.panel-header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 10px;
    padding-right: 24px;
}

.panel-icon-wrap {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
}

.icon-station {
    background: rgba(245, 158, 11, .15);
    color: #f59e0b;
}

.icon-closure {
    background: rgba(59, 130, 246, .15);
    color: #3b82f6;
}

.icon-customer {
    background: rgba(148, 163, 184, .12);
    color: #94a3b8;
}

.icon-cable {
    background: rgba(168, 85, 247, .15);
    color: #a855f7;
}

.icon-fiber {
    background: rgba(34, 197, 94, .12);
    color: #22c55e;
}

.panel-type-badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .6px;
    padding: 2px 8px;
    border-radius: 10px;
    margin-bottom: 4px;
    background: #1e293b;
    color: #64748b;
}

.panel-title {
    font-size: 13px;
    font-weight: 600;
    color: #f1f5f9;
    margin: 0;
    line-height: 1.3;
}

.panel-divider {
    height: 1px;
    background: #1e293b;
    margin: 10px 0;
}

.panel-section-divider {
    height: 1px;
    background: #1e293b;
    margin: 8px 0;
}

.panel-rows {
    display: flex;
    flex-direction: column;
    gap: 7px;
}

.panel-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    font-size: 12px;
}

.row-key {
    color: #64748b;
    flex-shrink: 0;
}

.row-val {
    color: #e2e8f0;
    text-align: right;
    font-weight: 500;
    word-break: break-word;
}

.expand-hint {
    margin-top: 14px;
    padding: 8px 10px;
    background: #1e293b;
    border-radius: 8px;
    font-size: 11px;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 6px;
}

/* ── SID section ── */
.sid-section-header {
    display: flex;
    align-items: center;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .5px;
    color: #475569;
    margin-bottom: 4px;
}

.sid-count-badge {
    margin-left: auto;
    background: #1e293b;
    color: #64748b;
    border-radius: 10px;
    padding: 1px 8px;
    font-size: 11px;
    font-weight: 700;
}

.sid-card {
    background: #0f1a2e;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: border-color .15s;
}

.sid-card:hover {
    border-color: #334155;
}

.sid-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.sid-label {
    font-size: 12px;
    font-weight: 700;
    color: #60a5fa;
    font-family: 'Courier New', monospace;
    letter-spacing: .3px;
}

.sid-card-customer {
    font-size: 11px;
    color: #94a3b8;
    display: flex;
    align-items: flex-start;
    line-height: 1.4;
}

.sid-card-addr {
    font-size: 10px;
    color: #64748b;
    display: flex;
    align-items: flex-start;
    line-height: 1.4;
}

.sid-empty {
    display: flex;
    align-items: center;
    font-size: 11px;
    color: #334155;
    padding: 6px 0;
    font-style: italic;
}

/* Badge styles (dùng trong v-html) */
:deep(.stat-badge) {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
}

:deep(.badge-active) {
    background: #14532d;
    color: #4ade80;
}

:deep(.badge-error) {
    background: #450a0a;
    color: #f87171;
}

:deep(.badge-idle) {
    background: #1c1917;
    color: #78716c;
}

/* Legend */
.legend-panel {
    position: absolute;
    left: 14px;
    bottom: 14px;
    z-index: 10;
    background: rgba(10, 18, 35, .92);
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 12px 14px;
    backdrop-filter: blur(8px);
}

.legend-section-title {
    font-size: 10px;
    font-weight: 700;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: .8px;
    margin-bottom: 8px;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: #94a3b8;
    margin-bottom: 6px;
}

.fiber-line {
    width: 20px;
    height: 2px;
    border-radius: 1px;
    flex-shrink: 0;
}

/* Fiber stats bar */
.fiber-stats-bar {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
    background: rgba(10, 18, 35, .92);
    border: 1px solid #1e293b;
    border-radius: 20px;
    padding: 6px 14px;
    backdrop-filter: blur(8px);
    z-index: 10;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity .25s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
}

.stat-active {
    color: #4ade80;
}

.stat-error {
    color: #f87171;
}

.stat-idle {
    color: #6b7280;
}

.stat-total {
    color: #94a3b8;
}

/* ── Fiber hover tooltip ── */
.fiber-hover-tooltip {
    position: absolute;
    z-index: 50;
    pointer-events: none;
    width: 230px;
    background: #0b1628;
    border: 1px solid #2a3a52;
    border-radius: 10px;
    padding: 10px 12px 11px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, .7), 0 0 0 1px rgba(96, 165, 250, .08);
}

.tooltip-fade-enter-active {
    transition: opacity .1s ease, transform .1s ease;
}

.tooltip-fade-leave-active {
    transition: opacity .08s ease;
}

.tooltip-fade-enter-from {
    opacity: 0;
    transform: translateY(4px);
}

.tooltip-fade-leave-to {
    opacity: 0;
}

.ftt-header {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 3px;
}

.ftt-num {
    font-size: 13px;
    font-weight: 700;
    color: #f1f5f9;
}

.ftt-status {
    font-size: 10px;
    font-weight: 600;
    padding: 1px 7px;
    border-radius: 10px;
}

.ftt-status--active {
    background: #14532d;
    color: #4ade80;
}

.ftt-status--error {
    background: #450a0a;
    color: #f87171;
}

.ftt-status--idle {
    background: #1c1917;
    color: #78716c;
}

.ftt-route {
    font-size: 10px;
    color: #475569;
    margin-bottom: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ftt-divider {
    height: 1px;
    background: #1e293b;
    margin: 7px 0;
}

.ftt-sid-title {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .5px;
    color: #475569;
    margin-bottom: 5px;
}

.ftt-sid-count {
    background: #1e293b;
    color: #64748b;
    border-radius: 8px;
    padding: 0 6px;
    font-size: 10px;
    font-weight: 700;
}

.ftt-sid-card {
    background: #111c2e;
    border: 1px solid #1e293b;
    border-radius: 6px;
    padding: 5px 8px;
    margin-bottom: 4px;
}

.ftt-sid-card:last-child {
    margin-bottom: 0;
}

.ftt-sid-label {
    font-size: 11px;
    font-weight: 700;
    color: #60a5fa;
    font-family: 'Courier New', monospace;
    letter-spacing: .3px;
}

.ftt-sid-customer {
    font-size: 10px;
    color: #94a3b8;
    margin-top: 2px;
    line-height: 1.3;
}

.ftt-sid-addr {
    font-size: 9px;
    color: #64748b;
    margin-top: 1px;
    line-height: 1.3;
}

.ftt-sid-empty {
    font-size: 10px;
    color: #334155;
    font-style: italic;
}

/* ── vis-network tooltip override (non-scoped) ── */
/* Phần này cần đặt trong global style hoặc dùng :deep nếu component scoped */
</style>

<style>
/* Override vis-network default tooltip — cần global (không scoped) */
.vis-tooltip {
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    font-family: system-ui, sans-serif !important;
    pointer-events: none;
}
</style>