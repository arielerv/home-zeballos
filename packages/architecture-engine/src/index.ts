import { polygonArea, polygonBounds, polygonCentroid, wallCenter, wallLength, wallRotation } from '@t3-designer/geometry'
import type { ArchitecturalRoom, ArchitecturalWall } from '@t3-designer/architecture-model'

export type RoomPlanGeometry = {
  areaM2: number
  centroid: readonly [number, number]
  bounds: ReturnType<typeof polygonBounds>
}

export function roomPlanGeometry(room: Pick<ArchitecturalRoom, 'polygon'>): RoomPlanGeometry {
  return {
    areaM2: polygonArea(room.polygon),
    centroid: polygonCentroid(room.polygon),
    bounds: polygonBounds(room.polygon),
  }
}

export type WallPlanGeometry = {
  lengthM: number
  center: readonly [number, number]
  rotationRadians: number
}

export function wallPlanGeometry(wall: Pick<ArchitecturalWall, 'from' | 'to'>): WallPlanGeometry {
  return {
    lengthM: wallLength(wall),
    center: wallCenter(wall),
    rotationRadians: wallRotation(wall),
  }
}

export type PlanPoint = readonly [x: number, z: number]
export type SitePoint = readonly [x: number, z: number]
export type BlenderPoint = readonly [x: number, y: number, z: number]
export type PlanPlacement = {
  /** Site-frame origin of the local plan, in meters [east, south]. */
  origin: SitePoint
  /** Rotation around the vertical axis, in radians. */
  rotationRadians: number
}

const assertFinite = (values: readonly number[]) => {
  if (!values.every(Number.isFinite)) throw new TypeError('Coordinate values must be finite')
}

/** Map architectural local-XZ plan coordinates into site east/south coordinates. */
export function planToSite(point: PlanPoint, placement: PlanPlacement): SitePoint {
  assertFinite([...point, ...placement.origin, placement.rotationRadians])
  const [x, z] = point
  const [originX, originZ] = placement.origin
  const c = Math.cos(placement.rotationRadians), s = Math.sin(placement.rotationRadians)
  return [c * x + s * z + originX, -s * x + c * z + originZ]
}

/** Inverse of planToSite; useful for proving source/renderer alignment. */
export function siteToPlan(point: SitePoint, placement: PlanPlacement): PlanPoint {
  assertFinite([...point, ...placement.origin, placement.rotationRadians])
  const [siteX, siteZ] = point
  const [originX, originZ] = placement.origin
  const dx = siteX - originX, dz = siteZ - originZ
  const c = Math.cos(placement.rotationRadians), s = Math.sin(placement.rotationRadians)
  return [c * dx - s * dz, s * dx + c * dz]
}

/** Blender uses Z-up and north-positive Y; site coordinates use Y-up and south-positive Z. */
export function siteToBlender(point: SitePoint, elevation: number): BlenderPoint {
  assertFinite([...point, elevation])
  return [point[0], elevation, -point[1]]
}

/** Compose the documented local-plan → site → Blender conversion. */
export function planToBlender(point: PlanPoint, elevation: number, placement: PlanPlacement): BlenderPoint {
  return siteToBlender(planToSite(point, placement), elevation)
}
