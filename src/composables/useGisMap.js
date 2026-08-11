import { ref, shallowRef } from 'vue'
import gisAPI from '../services/gis'
import { boundsToBBox, pathToLineString, cloneGeometry, isValidLineString } from '../utils/geo'

const IDLE_DEBOUNCE_MS = 300
const SEARCH_DEBOUNCE_MS = 350
const POINTS_LIMIT = 2000
const SEGMENTS_LIMIT = 2000

/**
 * All GIS map state + API orchestration in one composable.
 * points/segments are shallowRef<Map> (not deep-reactive) so Vue never
 * tracks per-coordinate mutations of thousands of features.
 */
export function useGisMap() {
  // ── Viewport data ──
  const points = shallowRef(new Map())
  const segments = shallowRef(new Map())
  const loadingMap = ref(false)
  const mapError = ref('')

  // ── Selection ──
  const selectedPoint = ref(null)
  const selectedSegmentId = ref(null)
  const segmentDetail = ref(null)
  const loadingSegmentDetail = ref(false)
  const segmentDetailError = ref('')

  // ── Route (full tuyến, independent of viewport) ──
  const selectedRouteId = ref('')
  const routeSegments = shallowRef([])
  const loadingRoute = ref(false)
  const routeError = ref('')

  // ── Geometry editing ──
  const editingSegmentId = ref(null)
  const originalGeometry = ref(null)
  const currentGeometry = ref(null)
  const isDirty = ref(false)
  const saving = ref(false)
  const saveError = ref('')
  const conflict = ref(false)

  // ── Search (points only — see README_GIS.md §9) ──
  const searchQuery = ref('')
  const searchResults = ref([])
  const searchLoading = ref(false)
  const searchError = ref('')

  let idleTimer = null
  let viewportAbort = null
  let viewportRequestId = 0
  let searchTimer = null
  let searchAbort = null

  // ── Viewport loading (debounced on map idle, race-safe) ──
  function scheduleViewportLoad(bounds, zoom) {
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(() => loadViewport(bounds, zoom), IDLE_DEBOUNCE_MS)
  }

  async function loadViewport(bounds, zoom) {
    if (!bounds) return
    const bbox = boundsToBBox(bounds)
    if (bbox.min_lng >= bbox.max_lng || bbox.min_lat >= bbox.max_lat) return

    // Cancel any in-flight viewport request before starting a new one
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

      // Stale response guard: a newer viewport request already superseded this one
      if (myRequestId !== viewportRequestId) return

      const nextPoints = new Map()
      for (const p of pointsRes.data?.data || []) nextPoints.set(p.source_id, p)
      points.value = nextPoints

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

  // ── Selection ──
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

  // ── Route ──
  async function loadRoute(routeId) {
    if (!routeId) return
    selectedRouteId.value = routeId
    loadingRoute.value = true
    routeError.value = ''
    try {
      const res = await gisAPI.getRoute(routeId)
      routeSegments.value = res.data?.data || []
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

  // ── Geometry editing ──
  function startEdit(segmentId, geometry) {
    editingSegmentId.value = segmentId
    originalGeometry.value = cloneGeometry(geometry)
    currentGeometry.value = cloneGeometry(geometry) // independent clone, not a reference
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
        // Backend response is the source of truth for geometry_version/source
        const nextSegments = new Map(segments.value)
        nextSegments.set(updated.source_id, { ...nextSegments.get(updated.source_id), ...updated })
        segments.value = nextSegments

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
      const nextSegments = new Map(segments.value)
      nextSegments.set(detail.segment.source_id, detail.segment)
      segments.value = nextSegments
    }
    conflict.value = false
    saveError.value = ''
    return detail
  }

  // ── Search (debounced, race-safe, points-only per API) ──
  function scheduleSearch(query) {
    searchQuery.value = query
    if (searchTimer) clearTimeout(searchTimer)
    if (!query || !query.trim()) {
      searchResults.value = []
      searchLoading.value = false
      return
    }
    searchTimer = setTimeout(() => runSearch(query.trim()), SEARCH_DEBOUNCE_MS)
  }

  async function runSearch(query) {
    if (searchAbort) searchAbort.abort()
    searchAbort = new AbortController()
    const signal = searchAbort.signal

    searchLoading.value = true
    searchError.value = ''
    try {
      const res = await gisAPI.search(query, 20, signal)
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
    points, segments, loadingMap, mapError,
    selectedPoint, selectedSegmentId, segmentDetail, loadingSegmentDetail, segmentDetailError,
    selectedRouteId, routeSegments, loadingRoute, routeError,
    editingSegmentId, originalGeometry, currentGeometry, isDirty, saving, saveError, conflict,
    searchQuery, searchResults, searchLoading, searchError,
    scheduleViewportLoad, loadViewport,
    clearSelection, selectPoint, selectSegment,
    loadRoute, clearRoute,
    startEdit, updateCurrentGeometryFromPath, cancelEdit, saveEdit, reloadSegmentAfterConflict,
    scheduleSearch, clearSearch,
    dispose
  }
}
