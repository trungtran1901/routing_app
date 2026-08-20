import { normalizePointType } from './pointTypes'

export function computeUndergroundSegmentIds(points, segments) {
  const underground = new Set()
  const getPoint = id => (points.get ? points.get(id) : points[id])
  const isUndergroundPoint = id => {
    const p = getPoint(id)
    return !!p && normalizePointType(p.point_type) === 'underground'
  }

  const byRoute = new Map()
  segments.forEach(seg => {
    const key = seg.ma_tuyen || '__no_route__'
    if (!byRoute.has(key)) byRoute.set(key, [])
    byRoute.get(key).push(seg)
  })

  byRoute.forEach(routeSegments => {
    const adjacency = new Map() 
    routeSegments.forEach(seg => {
      const a = seg.start_point_id || seg.from
      const b = seg.end_point_id || seg.to
      const segId = seg.source_id || seg.id
      if (!a || !b || !segId) return
      if (!adjacency.has(a)) adjacency.set(a, [])
      if (!adjacency.has(b)) adjacency.set(b, [])
      adjacency.get(a).push({ to: b, segId })
      adjacency.get(b).push({ to: a, segId })
    })

    const visitedNodes = new Set()
    const visitedEdges = new Set()
    const allNodes = [...adjacency.keys()]
    const endpoints = allNodes.filter(n => (adjacency.get(n) || []).length === 1)
    const starts = endpoints.length ? endpoints : allNodes

    starts.forEach(startNode => {
      if (visitedNodes.has(startNode)) return
      let state = isUndergroundPoint(startNode)
      const queue = [{ node: startNode, state }]
      visitedNodes.add(startNode)

      while (queue.length) {
        const cur = queue.shift()
        const neighbors = adjacency.get(cur.node) || []
        neighbors.forEach(({ to, segId }) => {
          if (visitedEdges.has(segId)) return
          visitedEdges.add(segId)
          if (cur.state) underground.add(segId)
          if (!visitedNodes.has(to)) {
            visitedNodes.add(to)
            const nextState = isUndergroundPoint(to) ? !cur.state : cur.state
            queue.push({ node: to, state: nextState })
          }
        })
      }
    })
  })

  return underground
}