import { z } from 'zod'

export const ARCHITECTURE_MODEL_VERSION = 1

const id = z.string().trim().min(1)
const finite = z.number().finite()
const positive = finite.positive()
const confidence = finite.min(0).max(1)
const point2D = z.tuple([finite, finite])
const designState = z.enum(['retained', 'new', 'modified'])

export const Polygon2DSchema = z.array(point2D).min(3).refine(points => {
  const twiceArea = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length]
    return sum + point[0] * next[1] - next[0] * point[1]
  }, 0)
  return Math.abs(twiceArea) > 1e-8
}, 'Polygon must enclose a nonzero area')

export const EvidenceSchema = z.object({
  id,
  kind: z.enum(['user_upload', 'measurement', 'photo', 'pdf', 'image', 'dxf', 'web_source', 'manual_note', 'existing_model']),
  label: z.string().trim().min(1),
  uri: z.string().trim().min(1).optional(),
  page: z.number().int().positive().optional(),
  capturedAt: z.iso.date().optional(),
  description: z.string().trim().min(1).optional(),
  /** Calibration must be explicit; image pixels are never silently treated as meters. */
  calibration: z.object({
    knownLengthMeters: positive,
    fromImage: point2D,
    toImage: point2D,
    /** Corresponding control points in the finished-house local plan [X, Z], meters. */
    fromWorld: point2D,
    toWorld: point2D,
  }).superRefine((value, context) => {
    if (Math.hypot(value.toImage[0] - value.fromImage[0], value.toImage[1] - value.fromImage[1]) <= 1e-8) {
      context.addIssue({ code: 'custom', message: 'Calibration image points must differ', path: ['toImage'] })
    }
    const worldLength = Math.hypot(value.toWorld[0] - value.fromWorld[0], value.toWorld[1] - value.fromWorld[1])
    if (Math.abs(worldLength - value.knownLengthMeters) > Math.max(0.01, value.knownLengthMeters * 0.001)) {
      context.addIssue({ code: 'custom', message: 'World control-point distance must match the known metric length', path: ['toWorld'] })
    }
  }).optional(),
})
export type Evidence = z.infer<typeof EvidenceSchema>

export const ProvenanceSchema = z.object({
  kind: z.enum(['observed', 'inferred', 'estimated', 'user_defined', 'generated', 'derived']),
  confidence,
  evidenceIds: z.array(id),
  note: z.string().trim().min(1).optional(),
})
export type Provenance = z.infer<typeof ProvenanceSchema>

const levelSchema = z.object({
  id,
  name: z.string().trim().min(1),
  index: z.number().int(),
  /** Absolute vertical datum in project-local meters; never inferred from mesh extrusion. */
  elevation: finite,
  floorToCeiling: positive.optional(),
  provenance: ProvenanceSchema,
})

const roomSchema = z.object({
  id,
  levelId: id,
  name: z.string().trim().min(1),
  polygon: Polygon2DSchema,
  reportedAreaM2: positive.optional(),
  targetAreaM2: positive.optional(),
  /** Final-house classification; this is not an alternate before/after model. */
  designState,
  provenance: ProvenanceSchema,
})

const wallSchema = z.object({
  id,
  levelId: id,
  from: point2D,
  to: point2D,
  thickness: positive,
  height: positive,
  kind: z.enum(['exterior', 'interior', 'party', 'structural', 'other']),
  designState,
  provenance: ProvenanceSchema,
}).refine(wall => Math.hypot(wall.to[0] - wall.from[0], wall.to[1] - wall.from[1]) > 1e-8, {
  message: 'Wall endpoints must differ',
  path: ['to'],
})

const openingSchema = z.object({
  id,
  levelId: id,
  wallId: id,
  kind: z.enum(['door', 'window', 'other']),
  offset: finite.nonnegative(),
  width: positive,
  height: positive,
  sillHeight: finite.nonnegative().optional(),
  designState,
  provenance: ProvenanceSchema,
})

const slabSchema = z.object({
  id,
  levelId: id,
  name: z.string().trim().min(1),
  polygon: Polygon2DSchema,
  elevation: finite,
  thickness: positive,
  designState,
  provenance: ProvenanceSchema,
})

const roofSchema = z.object({
  id,
  name: z.string().trim().min(1),
  footprint: Polygon2DSchema,
  baseElevation: finite,
  ridgeElevation: finite.optional(),
  designState,
  provenance: ProvenanceSchema,
}).refine(roof => roof.ridgeElevation === undefined || roof.ridgeElevation >= roof.baseElevation, {
  message: 'Roof ridge elevation cannot be below its base elevation',
  path: ['ridgeElevation'],
})

const buildingSchema = z.object({
  id,
  name: z.string().trim().min(1),
  /** One complete, finished building; changes are tagged on its elements. */
  footprint: Polygon2DSchema.optional(),
  levels: z.array(levelSchema).min(1),
  rooms: z.array(roomSchema),
  walls: z.array(wallSchema),
  openings: z.array(openingSchema),
  slabs: z.array(slabSchema),
  roofs: z.array(roofSchema),
  provenance: ProvenanceSchema,
}).superRefine((building, context) => {
  const levelIds = new Set(building.levels.map(level => level.id))
  const levelIndexes = new Set<number>()
  building.levels.forEach((level, index) => {
    if (levelIndexes.has(level.index)) {
      context.addIssue({ code: 'custom', message: 'Level indexes must be unique within a building', path: ['levels', index, 'index'] })
    }
    levelIndexes.add(level.index)
  })
  const entities = [...building.rooms, ...building.walls, ...building.openings, ...building.slabs, ...building.roofs]
  const entityIds = new Set<string>()
  entities.forEach((entity, index) => {
    if (entityIds.has(entity.id)) {
      context.addIssue({ code: 'custom', message: 'Building element IDs must be unique', path: ['elements', index, 'id'] })
    }
    entityIds.add(entity.id)
    if ('levelId' in entity && !levelIds.has(entity.levelId)) {
      context.addIssue({ code: 'custom', message: 'Element must reference an existing level', path: ['elements', index, 'levelId'] })
    }
  })
  const walls = new Map(building.walls.map(wall => [wall.id, wall]))
  building.openings.forEach((opening, index) => {
    const wall = walls.get(opening.wallId)
    if (!wall) {
      context.addIssue({ code: 'custom', message: 'Opening must reference an existing wall', path: ['openings', index, 'wallId'] })
      return
    }
    if (opening.levelId !== wall.levelId) {
      context.addIssue({ code: 'custom', message: 'Opening and host wall must belong to the same level', path: ['openings', index, 'levelId'] })
    }
    const wallLength = Math.hypot(wall.to[0] - wall.from[0], wall.to[1] - wall.from[1])
    if (opening.offset + opening.width > wallLength + 1e-8) {
      context.addIssue({ code: 'custom', message: 'Opening extends beyond its host wall', path: ['openings', index, 'width'] })
    }
    if ((opening.sillHeight ?? 0) + opening.height > wall.height + 1e-8) {
      context.addIssue({ code: 'custom', message: 'Opening extends above its host wall', path: ['openings', index, 'height'] })
    }
  })
})

export const SiteFeatureSchema = z.object({
  id,
  kind: z.enum(['yard', 'patio', 'pool', 'access', 'garden', 'other']),
  name: z.string().trim().min(1),
  polygon: Polygon2DSchema.optional(),
  designState,
  provenance: ProvenanceSchema,
})

export const SiteSchema = z.object({
  id,
  name: z.string().trim().min(1),
  /** The complete property boundary. Cadastral labels are references, not extra parcel cuts. */
  propertyBoundary: Polygon2DSchema.optional(),
  cadastralReference: z.string().trim().min(1).optional(),
  features: z.array(SiteFeatureSchema),
  provenance: ProvenanceSchema,
})

export const AssumptionSchema = z.object({
  id,
  statement: z.string().trim().min(1),
  status: z.enum(['open', 'accepted', 'rejected']),
  affectedElementIds: z.array(id),
  provenance: ProvenanceSchema,
})

export const ImageRegionSchema = z.object({
  evidenceId: id,
  imageWidth: positive,
  imageHeight: positive,
  /** Pixel coordinates in the cited plan; this is not a metric footprint. */
  polygonPixels: Polygon2DSchema,
}).superRefine((region, context) => {
  region.polygonPixels.forEach(([x, y], index) => {
    if (x < 0 || x > region.imageWidth || y < 0 || y > region.imageHeight) {
      context.addIssue({ code: 'custom', message: 'Scope polygon must stay within the source image bounds', path: ['polygonPixels', index] })
    }
  })
})

export const RenovationSchema = z.object({
  id,
  name: z.string().trim().min(1),
  status: z.enum(['tentative', 'in_review', 'approved']),
  /** The single finished building shown in every project view. */
  finishedBuildingId: id,
  scopeImageRegion: ImageRegionSchema.optional(),
  /** IDs of final-building elements whose design is new or modified. */
  affectedElementIds: z.array(id),
  /** Stable site feature IDs retained unchanged in the finished design. */
  preservedSiteFeatureIds: z.array(id),
  provenance: ProvenanceSchema,
})

export const ArchitecturalProjectSchema = z.object({
  schemaVersion: z.literal(ARCHITECTURE_MODEL_VERSION),
  id,
  name: z.string().trim().min(1),
  units: z.literal('meters'),
  coordinateSystem: z.object({
    plan: z.literal('local-xz'),
    vertical: z.literal('y-up'),
    northAzimuth: finite.min(0).max(360).optional(),
  }),
  evidence: z.array(EvidenceSchema),
  assumptions: z.array(AssumptionSchema),
  site: SiteSchema,
  targetBuildingId: id,
  buildings: z.array(buildingSchema).min(1),
  renovations: z.array(RenovationSchema),
}).superRefine((project, context) => {
  const evidenceIds = new Set(project.evidence.map(evidence => evidence.id))
  const buildingIds = new Set(project.buildings.map(building => building.id))
  const targetBuilding = project.buildings.find(building => building.id === project.targetBuildingId)
  const targetElementIds = new Set(targetBuilding ? [
    ...targetBuilding.rooms.map(room => room.id),
    ...targetBuilding.walls.map(wall => wall.id),
    ...targetBuilding.openings.map(opening => opening.id),
    ...targetBuilding.slabs.map(slab => slab.id),
    ...targetBuilding.roofs.map(roof => roof.id),
  ] : [])
  const targetElementStates = new Map(targetBuilding ? [
    ...targetBuilding.rooms.map(room => [room.id, room.designState] as const),
    ...targetBuilding.walls.map(wall => [wall.id, wall.designState] as const),
    ...targetBuilding.openings.map(opening => [opening.id, opening.designState] as const),
    ...targetBuilding.slabs.map(slab => [slab.id, slab.designState] as const),
    ...targetBuilding.roofs.map(roof => [roof.id, roof.designState] as const),
  ] : [])
  const allIds = [
    project.id,
    project.site.id,
    ...project.evidence.map(evidence => evidence.id),
    ...project.site.features.map(feature => feature.id),
    ...project.assumptions.map(assumption => assumption.id),
    ...project.buildings.flatMap(building => [
      building.id,
      ...building.levels.map(level => level.id),
      ...building.rooms.map(room => room.id),
      ...building.walls.map(wall => wall.id),
      ...building.openings.map(opening => opening.id),
      ...building.slabs.map(slab => slab.id),
      ...building.roofs.map(roof => roof.id),
    ]),
    ...project.renovations.map(renovation => renovation.id),
  ]
  const seen = new Set<string>()
  allIds.forEach((value, index) => {
    if (seen.has(value)) context.addIssue({ code: 'custom', message: 'Project IDs must be globally unique', path: ['ids', index] })
    seen.add(value)
  })

  const provenanceRecords = [project.site.provenance,
    ...project.site.features.map(feature => feature.provenance),
    ...project.assumptions.map(assumption => assumption.provenance),
    ...project.buildings.flatMap(building => [
      building.provenance,
      ...building.levels.map(level => level.provenance),
      ...building.rooms.map(room => room.provenance),
      ...building.walls.map(wall => wall.provenance),
      ...building.openings.map(opening => opening.provenance),
      ...building.slabs.map(slab => slab.provenance),
      ...building.roofs.map(roof => roof.provenance),
    ]),
    ...project.renovations.map(renovation => renovation.provenance),
  ]
  project.assumptions.forEach((assumption, index) => {
    assumption.affectedElementIds.forEach(elementId => {
      if (!targetElementIds.has(elementId)) {
        context.addIssue({ code: 'custom', message: 'Assumption element must exist in the finished building', path: ['assumptions', index, 'affectedElementIds'] })
      }
    })
  })
  provenanceRecords.forEach((provenance, index) => {
    provenance.evidenceIds.forEach(evidenceId => {
      if (!evidenceIds.has(evidenceId)) {
        context.addIssue({ code: 'custom', message: 'Provenance must reference existing evidence', path: ['provenance', index, 'evidenceIds'] })
      }
    })
  })

  if (!targetBuilding) {
    context.addIssue({ code: 'custom', message: 'Target building must resolve to the finished building', path: ['targetBuildingId'] })
  }
  project.renovations.forEach((renovation, index) => {
    if (!buildingIds.has(renovation.finishedBuildingId) || renovation.finishedBuildingId !== project.targetBuildingId) {
      context.addIssue({ code: 'custom', message: 'Renovation must reference the single finished target building', path: ['renovations', index, 'finishedBuildingId'] })
    }
    renovation.preservedSiteFeatureIds.forEach(featureId => {
      const feature = project.site.features.find(siteFeature => siteFeature.id === featureId)
      if (!feature) {
        context.addIssue({ code: 'custom', message: 'Preserved site feature must exist', path: ['renovations', index, 'preservedSiteFeatureIds'] })
      } else if (feature.designState !== 'retained') {
        context.addIssue({ code: 'custom', message: 'Preserved site feature must be marked retained', path: ['renovations', index, 'preservedSiteFeatureIds'] })
      }
    })
    renovation.affectedElementIds.forEach(elementId => {
      const state = targetElementStates.get(elementId)
      if (state === undefined) {
        context.addIssue({ code: 'custom', message: 'Affected element must exist in the finished building', path: ['renovations', index, 'affectedElementIds'] })
      } else if (state === 'retained') {
        context.addIssue({ code: 'custom', message: 'Affected element must be new or modified in the finished building', path: ['renovations', index, 'affectedElementIds'] })
      }
    })
    if (renovation.scopeImageRegion && !evidenceIds.has(renovation.scopeImageRegion.evidenceId)) {
      context.addIssue({ code: 'custom', message: 'Image scope must reference project evidence', path: ['renovations', index, 'scopeImageRegion', 'evidenceId'] })
    }
  })
})

export type ArchitecturalProject = z.infer<typeof ArchitecturalProjectSchema>
export type ArchitecturalBuilding = z.infer<typeof buildingSchema>
export type ArchitecturalLevel = z.infer<typeof levelSchema>
export type ArchitecturalRoom = z.infer<typeof roomSchema>
export type ArchitecturalWall = z.infer<typeof wallSchema>
export type ArchitecturalOpening = z.infer<typeof openingSchema>
export type ArchitecturalSlab = z.infer<typeof slabSchema>
export type ArchitecturalRoof = z.infer<typeof roofSchema>
