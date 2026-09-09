import { ref, reactive, shallowRef } from 'vue'
import gisAPI from '../services/gis'
import { fetchPhanLoaiTuyen } from '../services/phanLoaiApi'
import { boundsToBBox, pathToLineString, cloneGeometry, isValidLineString } from '../utils/geo'

const IDLE_DEBOUNCE_MS = 300
const SEARCH_DEBOUNCE_MS = 350
const MEASURE_DEBOUNCE_MS = 200
const AUTOSAVE_DEBOUNCE_MS = 800
const POINTS_LIMIT = 2000
const SEGMENTS_LIMIT = 2000

export function useGisMap() {
  const points = shallowRef(new Map())
  const clusters = shallowRef([])
  const segments = shallowRef(new Map())
  const loadingMap = ref(false)
  const mapError = ref('')

  const selectedPoint = ref(null)
  const selectedSegmentId = ref(null)
  const segmentDetail = ref(null)
  const loadingSegmentDetail = ref(false)
  const segmentDetailError = ref('')

  const selectedRouteId = ref('')
  const routeSegments = shallowRef([])
  const loadingRoute = ref(false)
  const routeError = ref('')

  const routeMode = ref(false)
  const routeModeLabel = ref('')
  const routeModePoints = shallowRef(new Map())
  const routeModeSegments = shallowRef(new Map())
  const loadingRouteMode = ref(false)
  const routeModeError = ref('')
  let currentRouteModeParams = null

  const editingSegmentId = ref(null)
  const originalGeometry = ref(null)
  const currentGeometry = ref(null)
  const isDirty = ref(false)
  const saveError = ref('')
  const conflict = ref(false)

  const autoSaving = ref(false)
  const autoSaveError = ref('')
  let autoSaveTimer = null
  // let saveInFlight = false
  // let saveQueued = false

  const pointsDraggable = ref(false)
  const savingPointId = ref(null)
  const pointSaveError = ref('')

  const visiblePointTypes = reactive({
    station: true, closure: true, customer: true, underground: true,
    cabinet: true, collection: true, other: true
  })

  const phanLoaiList = ref([])
  const loadingPhanLoai = ref(false)
  const phanLoaiError = ref('')
  const selectedPhanLoai = reactive({})

  const measureMode = ref(false)
  const measurePoints = ref([])
  const measureResult = ref(null)
  const measureLoading = ref(false)
  const measureError = ref('')

  async function loadPhanLoaiTuyen() {
    loadingPhanLoai.value = true
    phanLoaiError.value = ''
    try {
      const res = await fetchPhanLoaiTuyen()
      const list = res.data?.data || []
      phanLoaiList.value = list
      list.forEach(item => {
        if (!(item.code in selectedPhanLoai)) selectedPhanLoai[item.code] = true
      })
    } catch (err) {
      phanLoaiError.value = err?.response?.data?.detail || 'Không tải được danh mục phân loại tuyến'
    } finally {
      loadingPhanLoai.value = false
    }
  }

  function togglePhanLoai(code) {
    selectedPhanLoai[code] = !selectedPhanLoai[code]
    if (lastLoadedBounds) loadViewport(lastLoadedBounds, lastLoadedZoom)
    else if (routeMode.value) reloadRouteModeFilter()
  }

  function currentPhanLoaiParam() {
    if (!phanLoaiList.value.length) return undefined
    const codes = phanLoaiList.value
      .map(item => item.code)
      .filter(code => selectedPhanLoai[code] !== false)
    if (codes.length === 0) return '__none__'
    if (codes.length === phanLoaiList.value.length) return undefined
    return codes.join(',')
  }

  const searchQuery = ref('')
  const searchResults = ref([])
  const searchLoading = ref(false)
  const searchError = ref('')

  let idleTimer = null
  let viewportAbort = null
  let viewportRequestId = 0
  let searchTimer = null
  let searchAbort = null
  let lastLoadedBounds = null
  let lastLoadedZoom = null
  let measureDebounceTimer = null
  let measureAbort = null
  let routeModeAbort = null
  let routeModeRequestId = 0

  function scheduleViewportLoad(bounds, zoom) {
    if (routeMode.value) return
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(() => loadViewport(bounds, zoom), IDLE_DEBOUNCE_MS)
  }

  async function loadViewport(bounds, zoom) {
    if (!bounds || routeMode.value) return
    const bbox = boundsToBBox(bounds)
    if (bbox.min_lng >= bbox.max_lng || bbox.min_lat >= bbox.max_lat) return

    lastLoadedBounds = bounds
    lastLoadedZoom = zoom

    if (viewportAbort) viewportAbort.abort()
    viewportAbort = new AbortController()
    const myRequestId = ++viewportRequestId
    const signal = viewportAbort.signal

    loadingMap.value = true
    mapError.value = ''

    const phanLoai = currentPhanLoaiParam()
    if (phanLoai === '__none__') {
      points.value = new Map()
      clusters.value = []
      segments.value = new Map()
      loadingMap.value = false
      return
    }

    const extraParams = phanLoai ? { phan_loai: phanLoai } : {}

    try {
      const [pointsRes, segmentsRes] = await Promise.all([
        gisAPI.getPoints({ ...bbox, zoom, limit: POINTS_LIMIT, ...extraParams }, signal),
        gisAPI.getSegments({ ...bbox, zoom, limit: SEGMENTS_LIMIT, ...extraParams }, signal)
      ])

      if (myRequestId !== viewportRequestId) return

      const nextPoints = new Map()
      const nextClusters = []
      for (const item of pointsRes.data?.data || []) {
        if (item?.type === 'cluster') {
          nextClusters.push(item)
        } else {
          nextPoints.set(item.source_id, item)
        }
      }
      points.value = nextPoints
      clusters.value = nextClusters

      const nextSegments = new Map()
      for (const s of segmentsRes.data?.data || []) nextSegments.set(s.source_id, s)
      segments.value = nextSegments
    } catch (err) {
      if (signal.aborted) return
      mapError.value = err?.response?.data?.detail || 'Không tải được dữ liệu bản đồ'
    } finally {
      if (myRequestId === viewportRequestId) loadingMap.value = false
    }
  }

  function clearSelection() {
    selectedPoint.value = null
    selectedSegmentId.value = null
    segmentDetail.value = null
    segmentDetailError.value = ''
  }

  function selectPoint(point) {
    if (measureMode.value) return
    if (editingSegmentId.value) return
    selectedSegmentId.value = null
    segmentDetail.value = null
    selectedPoint.value = point
  }

  async function selectSegment(segmentId) {
    if (measureMode.value) return
    if (editingSegmentId.value) return
    selectedPoint.value = null
    selectedSegmentId.value = segmentId
    segmentDetail.value = null
    segmentDetailError.value = ''
    loadingSegmentDetail.value = true
    try {
      const res = await gisAPI.getSegment(segmentId)
      segmentDetail.value = res.data?.data || null
    } catch (err) {
      segmentDetailError.value = err?.response?.data?.detail || 'Không tải được thông tin đoạn cáp'
    } finally {
      loadingSegmentDetail.value = false
    }
  }

  async function loadRoute(routeId) {
    if (!routeId) return
    selectedRouteId.value = routeId
    loadingRoute.value = true
    routeError.value = ''
    try {
      const res = await gisAPI.getRouteMap({ tuyen_id: routeId })
      routeSegments.value = res.data?.data?.segments || []
    } catch (err) {
      routeSegments.value = []
      routeError.value = err?.response?.data?.detail || 'Không tải được tuyến'
    } finally {
      loadingRoute.value = false
    }
  }

  function clearRoute() {
    selectedRouteId.value = ''
    routeSegments.value = []
    routeError.value = ''
  }

  async function enterRouteMode({ tuyenId, maTuyen }, { keepSelection = false } = {}) {
    if (!tuyenId && !maTuyen) return

    currentRouteModeParams = { tuyenId, maTuyen }

    if (routeModeAbort) routeModeAbort.abort()
    routeModeAbort = new AbortController()
    const myRequestId = ++routeModeRequestId
    const signal = routeModeAbort.signal

    loadingRouteMode.value = true
    routeModeError.value = ''
    if (!keepSelection) clearSelection()

    try {
      const params = {}
      if (tuyenId) params.tuyen_id = tuyenId
      else if (maTuyen) params.ma_tuyen = maTuyen
      params._ts = Date.now()

      const res = await gisAPI.getRouteMap(params, signal)
      if (myRequestId !== routeModeRequestId) return
      const data = res.data?.data
      if (!data) throw new Error('empty')

      const pMap = new Map()
      for (const p of data.points || []) pMap.set(p.source_id, p)
      const sMap = new Map()
      for (const s of data.segments || []) sMap.set(s.source_id, s)

      routeModePoints.value = pMap
      routeModeSegments.value = sMap
      routeModeLabel.value = maTuyen || data.tuyen_id || ''
      routeMode.value = true
    } catch (err) {
      if (signal.aborted) return
      routeModeError.value = err?.response?.data?.detail || 'Không tải được tuyến'
      routeMode.value = false
      routeModePoints.value = new Map()
      routeModeSegments.value = new Map()
    } finally {
      if (myRequestId === routeModeRequestId) loadingRouteMode.value = false
    }
  }

  function reloadRouteMode(options = {}) {
    if (!currentRouteModeParams) return Promise.resolve()
    return enterRouteMode(currentRouteModeParams, { keepSelection: true, ...options })
  }

  function reloadRouteModeFilter() {
    reloadRouteMode()
  }

  function exitRouteMode() {
    if (routeModeAbort) routeModeAbort.abort()
    currentRouteModeParams = null
    routeMode.value = false
    routeModeLabel.value = ''
    routeModeError.value = ''
    routeModePoints.value = new Map()
    routeModeSegments.value = new Map()
    clearSelection()
  }

  function togglePointTypeVisible(key) {
    visiblePointTypes[key] = !visiblePointTypes[key]
  }

  function setPointsDraggable(val) {
    pointsDraggable.value = val
  }

  function applyPointUpdate(newPoint) {
    if (points.value.has(newPoint.source_id)) {
      const next = new Map(points.value)
      next.set(newPoint.source_id, { ...next.get(newPoint.source_id), ...newPoint })
      points.value = next
    }
    if (routeModePoints.value.has(newPoint.source_id)) {
      const next = new Map(routeModePoints.value)
      next.set(newPoint.source_id, { ...next.get(newPoint.source_id), ...newPoint })
      routeModePoints.value = next
    }
    if (selectedPoint.value?.source_id === newPoint.source_id || selectedPoint.value?.ma_diem === newPoint.ma_diem) {
      selectedPoint.value = { ...selectedPoint.value, ...newPoint }
    }
  }

  function applySegmentGeometryUpdate(segmentId, geometry, geometryVersion) {
    if (segments.value.has(segmentId)) {
      const next = new Map(segments.value)
      next.set(segmentId, { ...next.get(segmentId), geometry, geometry_version: geometryVersion })
      segments.value = next
    }
    if (routeModeSegments.value.has(segmentId)) {
      const next = new Map(routeModeSegments.value)
      next.set(segmentId, { ...next.get(segmentId), geometry, geometry_version: geometryVersion })
      routeModeSegments.value = next
    }
  }

  async function updatePointGeometry(point, lat, lng) {
    const pointId = point.source_id
    savingPointId.value = pointId
    pointSaveError.value = ''
    try {
      const res = await gisAPI.updatePointGeometry(pointId, {
        geometry: { type: 'Point', coordinates: [lng, lat] }
      })
      const data = res.data?.data
      if (!data?.point) throw new Error('empty')

      applyPointUpdate(data.point)

      const refreshedIds = data.refreshed_auto_segments || []
      await Promise.all(refreshedIds.map(async id => {
        try {
          const segRes = await gisAPI.getSegmentGeometry(id)
          const geomData = segRes.data?.data
          if (geomData?.geometry) {
            applySegmentGeometryUpdate(id, geomData.geometry, geomData.geometry_version)
          }
        } catch {
          return
        }
      }))

      return data
    } catch (err) {
      pointSaveError.value = err?.response?.data?.detail || 'Không lưu được vị trí điểm.'
      return null
    } finally {
      savingPointId.value = null
    }
  }

  function startEdit(segmentId, geometry) {
    editingSegmentId.value = segmentId
    originalGeometry.value = cloneGeometry(geometry)
    currentGeometry.value = cloneGeometry(geometry)
    isDirty.value = false
    saveError.value = ''
    autoSaveError.value = ''
    conflict.value = false
  }

  function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(() => { performAutoSave() }, AUTOSAVE_DEBOUNCE_MS)
  }

  async function performAutoSave() {
    if (!editingSegmentId.value || !currentGeometry.value) return
    if (!isValidLineString(currentGeometry.value)) return

    const segmentId = editingSegmentId.value
    autoSaving.value = true
    autoSaveError.value = ''

    const expectedVersion =
      segmentDetail.value?.segment?.geometry_version ??
      segments.value.get(segmentId)?.geometry_version

    try {
      const res = await gisAPI.updateSegmentGeometry(segmentId, {
        geometry: currentGeometry.value,
        geometry_source: 'USER',
        expected_version: expectedVersion
      })
      const updated = res.data?.data
      if (updated) {
        applySegmentGeometryUpdate(updated.source_id, updated.geometry, updated.geometry_version)
        if (segmentDetail.value?.segment?.source_id === updated.source_id) {
          segmentDetail.value = { ...segmentDetail.value, segment: updated }
        }
        originalGeometry.value = cloneGeometry(updated.geometry)
        isDirty.value = false
      }
    } catch (err) {
      if (err?.response?.status === 409) {
        conflict.value = true
        autoSaveError.value =
          err?.response?.data?.detail || 'Geometry đã được người khác cập nhật. Vui lòng tải lại.'
      } else {
        autoSaveError.value = err?.response?.data?.detail || 'Không tự lưu được geometry.'
      }
    } finally {
      autoSaving.value = false
    }
  }

  function updateCurrentGeometryFromPath(path) {
    currentGeometry.value = pathToLineString(path)
    isDirty.value = true
    scheduleAutoSave()
  }

  function cancelEdit() {
    if (autoSaveTimer) { clearTimeout(autoSaveTimer); autoSaveTimer = null }
    editingSegmentId.value = null
    originalGeometry.value = null
    currentGeometry.value = null
    isDirty.value = false
    saveError.value = ''
    autoSaveError.value = ''
    conflict.value = false
  }

  async function finishEditing() {
    if (autoSaveTimer) { clearTimeout(autoSaveTimer); autoSaveTimer = null }

    if (isDirty.value && currentGeometry.value) {
      await performAutoSave()
    }

    if (conflict.value) return false

    editingSegmentId.value = null
    originalGeometry.value = null
    currentGeometry.value = null
    isDirty.value = false
    saveError.value = ''
    autoSaveError.value = ''
    return true
  }

  async function reloadSegmentAfterConflict(segmentId) {
    const res = await gisAPI.getSegment(segmentId)
    const detail = res.data?.data
    if (detail) {
      segmentDetail.value = detail
      applySegmentGeometryUpdate(detail.segment.source_id, detail.segment.geometry, detail.segment.geometry_version)
    }
    conflict.value = false
    saveError.value = ''
    autoSaveError.value = ''
    return detail
  }

  function scheduleSearch(query, type) {
    searchQuery.value = query
    if (searchTimer) clearTimeout(searchTimer)
    if (!query || !query.trim()) {
      searchResults.value = []
      searchLoading.value = false
      return
    }
    searchTimer = setTimeout(() => runSearch(query.trim(), type), SEARCH_DEBOUNCE_MS)
  }

  async function runSearch(query, type) {
    if (searchAbort) searchAbort.abort()
    searchAbort = new AbortController()
    const signal = searchAbort.signal

    searchLoading.value = true
    searchError.value = ''
    try {
      const res = await gisAPI.search(query, 20, signal, type)
      if (signal.aborted) return
      searchResults.value = res.data?.data || []
    } catch (err) {
      if (signal.aborted) return
      searchError.value = err?.response?.data?.detail || 'Tìm kiếm thất bại'
      searchResults.value = []
    } finally {
      if (!signal.aborted) searchLoading.value = false
    }
  }

  function clearSearch() {
    searchQuery.value = ''
    searchResults.value = []
    searchError.value = ''
  }

  function toggleMeasureMode(val) {
    const next = val != null ? val : !measureMode.value
    measureMode.value = next
    if (next) {
      clearSelection()
    } else {
      resetMeasure()
    }
  }

  function addMeasurePoint(lat, lng) {
    if (!measureMode.value) return
    measurePoints.value = [...measurePoints.value, { lat, lng }]
    scheduleMeasureFetch()
  }

  function undoMeasurePoint() {
    if (!measurePoints.value.length) return
    measurePoints.value = measurePoints.value.slice(0, -1)
    if (measurePoints.value.length < 2) {
      measureResult.value = null
      if (measureAbort) measureAbort.abort()
      return
    }
    scheduleMeasureFetch()
  }

  function resetMeasure() {
    measurePoints.value = []
    measureResult.value = null
    measureError.value = ''
    measureLoading.value = false
    if (measureDebounceTimer) clearTimeout(measureDebounceTimer)
    if (measureAbort) measureAbort.abort()
  }

  function scheduleMeasureFetch() {
    if (measureDebounceTimer) clearTimeout(measureDebounceTimer)
    if (measurePoints.value.length < 2) {
      measureResult.value = null
      return
    }
    measureDebounceTimer = setTimeout(runMeasureFetch, MEASURE_DEBOUNCE_MS)
  }

  async function runMeasureFetch() {
    if (measureAbort) measureAbort.abort()
    measureAbort = new AbortController()
    const signal = measureAbort.signal
    const apiPoints = measurePoints.value.map(p => [p.lng, p.lat])

    measureLoading.value = true
    measureError.value = ''
    try {
      const res = await gisAPI.measure(apiPoints, signal)
      if (signal.aborted) return
      measureResult.value = res.data?.data || null
    } catch (err) {
      if (signal.aborted) return
      measureError.value = err?.response?.data?.detail || 'Không đo được khoảng cách'
      measureResult.value = null
    } finally {
      if (!signal.aborted) measureLoading.value = false
    }
  }

  function dispose() {
    if (idleTimer) clearTimeout(idleTimer)
    if (searchTimer) clearTimeout(searchTimer)
    if (viewportAbort) viewportAbort.abort()
    if (searchAbort) searchAbort.abort()
    if (measureDebounceTimer) clearTimeout(measureDebounceTimer)
    if (measureAbort) measureAbort.abort()
    if (routeModeAbort) routeModeAbort.abort()
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
  }

  return {
    points, clusters, segments, loadingMap, mapError,
    selectedPoint, selectedSegmentId, segmentDetail, loadingSegmentDetail, segmentDetailError,
    selectedRouteId, routeSegments, loadingRoute, routeError,
    routeMode, routeModeLabel, routeModePoints, routeModeSegments, loadingRouteMode, routeModeError,
    editingSegmentId, originalGeometry, currentGeometry, isDirty, autoSaving, autoSaveError, saveError, conflict,
    pointsDraggable, savingPointId, pointSaveError,
    visiblePointTypes,
    phanLoaiList, loadingPhanLoai, phanLoaiError, selectedPhanLoai, loadPhanLoaiTuyen, togglePhanLoai,
    searchQuery, searchResults, searchLoading, searchError,
    measureMode, measurePoints, measureResult, measureLoading, measureError,
    toggleMeasureMode, addMeasurePoint, undoMeasurePoint, resetMeasure,
    scheduleViewportLoad, loadViewport,
    clearSelection, selectPoint, selectSegment,
    loadRoute, clearRoute,
    enterRouteMode, exitRouteMode, reloadRouteMode,
    togglePointTypeVisible, setPointsDraggable, updatePointGeometry,
    startEdit, updateCurrentGeometryFromPath, cancelEdit, finishEditing, reloadSegmentAfterConflict,
    scheduleSearch, clearSearch,
    dispose
  }
}