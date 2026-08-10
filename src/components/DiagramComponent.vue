<template>
  <div class="network-component-wrapper">
    <div class="network-card">

      <!-- Toolbar -->
      <div class="toolbar">
        <!-- Route info -->
        <div class="route-identity">
          <q-icon name="route" size="15px" style="color:#60a5fa;flex-shrink:0" />
          <span class="route-label">{{ ma_tuyen }}</span>
        </div>

        <div class="toolbar-spacer" />

        <!-- Node count chips -->
        <div v-if="diagramStats.nodes" class="stat-chips">
          <span class="stat-chip chip-station">
            <q-icon name="apartment" size="12px" />
            {{ diagramStats.stations }} trạm
          </span>
          <span class="stat-chip chip-closure">
            <q-icon name="hub" size="12px" />
            {{ diagramStats.closures }} măng xông
          </span>
          <span v-if="diagramStats.customers" class="stat-chip chip-customer">
            <q-icon name="person" size="12px" />
            {{ diagramStats.customers }} KH
          </span>
          <span class="stat-chip chip-edge">
            <q-icon name="cable" size="12px" />
            {{ diagramStats.edges }} đoạn
          </span>
        </div>

        <!-- Layout toggle -->
        <div class="layout-toggle">
          <button v-for="lt in LAYOUT_OPTIONS" :key="lt.value" class="lt-btn"
            :class="{ active: layoutMode === lt.value }" @click="setLayout(lt.value)">
            <q-icon :name="lt.icon" size="13px" />
            {{ lt.label }}
          </button>
        </div>

        <!-- Fit button -->
        <button class="toolbar-btn" @click="fitNetwork" title="Vừa khung">
          <q-icon name="fit_screen" size="14px" />
        </button>
      </div>

      <!-- Canvas area -->
      <div class="network-wrapper">
        <div ref="networkContainer" class="network-canvas" />

        <!-- Legend -->
        <div class="legend-panel">
          <div class="legend-section-title">Loại điểm</div>
          <div class="legend-item">
            <q-icon name="apartment" color="amber" size="17px" />
            <span>Trạm / OLT</span>
          </div>
          <div class="legend-item">
            <q-icon name="hub" color="blue" size="17px" />
            <span>Măng xông</span>
          </div>
          <div class="legend-item">
            <q-icon name="call_split" color="red" size="17px" />
            <span>Điểm rẽ nhánh</span>
          </div>
          <div class="legend-item">
            <q-icon name="person" color="grey-4" size="17px" />
            <span>Khách hàng</span>
          </div>
          <q-separator dark class="q-my-sm" />
          <div class="legend-section-title">Cáp quang</div>
          <div class="legend-item">
            <div class="edge-line" style="background:#22c55e" />
            <span>Tuyến đang xem</span>
          </div>
        </div>

        <!-- Node detail panel -->
        <transition name="slide-panel">
          <div v-if="selectedNode" class="detail-panel">
            <button class="panel-close" @click="selectedNode = null">
              <q-icon name="close" size="16px" />
            </button>
            <div class="panel-header">
              <div class="panel-icon-wrap" :class="`icon-${selectedNode.nodeType}`">
                <q-icon :name="NODE_ICONS[selectedNode.nodeType]" size="20px" />
              </div>
              <div>
                <div class="panel-type-badge">{{ NODE_LABELS[selectedNode.nodeType] }}</div>
                <h3 class="panel-title">{{ selectedNode.title }}</h3>
              </div>
            </div>
            <div class="panel-divider" />
            <div class="panel-rows">
              <template v-for="row in selectedNode.rows" :key="row.k">
                <div v-if="row._type === 'divider'" class="panel-section-divider" />
                <div v-else class="panel-row">
                  <span class="row-key">{{ row.k }}</span>
                  <span class="row-val" v-html="row.v" />
                </div>
              </template>
            </div>
          </div>
        </transition>

        <!-- Loading -->
        <q-inner-loading :showing="loading" dark color="primary">
          <q-spinner-cube size="50px" />
          <div class="q-mt-sm text-grey-4">Đang tải cấu trúc tuyến...</div>
        </q-inner-loading>

        <!-- Empty state -->
        <transition name="fade">
          <div v-if="!loading && isEmpty" class="empty-state">
            <q-icon name="account_tree" size="48px" style="color:#1e293b" />
            <div class="empty-title">Không có dữ liệu</div>
            <div class="empty-sub">Chọn một tuyến để xem sơ đồ</div>
          </div>
        </transition>
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

const NODE_LABELS = {
  station: 'Trạm / OLT',
  closure: 'Măng xông',
  branch: 'Điểm rẽ nhánh',
  customer: 'Khách hàng'
}
const NODE_ICONS = {
  station: 'apartment',
  closure: 'hub',
  branch: 'call_split',
  customer: 'person'
}

const LAYOUT_OPTIONS = [
  { value: 'hierarchical', label: 'LR', icon: 'swap_horiz' },
  { value: 'free', label: 'Tự do', icon: 'grain' }
]

// ── State ──────────────────────────────────
const networkContainer = ref(null)
const loading = ref(false)
const isEmpty = ref(false)
const layoutMode = ref('hierarchical')
const selectedNode = ref(null)
const ma_tuyen = ref('')
const diagramStats = reactive({
  nodes: 0, stations: 0, closures: 0, customers: 0, edges: 0
})

let networkInstance = null

// ── Node type helper ───────────────────────
function getNodeType(rawNode) {
  const t = rawNode.customData?.type || rawNode.customData?.point_type?.value || ''
  if (rawNode.customData?.start_point_route != null) return 'branch'
  if (t.includes('Trạm')) return 'station'
  if (t.includes('Măng xông')) return 'closure'
  if (t.includes('Khách hàng')) return 'customer'
  return 'station'
}

function iconConfig(nodeType) {
  if (nodeType === 'station') return { face: ICON_FACE, code: '\uea40', color: '#f59e0b', size: 44 }
  if (nodeType === 'closure') return { face: ICON_FACE, code: '\ue9f4', color: '#3b82f6', size: 36 }
  if (nodeType === 'branch') return { face: ICON_FACE, code: '\ue0b6', color: '#ef4444', size: 38 }
  if (nodeType === 'customer') return { face: ICON_FACE, code: '\ue7fd', color: '#94a3b8', size: 30 }
  return { face: ICON_FACE, code: '\uea40', color: '#f59e0b', size: 44 }
}

function buildNode(rawNode) {
  const nType = getNodeType(rawNode)
  const icon = iconConfig(nType)
  return {
    id: rawNode.id,
    label: rawNode.label || rawNode.id,
    shape: 'icon',
    icon,
    font: { ...FONT_BASE, vadjust: icon.size === 44 ? 42 : 34 },
    _nodeType: nType,
    _raw: rawNode
  }
}

// ── Stats counter ──────────────────────────
function calcStats(nodes, edges) {
  diagramStats.nodes = nodes.length
  diagramStats.stations = nodes.filter(n => getNodeType(n) === 'station').length
  diagramStats.closures = nodes.filter(n => getNodeType(n) === 'closure').length
  diagramStats.customers = nodes.filter(n => getNodeType(n) === 'customer').length
  diagramStats.edges = edges.length
}

// ── Layout options ─────────────────────────
function getOptions(mode) {
  const base = {
    nodes: { physics: false },
    edges: {
      color: { color: '#22c55e', highlight: '#4ade80', hover: '#4ade80' },
      width: 2,
      hoverWidth: 3,
      selectionWidth: 3,
      font: { color: '#94a3b8', size: 10, strokeWidth: 1, strokeColor: '#0f172a' },
      smooth: { type: 'curvedCW', roundness: 0.1 }
    },
    interaction: {
      hover: true, zoomView: true, dragNodes: true, dragView: true,
      navigationButtons: false, keyboard: false, tooltipDelay: 150
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
          nodeSpacing: 180,
          levelSeparation: 280,
          treeSpacing: 200
        }
      },
      physics: { enabled: false }
    }
  }

  // free layout — force-directed
  return {
    ...base,
    layout: { hierarchical: { enabled: false } },
    physics: {
      enabled: true,
      solver: 'forceAtlas2Based',
      forceAtlas2Based: {
        gravitationalConstant: -160,
        springLength: 180,
        springConstant: 0.05,
        damping: 0.6,
        avoidOverlap: 1
      },
      stabilization: { iterations: 180 }
    }
  }
}

// // ── Panel helpers ──────────────────────────
// function statBadge(status, label) {
//   const cls = { active: 'badge-active', error: 'badge-error', idle: 'badge-idle' }[status] || 'badge-idle'
//   return `<span class="stat-badge ${cls}">${label}</span>`
// }

function showNodePanel(node) {
  const d = node._raw?.customData || {}
  const type = node._nodeType

  const rows = [
    { k: 'Mã điểm', v: d.ma_diem || node.id },
    { k: 'Tên điểm', v: d.ten_diem || node.label || '' }
  ]

  if (d.dia_chi) rows.push({ k: 'Địa chỉ', v: d.dia_chi })
  if (d.ngay_van_hanh) rows.push({ k: 'Ngày vận hành', v: d.ngay_van_hanh })
  if (d.ghi_chu) rows.push({ k: 'Ghi chú', v: d.ghi_chu })

  rows.push({ _type: 'divider' })

  if (type === 'station' && d.station?.label) {
    rows.push({ k: 'Tên trạm', v: d.station.label })
    rows.push({ k: 'Mã trạm HTC', v: d.station.value || '' })
    rows.push({ _type: 'divider' })
  }

  if (type === 'closure') {
    rows.push({ k: 'Thứ tự', v: String(d.thu_tu ?? '') })
    if (d.start_point?.label) rows.push({ k: 'Điểm bắt đầu', v: d.start_point.label })
    rows.push({ _type: 'divider' })
  }

  if (type === 'customer' && d.vi_tri_khach_hang?.label) {
    rows.push({ k: 'Tên KH', v: d.vi_tri_khach_hang.label })
    rows.push({ k: 'Mã POP', v: d.vi_tri_khach_hang.value || '' })
    rows.push({ _type: 'divider' })
  }

  rows.push({
    k: 'Trạng thái',
    v: d.is_active !== false
      ? '<span class="stat-badge badge-active">Hoạt động</span>'
      : '<span class="stat-badge badge-idle">Không hoạt động</span>'
  })
  if (d.modified_by_fullname) rows.push({ k: 'Cập nhật bởi', v: d.modified_by_fullname })

  selectedNode.value = {
    nodeType: type,
    title: node.label?.split('\n')[0] || node.id,
    rows
  }
}

// ── Layout switch ──────────────────────────
function setLayout(mode) {
  if (layoutMode.value === mode || !networkInstance) return
  layoutMode.value = mode
  networkInstance.setOptions(getOptions(mode))
  if (mode === 'free') {
    networkInstance.once('stabilizationIterationsDone', () => {
      networkInstance.setOptions({ physics: { enabled: false } })
      networkInstance.fit({ animation: true })
    })
  } else {
    setTimeout(() => networkInstance?.fit({ animation: true }), 300)
  }
}

function fitNetwork() {
  networkInstance?.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } })
}

// ── Main load ──────────────────────────────
const loadDiagramData = async () => {
  const apiParams = {}
  if (props.tuyenId?.trim()) apiParams.tuyen_id = props.tuyenId
  else if (props.maTuyen?.trim()) apiParams.ma_tuyen = props.maTuyen
  else return

  loading.value = true
  isEmpty.value = false
  selectedNode.value = null

  try {
    await document.fonts.load('12px "Material Icons"')

    const response = await routingAPI.getDiagram(apiParams)
    const apiResponse = response.data
    if (!apiResponse?.success || !apiResponse?.data) {
      console.error('[RouteDiagram] Dữ liệu không đúng cấu trúc')
      isEmpty.value = true
      return
    }

    const rawNodes = apiResponse.data.nodes || []
    const rawEdges = apiResponse.data.edges || []
    ma_tuyen.value = apiResponse.data.nodes[0].customData.ma_tuyen || ''
    console.log('Raw diagram data:', { nodes: rawNodes, edges: rawEdges })
    if (!rawNodes.length) { isEmpty.value = true; return }

    calcStats(rawNodes, rawEdges)

    const nodes = new DataSet(rawNodes.map(buildNode))
    const edges = new DataSet(rawEdges.map(e => ({
      ...e,
      color: { color: '#22c55e', highlight: '#4ade80', hover: '#4ade80' },
      width: 2,
      hoverWidth: 3,
      font: { color: '#94a3b8', size: 10, strokeWidth: 1, strokeColor: '#0f172a' },
      smooth: { type: 'curvedCW', roundness: 0.1 }
    })))

    if (networkInstance) { networkInstance.destroy(); networkInstance = null }

    networkInstance = new Network(
      networkContainer.value,
      { nodes, edges },
      getOptions(layoutMode.value)
    )

    // Events
    networkInstance.on('click', params => {
      if (!params.nodes.length) { selectedNode.value = null; return }
      const n = nodes.get(params.nodes[0])
      if (n) showNodePanel(n)
    })

    networkInstance.on('hoverNode', () => { document.body.style.cursor = 'pointer' })
    networkInstance.on('hoverEdge', () => { document.body.style.cursor = 'alias' })
    networkInstance.on('blurNode', () => { document.body.style.cursor = 'default' })
    networkInstance.on('blurEdge', () => { document.body.style.cursor = 'default' })

    // Fit after layout stabilizes
    if (layoutMode.value === 'hierarchical') {
      setTimeout(() => networkInstance?.fit({ animation: true }), 300)
    } else {
      networkInstance.once('stabilizationIterationsDone', () => {
        networkInstance.setOptions({ physics: { enabled: false } })
        networkInstance.fit({ animation: true })
      })
    }

  } catch (err) {
    console.error('[RouteDiagram] Lỗi tải sơ đồ:', err)
    isEmpty.value = true
  } finally {
    loading.value = false
  }
}

watch([() => props.tuyenId, () => props.maTuyen], () => loadDiagramData())
onMounted(() => loadDiagramData())
onBeforeUnmount(() => { if (networkInstance) { networkInstance.destroy(); networkInstance = null } })
</script>

<style scoped>
/* ── Wrapper & card ── */
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

/* ── Toolbar ── */
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

.toolbar-spacer {
  flex: 1;
}

.route-identity {
  display: flex;
  align-items: center;
  gap: 6px;
}

.route-label {
  font-size: 12px;
  font-weight: 700;
  color: #f1f5f9;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Stat chips */
.stat-chips {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  white-space: nowrap;
}

.chip-station {
  background: rgba(245, 158, 11, .12);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, .2);
}

.chip-closure {
  background: rgba(59, 130, 246, .12);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, .2);
}

.chip-customer {
  background: rgba(148, 163, 184, .1);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, .15);
}

.chip-edge {
  background: rgba(34, 197, 94, .1);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, .18);
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
}

.lt-btn:hover {
  color: #94a3b8;
  background: #1e293b;
}

.lt-btn.active {
  background: #1e3a5f;
  color: #60a5fa;
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
}

.toolbar-btn:hover {
  background: #334155;
  color: #94a3b8;
}

/* ── Canvas ── */
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

/* ── Legend ── */
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

.legend-item:last-child {
  margin-bottom: 0;
}

.edge-line {
  width: 22px;
  height: 2px;
  border-radius: 1px;
  flex-shrink: 0;
}

/* ── Detail panel ── */
.detail-panel {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 250px;
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

.icon-branch {
  background: rgba(239, 68, 68, .15);
  color: #ef4444;
}

.icon-customer {
  background: rgba(148, 163, 184, .12);
  color: #94a3b8;
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
  margin: 7px 0;
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

/* ── Empty state ── */
.empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  pointer-events: none;
}

.empty-title {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.empty-sub {
  font-size: 12px;
  color: #1e293b;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity .25s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>