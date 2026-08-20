import { ref, reactive, shallowRef } from 'vue'
import gisAPI from '../services/gis'
import { boundsToBBox, pathToLineString, cloneGeometry, isValidLineString } from '../utils/geo'

const IDLE_DEBOUNCE_MS = 300
const SEARCH_DEBOUNCE_MS = 350
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

  const editingSegmentId = ref(null)
  const originalGeometry = ref(null)
  const currentGeometry = ref(null)
  const isDirty = ref(false)
  const saving = ref(false)
  const saveError = ref('')
  const conflict = ref(false)

  const pointsDraggable = ref(false)
  const savingPointId = ref(null)
  const pointSaveError = ref('')

  const visiblePointTypes = reactive({ station: true, closure: true, customer: true, underground: true, other: true })

  const searchQuery = ref('')
  const searchResults = ref([])
  const searchLoading = ref(false)
  const searchError = ref('')

  let idleTimer = null
  let viewportAbort = null
  let viewportRequestId = 0
  let searchTimer = null
  let searchAbort = null

  function scheduleViewportLoad(bounds, zoom) {
    if (routeMode.value) return
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(() => loadViewport(bounds, zoom), IDLE_DEBOUNCE_MS)
  }

  async function loadViewport(bounds, zoom) {
    if (!bounds || routeMode.value) return
    const bbox = boundsToBBox(bounds)
    if (bbox.min_lng >= bbox.max_lng || bbox.min_lat >= bbox.max_lat) return

    if (viewportAbort) viewportAbort.abort()
    viewportAbort = new AbortController()
    const myRequestId = ++viewportRequestId
    const signal = viewportAbort.signal

    loadingMap.value = true
    mapError.value = ''

    try {
      const [pointsRes, segmentsRes] = await Promise.all([
        gisAPI.getPoints({ ...bbox, zoom, limit: POINTS_LIMIT }, signal),
        gisAPI.getSegments({ ...bbox, zoom, limit: SEGMENTS_LIMIT }, signal)
      ])

      if (myRequestId !== viewportRequestId) return

      // API /map/points giờ trả về mảng hỗn hợp gồm:
      // - { type: 'point', source_id, ma_diem, ten_diem, lat, lng, point_type, ma_tuyen, ... }
      // - { type: 'cluster', count, lat, lng, bbox, ma_tuyen }  (gom cụm NxN theo viewport)
      // Tách riêng 2 luồng để component bản đồ render khác nhau.
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
    selectedSegmentId.value = null
    segmentDetail.value = null
    selectedPoint.value = point
  }

  async function selectSegment(segmentId) {
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

  async function enterRouteMode({ tuyenId, maTuyen }) {
    loadingRouteMode.value = true
    routeModeError.value = ''
    clearSelection()
    try {
      const params = {}
      if (tuyenId) params.tuyen_id = tuyenId
      else if (maTuyen) params.ma_tuyen = maTuyen
      else throw new Error('missing tuyenId/maTuyen')

      const res = await gisAPI.getRouteMap(params)
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
      routeModeError.value = err?.response?.data?.detail || 'Không tải được tuyến'
      routeMode.value = false
      routeModePoints.value = new Map()
      routeModeSegments.value = new Map()
    } finally {
      loadingRouteMode.value = false
    }
  }

  function exitRouteMode() {
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
    conflict.value = false
  }

  function updateCurrentGeometryFromPath(path) {
    currentGeometry.value = pathToLineString(path)
    isDirty.value = true
  }

  function cancelEdit() {
    editingSegmentId.value = null
    originalGeometry.value = null
    currentGeometry.value = null
    isDirty.value = false
    saveError.value = ''
    conflict.value = false
  }

  async function saveEdit() {
    const segmentId = editingSegmentId.value
    if (!segmentId || !currentGeometry.value) return null
    if (!isValidLineString(currentGeometry.value)) {
      saveError.value = 'Geometry không hợp lệ (cần tối thiểu 2 điểm, toạ độ hợp lệ).'
      return null
    }

    saving.value = true
    saveError.value = ''
    conflict.value = false

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
      }
      editingSegmentId.value = null
      originalGeometry.value = null
      currentGeometry.value = null
      isDirty.value = false
      return updated
    } catch (err) {
      if (err?.response?.status === 409) {
        conflict.value = true
        saveError.value =
          err?.response?.data?.detail || 'Geometry đã được người khác cập nhật. Vui lòng tải lại.'
      } else {
        saveError.value = err?.response?.data?.detail || 'Không lưu được geometry.'
      }
      return null
    } finally {
      saving.value = false
    }
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

  function dispose() {
    if (idleTimer) clearTimeout(idleTimer)
    if (searchTimer) clearTimeout(searchTimer)
    if (viewportAbort) viewportAbort.abort()
    if (searchAbort) searchAbort.abort()
  }

  return {
    points, clusters, segments, loadingMap, mapError,
    selectedPoint, selectedSegmentId, segmentDetail, loadingSegmentDetail, segmentDetailError,
    selectedRouteId, routeSegments, loadingRoute, routeError,
    routeMode, routeModeLabel, routeModePoints, routeModeSegments, loadingRouteMode, routeModeError,
    editingSegmentId, originalGeometry, currentGeometry, isDirty, saving, saveError, conflict,
    pointsDraggable, savingPointId, pointSaveError,
    visiblePointTypes,
    searchQuery, searchResults, searchLoading, searchError,
    scheduleViewportLoad, loadViewport,
    clearSelection, selectPoint, selectSegment,
    loadRoute, clearRoute,
    enterRouteMode, exitRouteMode,
    togglePointTypeVisible, setPointsDraggable, updatePointGeometry,
    startEdit, updateCurrentGeometryFromPath, cancelEdit, saveEdit, reloadSegmentAfterConflict,
    scheduleSearch, clearSearch,
    dispose
  }
}