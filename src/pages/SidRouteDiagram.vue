<template>
    <div class="sid-diagram-wrapper">
        <div class="sid-card">

            <!-- ── HEADER ─────────────────────────────── -->
            <div class="sid-header">
                <div class="header-left">
                    <div class="sid-chip">
                        <q-icon name="lan" size="16px" />
                        <span class="sid-code">{{ currentSid }}</span>
                    </div>
                    <div class="sid-customer" v-if="customerName">
                        <q-icon name="business" size="13px" class="q-mr-xs" />
                        {{ customerName }}
                    </div>
                </div>

                <!-- Route pills -->
                <div class="route-pills" v-if="routeSummary && routeSummary.routeCodes.length">
                    <q-icon name="route" size="13px" color="grey-6" />
                    <div v-for="rc in routeSummary.routeCodes" :key="rc" class="rpill"
                        :style="{ background: routeColor(rc) + '22', borderColor: routeColor(rc), color: routeColor(rc) }">
                        {{ rc }}
                    </div>
                </div>

                <div class="header-stats" v-if="routeSummary">
                    <div class="hstat">
                        <span class="hstat-val">{{ routeSummary.segments }}</span>
                        <span class="hstat-lbl">đoạn cáp</span>
                    </div>
                    <div class="hstat-div" />
                    <div class="hstat">
                        <span class="hstat-val">{{ routeSummary.totalLength }} km</span>
                        <span class="hstat-lbl">chiều dài</span>
                    </div>
                    <div class="hstat-div" />
                    <div class="hstat">
                        <span class="hstat-val text-green">{{ routeSummary.activeSegments }}</span>
                        <span class="hstat-lbl">hoạt động</span>
                    </div>
                    <div class="hstat-div" />
                    <div class="hstat">
                        <span class="hstat-val text-red">{{ routeSummary.errorSegments }}</span>
                        <span class="hstat-lbl">lỗi</span>
                    </div>
                </div>

                <div class="header-right">
                    <!-- Layout toggle -->
                    <div class="layout-toggle">
                        <button v-for="m in LAYOUT_MODES" :key="m.val" class="lt-btn"
                            :class="{ 'lt-btn--active': layoutMode === m.val }" @click="setLayout(m.val)"
                            :title="m.title">{{ m.label }}</button>
                    </div>
                    <q-btn flat dense icon="fit_screen" color="grey-5" size="sm" @click="fitNetwork"
                        title="Fit to screen" />
                    <q-btn flat dense icon="refresh" color="grey-5" size="sm" @click="loadData" title="Reload" />
                </div>
            </div>

            <!-- ── CANVAS ─────────────────────────────── -->
            <div class="canvas-wrapper">
                <div ref="networkContainer" class="network-canvas" />

                <!-- Legend -->
                <div class="sid-path-legend">
                    <div class="leg-title">Chú thích</div>
                    <template v-if="routeSummary && routeSummary.routeCodes.length">
                        <div class="leg-sub">Tuyến</div>
                        <div v-for="rc in routeSummary.routeCodes" :key="rc" class="leg-row">
                            <div class="leg-line" :style="{ background: routeColor(rc) }" />
                            <span>{{ rc }}</span>
                        </div>
                        <q-separator dark class="q-my-sm" />
                    </template>
                    <div class="leg-sub">Trạng thái sợi</div>
                    <div class="leg-row">
                        <div class="leg-dot" style="background:#22c55e" /><span>Hoạt động</span>
                    </div>
                    <div class="leg-row">
                        <div class="leg-dot" style="background:#ef4444" /><span>Lỗi</span>
                    </div>
                    <div class="leg-row">
                        <div class="leg-dot" style="background:#6b7280" /><span>Không dùng</span>
                    </div>
                    <q-separator dark class="q-my-sm" />
                    <div class="leg-sub">Loại điểm</div>
                    <div class="leg-row"><q-icon name="apartment" color="amber" size="15px" /><span>Trạm</span></div>
                    <div class="leg-row"><q-icon name="hub" color="blue" size="15px" /><span>Măng xông</span></div>
                    <div class="leg-row"><q-icon name="person" color="grey-4" size="15px" /><span>Khách hàng</span>
                    </div>
                    <q-separator dark class="q-my-sm" />
                    <div class="leg-row">
                        <div class="leg-line" style="background:#f59e0b;height:3px" /><span>Sợi SID này</span>
                    </div>
                    <div class="leg-row">
                        <div class="leg-line leg-dashed" /><span>Sợi khác</span>
                    </div>
                </div>

                <!-- ── DETAIL PANEL ── -->
                <transition name="slide-panel">
                    <div v-if="selectedItem" class="detail-panel">
                        <div class="dp-topbar">
                            <div class="dp-badge" :class="`dpb-${selectedItem.kind}`">
                                {{ selectedItem.kind === 'node' ? 'Điểm mạng' : 'Đoạn cáp' }}
                            </div>
                            <button class="panel-close" @click="selectedItem = null">
                                <q-icon name="close" size="15px" />
                            </button>
                        </div>

                        <div class="dp-title">{{ selectedItem.title }}</div>

                        <div v-if="selectedItem.maTuyen" class="dp-route-badge"
                            :style="{ background: routeColor(selectedItem.maTuyen) + '22', borderColor: routeColor(selectedItem.maTuyen) }">
                            <q-icon name="route" size="12px" :style="{ color: routeColor(selectedItem.maTuyen) }" />
                            <span :style="{ color: routeColor(selectedItem.maTuyen) }">Tuyến {{ selectedItem.maTuyen
                                }}</span>
                        </div>

                        <q-separator dark class="q-my-sm" />

                        <!-- NODE DETAIL -->
                        <template v-if="selectedItem.kind === 'node'">
                            <div class="dp-section">Thông tin điểm</div>
                            <div class="dp-row">
                                <span class="dp-key">Mã điểm</span>
                                <span class="dp-val">{{ selectedItem.maDiem }}</span>
                            </div>
                            <div class="dp-row">
                                <span class="dp-key">Loại</span>
                                <span class="dp-val">{{ selectedItem.loai }}</span>
                            </div>
                            <div class="dp-row" v-if="selectedItem.diaChi">
                                <span class="dp-key">Địa chỉ</span>
                                <span class="dp-val">{{ selectedItem.diaChi }}</span>
                            </div>
                            <div class="dp-row" v-if="selectedItem.ngayVanHanh">
                                <span class="dp-key">Ngày VH</span>
                                <span class="dp-val">{{ selectedItem.ngayVanHanh }}</span>
                            </div>

                            <template v-if="selectedItem.routes && selectedItem.routes.length">
                                <q-separator dark class="q-my-sm" />
                                <div class="dp-section">Tuyến đi qua ({{ selectedItem.routes.length }})</div>
                                <div v-for="rc in selectedItem.routes" :key="rc" class="node-route-row">
                                    <div class="node-route-pill"
                                        :style="{ background: routeColor(rc) + '22', borderColor: routeColor(rc), color: routeColor(rc) }">
                                        <q-icon name="route" size="11px" />{{ rc }}
                                    </div>
                                </div>
                            </template>

                            <template v-if="selectedItem.edges && selectedItem.edges.length">
                                <q-separator dark class="q-my-sm" />
                                <div class="dp-section">Đoạn cáp kết nối ({{ selectedItem.edges.length }})</div>
                                <div v-for="eg in selectedItem.edges" :key="eg.code" class="node-edge-row"
                                    :style="{ borderLeftColor: routeColor(eg.maTuyen) }">
                                    <div class="ned-name">{{ eg.fromText }} → {{ eg.toText }}</div>
                                    <div class="ned-meta">
                                        <span>{{ eg.totalCable }} sợi</span>
                                        <span class="ned-dot" />
                                        <span>{{ eg.length }} km</span>
                                        <span class="ned-dot" />
                                        <span :style="{ color: routeColor(eg.maTuyen) }">{{ eg.maTuyen }}</span>
                                    </div>
                                    <div class="mini-bar">
                                        <div class="mini-seg used"
                                            :style="{ width: pct(eg.usedCable, eg.totalCable) }" />
                                        <div class="mini-seg error"
                                            :style="{ width: pct(eg.errorCable, eg.totalCable) }" />
                                        <div class="mini-seg free"
                                            :style="{ width: pct(eg.availCable, eg.totalCable) }" />
                                    </div>
                                </div>
                            </template>
                        </template>

                        <!-- EDGE DETAIL -->
                        <template v-if="selectedItem.kind === 'edge'">
                            <div class="dp-section">Thông tin đoạn cáp</div>
                            <div class="dp-row">
                                <span class="dp-key">Đoạn</span>
                                <span class="dp-val">{{ selectedItem.fromText }} → {{ selectedItem.toText }}</span>
                            </div>
                            <div class="dp-row">
                                <span class="dp-key">Loại cáp</span>
                                <span class="dp-val">{{ selectedItem.cableType }} sợi</span>
                            </div>
                            <div class="dp-row">
                                <span class="dp-key">Chiều dài</span>
                                <span class="dp-val">{{ selectedItem.length }} km</span>
                            </div>

                            <q-separator dark class="q-my-sm" />
                            <div class="dp-section">Tình trạng sợi ({{ selectedItem.totalCable }} sợi)</div>
                            <div class="fiber-bar">
                                <div class="fiber-bar-seg used"
                                    :style="{ width: pct(selectedItem.usedCable, selectedItem.totalCable) }" />
                                <div class="fiber-bar-seg error"
                                    :style="{ width: pct(selectedItem.errorCable, selectedItem.totalCable) }" />
                                <div class="fiber-bar-seg free"
                                    :style="{ width: pct(selectedItem.availCable, selectedItem.totalCable) }" />
                            </div>
                            <div class="fiber-bar-labels">
                                <span class="fbl used">{{ selectedItem.usedCable }} dùng</span>
                                <span class="fbl error">{{ selectedItem.errorCable }} lỗi</span>
                                <span class="fbl free">{{ selectedItem.availCable }} rảnh</span>
                                <span class="fbl total">/ {{ selectedItem.totalCable }} tổng</span>
                            </div>

                            <q-separator dark class="q-my-sm" />
                            <div class="dp-section">Chi tiết từng sợi</div>
                            <div class="fiber-grid">
                                <div v-for="f in selectedItem.fibers" :key="f.num" class="fc"
                                    :class="{ 'fc-active': f.status === 'active', 'fc-error': f.status === 'error', 'fc-idle': f.status === 'idle', 'fc-sid': f.isSid }"
                                    :title="`Sợi ${f.num} — ${STATUS_LABEL[f.status]}${f.isSid ? ' ★ SID này' : ''}${f.sidList.length ? '\n' + f.sidList.join(', ') : ''}`">
                                    <span class="fc-num">{{ f.num }}</span>
                                    <q-icon v-if="f.isSid" name="star" size="8px" class="fc-star" />
                                </div>
                            </div>
                            <div class="fiber-legend">
                                <span class="fcl-active">■ Hoạt động</span>
                                <span class="fcl-error">■ Lỗi</span>
                                <span class="fcl-idle">■ Rảnh</span>
                                <span class="fcl-sid">★ SID này</span>
                            </div>

                            <template v-if="selectedItem.sidList && selectedItem.sidList.length">
                                <q-separator dark class="q-my-sm" />
                                <div class="dp-section">SID qua đoạn này ({{ selectedItem.sidList.length }})</div>
                                <div v-for="s in selectedItem.sidList" :key="s.sid" class="sid-row"
                                    :class="{ 'sid-row--active': s.sid === currentSid }">
                                    <q-icon name="fiber_manual_record" size="9px"
                                        :style="{ color: s.sid === currentSid ? '#f59e0b' : '#475569' }" />
                                    <div class="sid-row-body">
                                        <span class="sid-row-code">{{ s.sid }}</span>
                                        <span class="sid-row-kh">{{ s.customer }}</span>
                                    </div>
                                    <span v-if="s.sid === currentSid" class="sid-me-tag">Tôi</span>
                                </div>
                            </template>
                        </template>
                    </div>
                </transition>

                <q-inner-loading :showing="loading" dark color="primary">
                    <q-spinner-cube size="50px" />
                    <div class="q-mt-sm text-grey-4">Đang tải sơ đồ SID...</div>
                </q-inner-loading>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Network } from 'vis-network'
import { DataSet } from 'vis-data'
import { routingAPI } from '../services/data'

const route = useRoute()

// ── State ────────────────────────────────────
const networkContainer = ref(null)
const loading = ref(false)
const currentSid = ref('')
const customerName = ref('')
const routeSummary = ref(null)
const selectedItem = ref(null)
const layoutMode = ref('free')  // 'free' | 'LR' | 'TB'

let networkInstance = null
let visNodes = null
let visEdges = null
let edgeMeta = {}
let nodeMeta = {}
let nodeRouteMap = {}

// ── Constants ────────────────────────────────
const ICON_FACE = "'Material Icons'"
const FONT_BASE = { color: '#f1f5f9', size: 12, strokeWidth: 2, strokeColor: '#0f172a' }
const STATUS_LABEL = { active: 'Đang hoạt động', error: 'Lỗi', idle: 'Không sử dụng' }

const LAYOUT_MODES = [
    { val: 'free', label: 'Tự do', title: 'Physics layout tự do' },
    { val: 'LR', label: 'L → R', title: 'Hierarchical trái sang phải' },
    { val: 'TB', label: 'T → B', title: 'Hierarchical trên xuống dưới' }
]

const ROUTE_PALETTE = [
    '#f59e0b', '#3b82f6', '#10b981', '#a855f7',
    '#ef4444', '#06b6d4', '#f97316', '#84cc16'
]
const routeColorCache = {}
let paletteIdx = 0

function routeColor(maTuyen) {
    if (!maTuyen) return '#64748b'
    if (!routeColorCache[maTuyen]) {
        routeColorCache[maTuyen] = ROUTE_PALETTE[paletteIdx % ROUTE_PALETTE.length]
        paletteIdx++
    }
    return routeColorCache[maTuyen]
}

// ── Helpers ──────────────────────────────────
function pct(part, total) {
    if (!total) return '0%'
    return Math.round((part / total) * 100) + '%'
}

function getFiberStatus(fiberObj) {
    const sv = fiberObj?.status?.value || fiberObj?.status?.label || ''
    if (sv.includes('Lỗi')) return 'error'
    if (sv.includes('Đang hoạt động') || sv.includes('hoạt động')) return 'active'
    return 'idle'
}

function getNodeType(rawNode) {
    const t = rawNode.customData?.type || rawNode.customData?.point_type?.value || ''
    if (t.includes('Trạm')) return 'station'
    if (t.includes('Măng xông')) return 'closure'
    if (t.includes('Khách hàng')) return 'customer'
    return 'station'
}

function nodeIconConfig(nType) {
    const map = {
        station: { face: ICON_FACE, code: '\uea40', color: '#f59e0b', size: 44 },
        closure: { face: ICON_FACE, code: '\ue9f4', color: '#3b82f6', size: 36 },
        customer: { face: ICON_FACE, code: '\ue7fd', color: '#94a3b8', size: 30 }
    }
    return map[nType] || map.station
}

// ── Build vis nodes ───────────────────────────
function buildNode(rawNode) {
    const nType = getNodeType(rawNode)
    const icon = nodeIconConfig(nType)
    const maTuyen = rawNode.customData?.ma_tuyen || ''

    return {
        id: rawNode.id,
        label: rawNode.label || rawNode.id,
        shape: 'icon',
        icon,
        font: { ...FONT_BASE, vadjust: icon.size === 44 ? 42 : 34 },
        borderWidth: 3,
        color: { border: routeColor(maTuyen), background: 'transparent', highlight: { border: '#fbbf24' } },
        title: buildNodeTooltip(rawNode),
        _nodeType: nType,
        _raw: rawNode
    }
}

function buildNodeTooltip(rawNode) {
    const cd = rawNode.customData || {}
    return [
        `📍 ${rawNode.label || rawNode.id}`,
        `Loại: ${cd.type || '—'}`,
        `Tuyến: ${cd.ma_tuyen || '—'}`,
        cd.dia_chi ? `Địa chỉ: ${cd.dia_chi}` : '',
        cd.ngay_van_hanh ? `Ngày VH: ${cd.ngay_van_hanh}` : ''
    ].filter(Boolean).join('\n')
}

// ── Build vis edges với fan separation ────────
// Mỗi đoạn cáp (cùng from→to) có thể có nhiều sợi.
// Để tách rõ, ta dùng smooth.roundness khác nhau cho từng sợi:
//   - Sợi SID: luôn nằm ở giữa (roundness = 0, thẳng), dày + màu tuyến đậm
//   - Sợi khác: tỏa ra 2 bên đối xứng với roundness tăng dần
// Hàm này cần biết tổng số sợi và index của sợi hiện tại trong nhóm.
function buildEdgesForGroup(rawEdgesInGroup, activeSid, maTuyen) {
    const tuyenColor = routeColor(maTuyen)
    const total = rawEdgesInGroup.length

    // Sắp xếp: SID edges trước, sau đó theo cable_number
    const sorted = [...rawEdgesInGroup].sort((a, b) => {
        const aIsSid = (a.customData?.list_sid || []).some(s => s.SID?.value === activeSid)
        const bIsSid = (b.customData?.list_sid || []).some(s => s.SID?.value === activeSid)
        if (aIsSid !== bIsSid) return aIsSid ? -1 : 1
        return (a.customData?.fiber?.cable_number || 0) - (b.customData?.fiber?.cable_number || 0)
    })

    // Tính roundness fan: phân đều toàn bộ sợi trong nhóm
    // Step lớn hơn để tách rõ; tối thiểu 0.12 mỗi sợi
    const STEP = Math.max(0.13, Math.min(0.22, 1.6 / total))
    const totalSpan = STEP * (total - 1)
    const startR = -(totalSpan / 2)

    const result = []

    sorted.forEach((rawEdge, idx) => {
        const fiber = rawEdge.customData?.fiber || {}
        const fiberN = fiber.cable_number || (idx + 1)
        const fiberStatus = getFiberStatus(fiber)
        const isSidEdge = (rawEdge.customData?.list_sid || []).some(s => s.SID?.value === activeSid)
        const r = total === 1 ? 0 : startR + idx * STEP

        if (isSidEdge) {
            // SID edge: solid, dày, màu tuyến đậm, có label số sợi
            result.push({
                id: rawEdge.id,
                from: rawEdge.from,
                to: rawEdge.to,
                label: `Sợi ${fiberN}`,
                color: { color: tuyenColor, highlight: '#fbbf24', hover: '#fbbf24' },
                width: 1,
                dashes: false,
                arrows: { to: { enabled: false } },
                smooth: { enabled: true, type: 'curvedCCW', roundness: r },
                font: { color: '#f1f5f9', size: 10, strokeWidth: 1, strokeColor: '#0f172a', align: 'middle' },
                title: buildEdgeTooltip(rawEdge, activeSid, maTuyen),
                _isSidEdge: true,
                _maTuyen: maTuyen
            })
        } else {
            // Other edge: nét đứt mảnh, màu trạng thái sợi (mờ)
            const statusColor = {
                active: '#22c55e',
                error: '#ef4444',
                idle: '#475569'
            }[fiberStatus]
            result.push({
                id: rawEdge.id,
                from: rawEdge.from,
                to: rawEdge.to,
                label: '',
                color: { color: statusColor + '66', highlight: statusColor + 'cc', hover: statusColor + 'cc' },
                width: 1,
                dashes: [5, 4],
                arrows: { to: { enabled: false } },
                smooth: { enabled: true, type: 'curvedCCW', roundness: r },
                font: { color: '#94a3b8', size: 9, strokeWidth: 1, strokeColor: '#0f172a' },
                title: buildEdgeTooltip(rawEdge, activeSid, maTuyen),
                _isSidEdge: false,
                _maTuyen: maTuyen
            })
        }
    })

    return result
}

function buildEdgeTooltip(rawEdge, activeSid, maTuyen) {
    const cd = rawEdge.customData || {}
    const fiber = cd.fiber || {}
    const listSid = cd.list_sid || []
    const status = getFiberStatus(fiber)
    const statusIcon = { active: '✅', error: '❌', idle: '⬜' }[status]
    return [
        `Sợi ${fiber.cable_number || '?'} | ${statusIcon} ${STATUS_LABEL[status]}`,
        `Tuyến: ${maTuyen}`,
        `${cd.start_point_text} → ${cd.end_point_text}`,
        `Loại: ${cd.cable_type?.label || '?'} sợi | Dài: ${cd.length_cable || 0} km`,
        `Dùng: ${cd.used_cable}/${cd.total_cable} | Lỗi: ${cd.error_cable} | Rảnh: ${cd.available_cable}`,
        listSid.length ? `SID: ${listSid.map(s => s.SID?.value).join(', ')}` : ''
    ].filter(Boolean).join('\n')
}

// ── Build edge metadata ───────────────────────
function buildEdgeMeta(rawEdge, rawEdges, activeSid) {
    const cd = rawEdge.customData || {}
    const fiber = cd.fiber || {}
    const listSid = cd.list_sid || []
    const maTuyen = cd.ma_tuyen || cd.ten_tuyen || ''

    const siblings = rawEdges.filter(e => e.customData?.code === cd.code)
    const fibers = siblings.map(e => {
        const f = e.customData?.fiber || {}
        const sl = e.customData?.list_sid || []
        return {
            num: f.cable_number ?? '?',
            status: getFiberStatus(f),
            isSid: sl.some(s => s.SID?.value === activeSid),
            sidList: sl.map(s => s.SID?.value).filter(Boolean)
        }
    }).sort((a, b) => Number(a.num) - Number(b.num))

    const sidMap = new Map()
    siblings.forEach(e => {
        ; (e.customData?.list_sid || []).forEach(s => {
            if (s.SID?.value) sidMap.set(s.SID.value, { sid: s.SID.value, customer: s.ten_khach_hang })
        })
    })

    return {
        kind: 'edge',
        title: `${cd.start_point_text || rawEdge.from} → ${cd.end_point_text || rawEdge.to}`,
        maTuyen,
        fromText: cd.start_point_text || rawEdge.from,
        toText: cd.end_point_text || rawEdge.to,
        cableType: cd.cable_type?.label || '?',
        length: cd.length_cable || 0,
        totalCable: cd.total_cable || 0,
        usedCable: cd.used_cable || 0,
        errorCable: cd.error_cable || 0,
        availCable: cd.available_cable || 0,
        isSidEdge: listSid.some(s => s.SID?.value === activeSid),
        fiberNum: fiber.cable_number,
        fiberStatus: getFiberStatus(fiber),
        fibers,
        sidList: [...sidMap.values()]
    }
}

// ── Build node metadata ───────────────────────
function buildNodeMeta(rawNode, rawEdges) {
    const cd = rawNode.customData || {}
    const maTuyen = cd.ma_tuyen || ''
    const routes = [...(nodeRouteMap[rawNode.id] || new Set([maTuyen]))].filter(Boolean)

    const edgeCodeSeen = new Set()
    const edges = []
    rawEdges.forEach(e => {
        if (e.from !== rawNode.id && e.to !== rawNode.id) return
        const code = e.customData?.code
        if (edgeCodeSeen.has(code)) return
        edgeCodeSeen.add(code)
        const ecd = e.customData || {}
        edges.push({
            code,
            maTuyen: ecd.ma_tuyen || '',
            fromText: ecd.start_point_text || e.from,
            toText: ecd.end_point_text || e.to,
            totalCable: ecd.total_cable || 0,
            usedCable: ecd.used_cable || 0,
            errorCable: ecd.error_cable || 0,
            availCable: ecd.available_cable || 0,
            length: ecd.length_cable || 0
        })
    })

    return {
        kind: 'node',
        title: rawNode.label || rawNode.id,
        maDiem: cd.ma_diem || rawNode.id,
        loai: cd.type || cd.point_type?.value || '—',
        maTuyen,
        diaChi: cd.dia_chi || '',
        ngayVanHanh: cd.ngay_van_hanh || '',
        routes,
        edges
    }
}

// ── Compute summary ───────────────────────────
function computeSummary(rawEdges, activeSid) {
    const sidEdges = rawEdges.filter(e =>
        (e.customData?.list_sid || []).some(s => s.SID?.value === activeSid)
    )
    const seenCodes = new Set()
    const routeCodes = new Set()
    let totalLength = 0, activeSegs = 0, errorSegs = 0

    sidEdges.forEach(e => {
        const cd = e.customData || {}
        const maTuyen = cd.ma_tuyen || cd.ten_tuyen || ''
        if (maTuyen) routeCodes.add(maTuyen)
        const code = cd.code
        if (seenCodes.has(code)) return
        seenCodes.add(code)
        totalLength += cd.length_cable || 0
        const st = getFiberStatus(cd.fiber || {})
        if (st === 'active') activeSegs++
        if (st === 'error') errorSegs++
    })

    return {
        segments: seenCodes.size,
        totalLength: Math.round(totalLength * 10) / 10,
        activeSegments: activeSegs,
        errorSegments: errorSegs,
        routeCodes: [...routeCodes]
    }
}

// ── Network options ───────────────────────────
function getOptions(mode) {
    const isHierarchical = mode === 'LR' || mode === 'TB'
    return {
        nodes: { physics: false },
        edges: { smooth: { enabled: true, type: 'curvedCCW', roundness: 0.1 } },
        physics: isHierarchical ? { enabled: false } : {
            enabled: true,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
                gravitationalConstant: -320,
                springLength: 240,
                springConstant: 0.04,
                damping: 0.5,
                avoidOverlap: 1.2
            },
            stabilization: { iterations: 300 }
        },
        layout: isHierarchical ? {
            hierarchical: {
                enabled: true,
                direction: mode === 'LR' ? 'LR' : 'UD',
                sortMethod: 'directed',
                nodeSpacing: 120,
                levelSeparation: 220,
                treeSpacing: 180,
                blockShifting: true,
                edgeMinimization: true,
                parentCentralization: true
            }
        } : { hierarchical: { enabled: false } },
        interaction: {
            hover: true, zoomView: true,
            dragNodes: true, dragView: true,
            navigationButtons: true, keyboard: true,
            tooltipDelay: 150, multiselect: false
        }
    }
}

// ── Set layout & re-render ─────────────────────
function setLayout(mode) {
    layoutMode.value = mode
    if (!networkInstance || !visNodes || !visEdges) return
    networkInstance.destroy()
    networkInstance = null
    networkInstance = new Network(networkContainer.value, { nodes: visNodes, edges: visEdges }, getOptions(mode))
    setupEvents()
    setTimeout(() => networkInstance?.fit(), 400)
}

// ── Events ────────────────────────────────────
function setupEvents() {
    networkInstance.on('click', params => {
        if (params.nodes.length) {
            const meta = nodeMeta[params.nodes[0]]
            if (meta) selectedItem.value = meta
            return
        }
        if (params.edges.length) {
            const meta = edgeMeta[params.edges[0]]
            if (meta) selectedItem.value = meta
            return
        }
        selectedItem.value = null
    })
    networkInstance.on('hoverEdge', () => { networkContainer.value.style.cursor = 'pointer' })
    networkInstance.on('hoverNode', () => { networkContainer.value.style.cursor = 'pointer' })
    networkInstance.on('blurEdge', () => { networkContainer.value.style.cursor = 'default' })
    networkInstance.on('blurNode', () => { networkContainer.value.style.cursor = 'default' })
}

function fitNetwork() {
    networkInstance?.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } })
}

// ── Main load ─────────────────────────────────
const loadData = async () => {
    const sidParam = (route.params.sid || '').trim()
    if (!sidParam) return

    loading.value = true
    selectedItem.value = null
    customerName.value = ''
    routeSummary.value = null
    edgeMeta = {}
    nodeMeta = {}
    nodeRouteMap = {}
    paletteIdx = 0
    Object.keys(routeColorCache).forEach(k => delete routeColorCache[k])

    try {
        await document.fonts.load('12px "Material Icons"')

        const response = await routingAPI.getSidDiagram({ sid: sidParam })
        const apiResponse = response.data
        if (!apiResponse?.success || !apiResponse?.data) {
            console.error('[SidDiagram] Response không hợp lệ')
            return
        }

        const data = apiResponse.data
        const activeSid = data.sid || sidParam
        currentSid.value = activeSid

        const rawNodes = data.nodes || []
        const rawEdges = data.edges || []

        // Tên khách hàng
        const firstSidEdge = rawEdges.find(e =>
            (e.customData?.list_sid || []).some(s => s.SID?.value === activeSid)
        )
        if (firstSidEdge) {
            const entry = firstSidEdge.customData.list_sid.find(s => s.SID?.value === activeSid)
            customerName.value = entry?.ten_khach_hang || ''
        }

        // nodeRouteMap
        rawEdges.forEach(e => {
            const maTuyen = e.customData?.ma_tuyen || ''
                ;[e.from, e.to].forEach(nid => {
                    if (!nodeRouteMap[nid]) nodeRouteMap[nid] = new Set()
                    nodeRouteMap[nid].add(maTuyen)
                })
        })

        // Pre-assign màu tuyến
        const allRoutes = [...new Set(rawEdges.map(e => e.customData?.ma_tuyen).filter(Boolean))]
        allRoutes.forEach(r => routeColor(r))

        routeSummary.value = computeSummary(rawEdges, activeSid)

        // ── Group edges theo (from, to, maTuyen) rồi build với fan ──
        // Key = `${from}|${to}|${maTuyen}` hoặc `${to}|${from}|${maTuyen}` (cùng pair)
        const groupMap = {}
        rawEdges.forEach(e => {
            const maTuyen = e.customData?.ma_tuyen || e.customData?.ten_tuyen || ''
            // Normalize pair: luôn sort để A→B và B→A cùng nhóm
            const pair = [e.from, e.to].sort().join('|')
            const key = `${pair}|${maTuyen}`
            if (!groupMap[key]) groupMap[key] = { maTuyen, edges: [] }
            groupMap[key].edges.push(e)
        })

        // Build tất cả vis edges
        const allVisEdges = []
        Object.values(groupMap).forEach(({ maTuyen, edges }) => {
            const built = buildEdgesForGroup(edges, activeSid, maTuyen)
            allVisEdges.push(...built)
        })

        // Build vis nodes
        const visNodeArr = rawNodes.map(n => buildNode(n))

        // Build metadata
        rawNodes.forEach(n => { nodeMeta[n.id] = buildNodeMeta(n, rawEdges) })
        rawEdges.forEach(e => { edgeMeta[e.id] = buildEdgeMeta(e, rawEdges, activeSid) })

        visNodes = new DataSet(visNodeArr)
        visEdges = new DataSet(allVisEdges)

        if (networkInstance) { networkInstance.destroy(); networkInstance = null }
        networkInstance = new Network(networkContainer.value, { nodes: visNodes, edges: visEdges }, getOptions(layoutMode.value))
        setupEvents()

        setTimeout(() => networkInstance?.fit(), 500)
    } catch (err) {
        console.error('[SidDiagram] Lỗi:', err)
    } finally {
        loading.value = false
    }
}

// ── Lifecycle ─────────────────────────────────
watch(() => route.params.sid, () => loadData())
onMounted(() => loadData())
onBeforeUnmount(() => { networkInstance?.destroy(); networkInstance = null })
</script>

<style scoped>
.sid-diagram-wrapper {
    width: 100%;
    height: 100vh;
    background: #0f172a;
    padding: 4px;
}

.sid-card {
    background: rgba(30, 41, 59, .4);
    border: 1px solid #1e293b;
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
}

/* ── Header ───────────────────────────────── */
.sid-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px;
    background: #0f172a;
    border-bottom: 1px solid #1e293b;
    flex-shrink: 0;
    flex-wrap: wrap;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 8px;
}

.sid-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #1e3a5f;
    border: 1px solid #1d4ed8;
    border-radius: 20px;
    padding: 4px 12px;
    font-size: 13px;
    font-weight: 700;
    color: #60a5fa;
    white-space: nowrap;
}

.sid-code {
    letter-spacing: .5px;
}

.sid-customer {
    font-size: 11px;
    color: #64748b;
    max-width: 260px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.route-pills {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
}

.rpill {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 9px;
    border-radius: 10px;
    border: 1px solid;
    white-space: nowrap;
}

.header-stats {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(15, 23, 42, .6);
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 5px 12px;
}

.hstat {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 48px;
}

.hstat-val {
    font-size: 14px;
    font-weight: 700;
    color: #f1f5f9;
    line-height: 1.2;
}

.hstat-lbl {
    font-size: 10px;
    color: #475569;
    white-space: nowrap;
}

.hstat-div {
    width: 1px;
    height: 26px;
    background: #1e293b;
}

.text-green {
    color: #4ade80 !important;
}

.text-red {
    color: #f87171 !important;
}

.header-right {
    display: flex;
    gap: 4px;
    margin-left: auto;
}

/* ── Canvas ───────────────────────────────── */
.canvas-wrapper {
    position: relative;
    flex: 1;
    overflow: hidden;
}

.network-canvas {
    width: 100%;
    height: 100%;
}

/* ── Legend ───────────────────────────────── */
.sid-path-legend {
    position: absolute;
    left: 14px;
    bottom: 14px;
    z-index: 10;
    background: rgba(10, 18, 35, .95);
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 10px 13px;
    backdrop-filter: blur(8px);
    min-width: 155px;
    max-width: 200px;
}

.leg-title {
    font-size: 10px;
    font-weight: 700;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: .8px;
    margin-bottom: 6px;
}

.leg-sub {
    font-size: 9px;
    font-weight: 700;
    color: #334155;
    text-transform: uppercase;
    letter-spacing: .6px;
    margin: 5px 0 4px;
}

.leg-row {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    color: #94a3b8;
    margin-bottom: 5px;
}

.leg-line {
    width: 22px;
    height: 3px;
    border-radius: 2px;
    flex-shrink: 0;
}

.leg-dashed {
    background: #475569;
    height: 2px;
    border-top: 2px dashed #475569;
    background: transparent;
}

.leg-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
}

/* ── Detail Panel ─────────────────────────── */
.detail-panel {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 268px;
    background: rgba(10, 18, 35, .97);
    border-left: 1px solid #1e293b;
    padding: 14px 13px;
    overflow-y: auto;
    z-index: 20;
    backdrop-filter: blur(8px);
}

.slide-panel-enter-active,
.slide-panel-leave-active {
    transition: transform .25s cubic-bezier(.4, 0, .2, 1), opacity .2s;
}

.slide-panel-enter-from,
.slide-panel-leave-to {
    transform: translateX(100%);
    opacity: 0;
}

.dp-topbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 6px;
}

.dp-badge {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .6px;
    padding: 2px 8px;
    border-radius: 10px;
}

.dpb-node {
    background: #1e3a5f;
    color: #60a5fa;
}

.dpb-edge {
    background: #1c1205;
    color: #f59e0b;
}

.panel-close {
    background: none;
    border: none;
    color: #475569;
    cursor: pointer;
    padding: 3px;
    border-radius: 5px;
}

.panel-close:hover {
    background: #1e293b;
    color: #94a3b8;
}

.dp-title {
    font-size: 13px;
    font-weight: 600;
    color: #f1f5f9;
    line-height: 1.35;
    margin-bottom: 7px;
    word-break: break-word;
}

.dp-route-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 9px;
    border-radius: 10px;
    border: 1px solid;
    margin-bottom: 4px;
}

.dp-section {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .7px;
    color: #475569;
    margin-bottom: 7px;
}

.dp-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    font-size: 12px;
    margin-bottom: 5px;
}

.dp-key {
    color: #64748b;
    flex-shrink: 0;
}

.dp-val {
    color: #e2e8f0;
    text-align: right;
    font-weight: 500;
    word-break: break-word;
}

.node-route-row {
    margin-bottom: 5px;
}

.node-route-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 9px;
    border-radius: 10px;
    border: 1px solid;
}

.node-edge-row {
    padding: 6px 8px;
    border-radius: 7px;
    border-left: 3px solid;
    background: rgba(30, 41, 59, .5);
    margin-bottom: 6px;
}

.ned-name {
    font-size: 11px;
    color: #e2e8f0;
    font-weight: 600;
    margin-bottom: 3px;
    word-break: break-word;
}

.ned-meta {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    color: #64748b;
    margin-bottom: 5px;
    flex-wrap: wrap;
}

.ned-dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #334155;
    flex-shrink: 0;
}

.mini-bar {
    height: 5px;
    border-radius: 3px;
    background: #1e293b;
    display: flex;
    overflow: hidden;
}

.mini-seg {
    height: 100%;
    transition: width .3s;
}

.mini-seg.used {
    background: #3b82f6;
}

.mini-seg.error {
    background: #ef4444;
}

.mini-seg.free {
    background: #22c55e;
}

.fiber-bar {
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
    background: #1e293b;
    display: flex;
    margin-bottom: 6px;
}

.fiber-bar-seg {
    height: 100%;
    transition: width .3s;
}

.fiber-bar-seg.used {
    background: #3b82f6;
}

.fiber-bar-seg.error {
    background: #ef4444;
}

.fiber-bar-seg.free {
    background: #22c55e;
}

.fiber-bar-labels {
    display: flex;
    gap: 6px;
    font-size: 10px;
    margin-bottom: 8px;
    flex-wrap: wrap;
}

.fbl {
    font-weight: 600;
}

.fbl.used {
    color: #60a5fa;
}

.fbl.error {
    color: #f87171;
}

.fbl.free {
    color: #4ade80;
}

.fbl.total {
    color: #64748b;
}

/* Fiber grid */
.fiber-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 6px;
}

.fc {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    cursor: default;
    position: relative;
    border: 1px solid transparent;
    transition: transform .1s;
}

.fc:hover {
    transform: scale(1.12);
    z-index: 2;
}

.fc-active {
    background: #14532d;
    color: #4ade80;
    border-color: #16a34a;
}

.fc-error {
    background: #450a0a;
    color: #f87171;
    border-color: #dc2626;
}

.fc-idle {
    background: #1c1917;
    color: #78716c;
    border-color: #292524;
}

.fc-sid {
    box-shadow: 0 0 0 2px #f59e0b;
    border-color: #f59e0b !important;
}

.fc-num {
    font-size: 10px;
    line-height: 1;
}

.fc-star {
    position: absolute;
    top: 2px;
    right: 2px;
    color: #f59e0b;
}

.fiber-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 9px;
    margin-bottom: 6px;
}

.fcl-active {
    color: #4ade80;
}

.fcl-error {
    color: #f87171;
}

.fcl-idle {
    color: #78716c;
}

.fcl-sid {
    color: #f59e0b;
}

/* SID list */
.sid-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    padding: 4px 6px;
    border-radius: 6px;
    margin-bottom: 3px;
    transition: background .15s;
}

.sid-row:hover {
    background: #1e293b;
}

.sid-row--active {
    background: #1c1205;
    border: 1px solid #78350f;
}

.sid-row-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1px;
    overflow: hidden;
}

.sid-row-code {
    font-weight: 700;
    color: #fbbf24;
    font-size: 11px;
}

.sid-row-kh {
    color: #64748b;
    font-size: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.sid-me-tag {
    font-size: 9px;
    font-weight: 700;
    color: #f59e0b;
    background: #78350f;
    padding: 1px 5px;
    border-radius: 6px;
    flex-shrink: 0;
}

/* ── Layout toggle ────────────────────────── */
.layout-toggle {
    display: flex;
    align-items: center;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 2px;
    gap: 2px;
}

.lt-btn {
    background: none;
    border: none;
    color: #64748b;
    font-size: 10px;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: 6px;
    cursor: pointer;
    transition: background .15s, color .15s;
    white-space: nowrap;
    letter-spacing: .3px;
}

.lt-btn:hover {
    background: #334155;
    color: #94a3b8;
}

.lt-btn--active {
    background: #0f172a;
    color: #f1f5f9;
    box-shadow: 0 1px 3px rgba(0, 0, 0, .4);
}
</style>