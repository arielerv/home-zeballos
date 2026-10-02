import { ArchitecturalProjectSchema, type ArchitecturalProject } from '@t3-designer/architecture-model'

export type FindingSeverity = 'error' | 'warning'
export type FindingCategory = 'schema' | 'geometry' | 'quality' | 'evidence'

export type ArchitectureFinding = {
  severity: FindingSeverity
  category: FindingCategory
  code: string
  elementIds: string[]
  message: string
  fixHint?: string
  path: PropertyKey[]
}

export type ArchitectureValidationResult = {
  valid: boolean
  findings: ArchitectureFinding[]
  project?: ArchitecturalProject
}

/** Deterministic structural/evidence validation; it does not certify code compliance or survey accuracy. */
export function validateArchitectureProject(input: unknown): ArchitectureValidationResult {
  const parsed = ArchitecturalProjectSchema.safeParse(input)
  if (!parsed.success) {
    const findings = parsed.error.issues.map(issue => ({
      severity: 'error' as const,
      category: 'schema' as const,
      code: `schema.${issue.code}`,
      elementIds: [],
      message: issue.message,
      fixHint: 'Correct the value at the reported path, then validate again.',
      path: issue.path,
    })).sort(compareFindings)
    return { valid: false, findings }
  }

  const project = parsed.data
  const findings: ArchitectureFinding[] = []
  if (!project.site.propertyBoundary) {
    findings.push({
      severity: 'warning',
      category: 'quality',
      code: 'site.boundary_missing',
      elementIds: [project.site.id],
      message: 'The project has no complete property boundary.',
      fixHint: 'Add the full property boundary from a cited source; do not subdivide by cadastral labels.',
      path: ['site', 'propertyBoundary'],
    })
  }

  project.assumptions.forEach(assumption => {
    if (assumption.status === 'open') {
      findings.push({
        severity: 'warning',
        category: 'quality',
        code: 'assumption.open',
        elementIds: assumption.affectedElementIds,
        message: assumption.statement,
        fixHint: 'Resolve or explicitly accept/reject this assumption before relying on affected geometry.',
        path: ['assumptions', assumption.id],
      })
    }
  })
  project.renovations.forEach((renovation, index) => {
    const scope = renovation.scopeImageRegion
    if (scope && !project.evidence.find(item => item.id === scope.evidenceId)?.calibration) {
      findings.push({
        severity: 'warning', category: 'evidence', code: 'evidence.image_uncalibrated',
        elementIds: [renovation.id, scope.evidenceId].sort(compareText),
        message: 'Renovation scope is in image pixels and has no metric calibration.',
        fixHint: 'Keep this scope separate from building geometry until reliable dimensions and corresponding plan control points are reviewed.',
        path: ['renovations', index, 'scopeImageRegion'],
      })
    }
  })

  const addPolygonFinding = (polygon: readonly (readonly [number, number])[], id: string, path: PropertyKey[]) => {
    if (hasSelfIntersection(polygon)) {
      findings.push({
        severity: 'error', category: 'geometry', code: 'geometry.polygon_self_intersection',
        elementIds: [id], message: 'Polygon edges cross or touch at a non-adjacent point.',
        fixHint: 'Correct the vertex order so the polygon boundary is simple.', path,
      })
    }
  }
  if (project.site.propertyBoundary) {
    addPolygonFinding(project.site.propertyBoundary, project.site.id, ['site', 'propertyBoundary'])
  }
  project.site.features.forEach((feature, index) => {
    if (feature.polygon) addPolygonFinding(feature.polygon, feature.id, ['site', 'features', index, 'polygon'])
  })
  project.buildings.forEach((building, buildingIndex) => {
    const basePath: PropertyKey[] = ['buildings', buildingIndex]
    if (building.footprint) addPolygonFinding(building.footprint, building.id, [...basePath, 'footprint'])
    building.rooms.forEach((room, index) => addPolygonFinding(room.polygon, room.id, [...basePath, 'rooms', index, 'polygon']))
    building.slabs.forEach((slab, index) => addPolygonFinding(slab.polygon, slab.id, [...basePath, 'slabs', index, 'polygon']))
    building.roofs.forEach((roof, index) => addPolygonFinding(roof.footprint, roof.id, [...basePath, 'roofs', index, 'footprint']))
    for (let first = 0; first < building.rooms.length; first += 1) {
      const left = building.rooms[first]
      const leftArea = polygonArea(left.polygon)
      const reportedArea = left.reportedAreaM2 ?? left.targetAreaM2
      if (reportedArea !== undefined && Math.abs(leftArea - reportedArea) > 1e-8) {
        findings.push({
          severity: 'warning', category: 'evidence', code: 'room.area_source_mismatch',
          elementIds: [left.id],
          message: `Polygon area ${leftArea.toFixed(4)} m² differs from the source area ${reportedArea.toFixed(2)} m².`,
          fixHint: 'Review the 2D trace, source-area interpretation, and metric calibration; do not resize geometry automatically.',
          path: [...basePath, 'rooms', first, 'polygon'],
        })
      }
      for (let second = first + 1; second < building.rooms.length; second += 1) {
        const right = building.rooms[second]
        if (left.levelId === right.levelId && polygonsOverlap(left.polygon, right.polygon)) {
          findings.push({
            severity: 'error', category: 'geometry', code: 'geometry.rooms_overlap',
            elementIds: [left.id, right.id].sort(compareText),
            message: 'Room interiors overlap on the same level.',
            fixHint: 'Resolve the room boundaries in the reviewed 2D plan; shared edges are allowed.',
            path: [...basePath, 'rooms', second, 'polygon'],
          })
        }
      }
    }
    const openingsByWall = new Map<string, Array<{ opening: typeof building.openings[number]; index: number }>>()
    building.openings.forEach((opening, index) => {
      const openings = openingsByWall.get(opening.wallId) ?? []
      openings.push({ opening, index })
      openingsByWall.set(opening.wallId, openings)
    })
    openingsByWall.forEach(openings => {
      for (let first = 0; first < openings.length; first += 1) {
        for (let second = first + 1; second < openings.length; second += 1) {
          const left = openings[first]
          const right = openings[second]
          const horizontalOverlap = Math.min(left.opening.offset + left.opening.width, right.opening.offset + right.opening.width)
            - Math.max(left.opening.offset, right.opening.offset)
          const leftBottom = left.opening.sillHeight ?? 0
          const rightBottom = right.opening.sillHeight ?? 0
          const verticalOverlap = Math.min(leftBottom + left.opening.height, rightBottom + right.opening.height)
            - Math.max(leftBottom, rightBottom)
          if (horizontalOverlap > epsilon && verticalOverlap > epsilon) {
            findings.push({
              severity: 'error', category: 'geometry', code: 'geometry.openings_overlap',
              elementIds: [left.opening.id, right.opening.id].sort(compareText),
              message: 'Openings on the same wall overlap.',
              fixHint: 'Adjust opening offsets or widths so their intervals do not overlap.',
              path: [...basePath, 'openings', right.index],
            })
          }
        }
      }
    })

    const doors = building.openings.filter(opening => opening.kind === 'door')
    const roomsWithDoors = new Map<string, Set<string>>()
    const exteriorDoorRooms = new Set<string>()
    for (const door of doors) {
      const wall = building.walls.find(candidate => candidate.id === door.wallId)
      if (!wall) continue
      const connectedRooms = building.rooms.filter(room => room.levelId === door.levelId && doorTouchesRoomBoundary(door, wall, room.polygon))
      for (const room of connectedRooms) {
        const linked = roomsWithDoors.get(room.id) ?? new Set<string>()
        for (const otherRoom of connectedRooms) if (otherRoom.id !== room.id) linked.add(otherRoom.id)
        roomsWithDoors.set(room.id, linked)
        if (wall.kind === 'exterior') exteriorDoorRooms.add(room.id)
      }
    }

    for (const [roomIndex, room] of building.rooms.entries()) {
      const connectedDoors = roomsWithDoors.has(room.id) || exteriorDoorRooms.has(room.id)
      if (!connectedDoors) {
        findings.push({
          severity: 'error', category: 'quality', code: 'room.door_access_missing',
          elementIds: [room.id],
          message: 'No modeled door connects this room boundary to another room or the exterior.',
          fixHint: 'Verify access in the source plan and add an evidence-linked door/opening to its host wall. Do not invent a doorway.',
          path: [...basePath, 'rooms', roomIndex],
        })
      }

      const visited = new Set<string>([room.id])
      const queue = [room.id]
      while (queue.length > 0) {
        const current = queue.shift()!
        for (const next of roomsWithDoors.get(current) ?? []) {
          if (!visited.has(next)) {
            visited.add(next)
            queue.push(next)
          }
        }
      }
      if (![...visited].some(roomId => exteriorDoorRooms.has(roomId))) {
        findings.push({
          severity: 'error', category: 'quality', code: 'room.egress_path_missing',
          elementIds: [...visited].sort(compareText),
          message: `Room "${room.name}" has no modeled door path to an exterior door on its level.`,
          fixHint: 'Check the room-door graph against the plan and confirm the exit; do not infer an unshown route.',
          path: [...basePath, 'rooms', roomIndex],
        })
      }
    }
  })
  project.renovations.forEach((renovation, index) => {
    const scope = renovation.scopeImageRegion
    if (scope) addPolygonFinding(scope.polygonPixels, renovation.id, ['renovations', index, 'scopeImageRegion', 'polygonPixels'])
  })

  const provenanceRecords = [
    { id: project.site.id, provenance: project.site.provenance, path: ['site', 'provenance'] },
    ...project.site.features.map((item, index) => ({ id: item.id, provenance: item.provenance, path: ['site', 'features', index, 'provenance'] })),
    ...project.assumptions.map((item, index) => ({ id: item.id, provenance: item.provenance, path: ['assumptions', index, 'provenance'] })),
    ...project.buildings.flatMap((building, buildingIndex) => {
      const root: PropertyKey[] = ['buildings', buildingIndex]
      return [
        { id: building.id, provenance: building.provenance, path: [...root, 'provenance'] },
        ...building.levels.map((item, index) => ({ id: item.id, provenance: item.provenance, path: [...root, 'levels', index, 'provenance'] })),
        ...building.rooms.map((item, index) => ({ id: item.id, provenance: item.provenance, path: [...root, 'rooms', index, 'provenance'] })),
        ...building.walls.map((item, index) => ({ id: item.id, provenance: item.provenance, path: [...root, 'walls', index, 'provenance'] })),
        ...building.openings.map((item, index) => ({ id: item.id, provenance: item.provenance, path: [...root, 'openings', index, 'provenance'] })),
        ...building.slabs.map((item, index) => ({ id: item.id, provenance: item.provenance, path: [...root, 'slabs', index, 'provenance'] })),
        ...building.roofs.map((item, index) => ({ id: item.id, provenance: item.provenance, path: [...root, 'roofs', index, 'provenance'] })),
      ]
    }),
    ...project.renovations.map((item, index) => ({ id: item.id, provenance: item.provenance, path: ['renovations', index, 'provenance'] })),
  ]
  provenanceRecords.forEach(record => {
    if (record.provenance.evidenceIds.length === 0) {
      findings.push({
        severity: 'warning', category: 'evidence', code: 'evidence.missing_reference',
        elementIds: [record.id],
        message: 'This element has no linked source evidence.',
        fixHint: 'Attach a measurement, source document, image, or manual note; otherwise retain its explicit uncertainty.',
        path: record.path,
      })
    }
  })

  const sortedFindings = findings.sort(compareFindings)
  return { valid: !sortedFindings.some(finding => finding.severity === 'error'), findings: sortedFindings, project }
}

const epsilon = 1e-8
const boundaryNumericTolerance = 1e-4

function polygonArea(points: readonly (readonly [number, number])[]): number {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length]
    return sum + point[0] * next[1] - next[0] * point[1]
  }, 0)) / 2
}

function polygonsOverlap(
  left: readonly (readonly [number, number])[],
  right: readonly (readonly [number, number])[],
): boolean {
  if (left.some(point => strictlyInside(point, right)) || right.some(point => strictlyInside(point, left))) return true
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const a = left[leftIndex], b = left[(leftIndex + 1) % left.length]
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const c = right[rightIndex], d = right[(rightIndex + 1) % right.length]
      if (properSegmentsIntersect(a, b, c, d)) return true
    }
  }
  return false
}

function strictlyInside(point: readonly [number, number], polygon: readonly (readonly [number, number])[]): boolean {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const [x, y] = polygon[index], [previousX, previousY] = polygon[previous]
    if ((y > point[1]) !== (previousY > point[1])
      && point[0] < (previousX - x) * (point[1] - y) / (previousY - y) + x) inside = !inside
  }
  return inside && !polygon.some((start, index) => pointOnSegment(point, start, polygon[(index + 1) % polygon.length], boundaryNumericTolerance))
}

function properSegmentsIntersect(
  a: readonly [number, number], b: readonly [number, number],
  c: readonly [number, number], d: readonly [number, number],
): boolean {
  const orient = (p: readonly [number, number], q: readonly [number, number], r: readonly [number, number]) =>
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
  const abC = orient(a, b, c), abD = orient(a, b, d), cdA = orient(c, d, a), cdB = orient(c, d, b)
  return (abC > epsilon && abD < -epsilon || abC < -epsilon && abD > epsilon)
    && (cdA > epsilon && cdB < -epsilon || cdA < -epsilon && cdB > epsilon)
}

function pointOnSegment(
  point: readonly [number, number], start: readonly [number, number], end: readonly [number, number], tolerance: number,
): boolean {
  const dx = end[0] - start[0], dy = end[1] - start[1]
  const length = Math.hypot(dx, dy)
  if (length <= epsilon) return Math.hypot(point[0] - start[0], point[1] - start[1]) <= tolerance
  const perpendicular = Math.abs(dx * (start[1] - point[1]) - (start[0] - point[0]) * dy) / length
  const projection = ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (length * length)
  return perpendicular <= tolerance && projection >= -tolerance / length && projection <= 1 + tolerance / length
}

function doorTouchesRoomBoundary(
  door: ArchitecturalProject['buildings'][number]['openings'][number],
  wall: ArchitecturalProject['buildings'][number]['walls'][number],
  polygon: readonly (readonly [number, number])[],
): boolean {
  const dx = wall.to[0] - wall.from[0], dy = wall.to[1] - wall.from[1]
  const length = Math.hypot(dx, dy)
  if (length <= epsilon) return false
  const allowedOffset = wall.thickness / 2 + boundaryNumericTolerance
  return polygon.some((edgeStart, index) => {
    const edgeEnd = polygon[(index + 1) % polygon.length]
    const edgeDx = edgeEnd[0] - edgeStart[0], edgeDy = edgeEnd[1] - edgeStart[1]
    const edgeLength = Math.hypot(edgeDx, edgeDy)
    if (edgeLength <= epsilon) return false
    const startOffset = Math.abs(dx * (edgeStart[1] - wall.from[1]) - (edgeStart[0] - wall.from[0]) * dy) / length
    const endOffset = Math.abs(dx * (edgeEnd[1] - wall.from[1]) - (edgeEnd[0] - wall.from[0]) * dy) / length
    if (startOffset > allowedOffset || endOffset > allowedOffset) return false
    const firstProjection = ((edgeStart[0] - wall.from[0]) * dx + (edgeStart[1] - wall.from[1]) * dy) / length
    const secondProjection = ((edgeEnd[0] - wall.from[0]) * dx + (edgeEnd[1] - wall.from[1]) * dy) / length
    return Math.min(Math.max(firstProjection, secondProjection), door.offset + door.width)
      - Math.max(Math.min(firstProjection, secondProjection), door.offset) > boundaryNumericTolerance
  })
}

function hasSelfIntersection(points: readonly (readonly [number, number])[]): boolean {
  const count = points.length
  for (let index = 0; index < count; index += 1) {
    const previous = points[(index + count - 1) % count]
    const current = points[index]
    const next = points[(index + 1) % count]
    const first = [current[0] - previous[0], current[1] - previous[1]]
    const second = [next[0] - current[0], next[1] - current[1]]
    const cross = first[0] * second[1] - first[1] * second[0]
    const dot = first[0] * second[0] + first[1] * second[1]
    if (Math.abs(cross) <= epsilon && dot < -epsilon) return true
  }
  for (let first = 0; first < count; first += 1) {
    const firstNext = (first + 1) % count
    for (let second = first + 1; second < count; second += 1) {
      const secondNext = (second + 1) % count
      if (first === second || firstNext === second || secondNext === first) continue
      if (segmentsIntersect(points[first], points[firstNext], points[second], points[secondNext])) return true
    }
  }
  return false
}

function segmentsIntersect(
  a: readonly [number, number], b: readonly [number, number],
  c: readonly [number, number], d: readonly [number, number],
): boolean {
  const orient = (p: readonly [number, number], q: readonly [number, number], r: readonly [number, number]) =>
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
  const onSegment = (p: readonly [number, number], q: readonly [number, number], r: readonly [number, number]) =>
    Math.min(p[0], r[0]) - epsilon <= q[0] && q[0] <= Math.max(p[0], r[0]) + epsilon
    && Math.min(p[1], r[1]) - epsilon <= q[1] && q[1] <= Math.max(p[1], r[1]) + epsilon
  const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b)
  if ((o1 > epsilon && o2 < -epsilon || o1 < -epsilon && o2 > epsilon)
    && (o3 > epsilon && o4 < -epsilon || o3 < -epsilon && o4 > epsilon)) return true
  return Math.abs(o1) <= epsilon && onSegment(a, c, b)
    || Math.abs(o2) <= epsilon && onSegment(a, d, b)
    || Math.abs(o3) <= epsilon && onSegment(c, a, d)
    || Math.abs(o4) <= epsilon && onSegment(c, b, d)
}

function compareFindings(left: ArchitectureFinding, right: ArchitectureFinding): number {
  const leftPath = left.path.map(String).join('.')
  const rightPath = right.path.map(String).join('.')
  if (leftPath !== rightPath) return compareText(leftPath, rightPath)
  if (left.code !== right.code) return compareText(left.code, right.code)
  return 0
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}
