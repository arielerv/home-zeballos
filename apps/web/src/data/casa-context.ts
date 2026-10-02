import draft from '../../../../assets/reference/casa-context-trace-draft.json' with { type: 'json' }
import { applyAffine, clipToLot, fitAffine, fitRoofTranslation, frontageStrip, isSimplePolygon, offsetFrontage, signedArea, type Point2 } from '../lib/context-trace.ts'
import { CASA_FRONTAGE_FOOTPRINTS, toCasaLocal } from './casa-neighborhood.ts'

const point = (value: number[]): Point2 => [value[0], value[1]]
export const CASA_CARTO_FIT = fitAffine(draft.siteControlPoints.map(control => ({ source: point(control.carto), target: point(control.model) })))
export const CASA_AERIAL_FIT = fitAffine(draft.aerial.cartographyControlPoints.map(control => ({ source: point(control.aerial), target: point(control.carto) })))
export const cartoToDisplay = (p: Point2) => applyAffine(CASA_CARTO_FIT.coefficients, p)

// Conservative additive error envelope: declared picking uncertainty + actual
// maximum fit residual mapped back to the original aerial-pixel coordinate frame.
const [a, b] = CASA_AERIAL_FIT.coefficients
const determinant = a[0] * b[1] - b[0] * a[1]
const sourceResiduals = draft.aerial.cartographyControlPoints.map(control => {
  const p = applyAffine(CASA_AERIAL_FIT.coefficients, point(control.aerial))
  const x = p[0] - control.carto[0], y = p[1] - control.carto[1]
  return Math.hypot((b[1] * x - b[0] * y) / determinant, (-a[1] * x + a[0] * y) / determinant)
})
export const CASA_ROOF_PLACEMENT_ENVELOPE = draft.aerial.controlPointUncertaintyPixels + Math.max(...sourceResiduals)
const roofDrafts = draft.neighbors.map(neighbor => {
  const parcel = neighbor.parcel.map(point)
  const sourceBodies = neighbor.roofBodies.map(body => ({ ...body, points: body.polygon.map(point) }))
  const transformBodies = (shift: Point2) => sourceBodies.map(body => ({
    ...body, points: body.points.map(p => applyAffine(CASA_AERIAL_FIT.coefficients, [p[0] + shift[0], p[1] + shift[1]])),
  }))
  const retainedFraction = (bodies: ReturnType<typeof transformBodies>) => {
    const total = bodies.reduce((sum, body) => sum + Math.abs(signedArea(body.points)), 0)
    return bodies.reduce((sum, body) => sum + Math.abs(signedArea(clipToLot(body.points, parcel))), 0) / total
  }
  const rawFraction = retainedFraction(transformBodies([0, 0]))
  // A single source-pixel rigid shift for the entire cluster; no body distortion.
  // Retaining 98% is a review-fit check, NOT evidence of real footprint accuracy.
  const proposedShift = rawFraction < .98
    ? fitRoofTranslation(sourceBodies.flatMap(body => body.points), parcel, CASA_AERIAL_FIT.coefficients) : [0, 0] as Point2
  const bounded = proposedShift !== null && Math.hypot(...proposedShift) <= CASA_ROOF_PLACEMENT_ENVELOPE
  const shift: Point2 = bounded ? proposedShift! : [0, 0]
  const bodies = transformBodies(shift)
  const fraction = retainedFraction(bodies)
  return { neighbor, parcel, bodies, rawFraction, fraction, shift, acceptedPreview: bounded && fraction >= .98 }
})

export type ContextOutline = { id: string; kind: 'parcel' | 'roof' | 'street' | 'avenue-lane' | 'sidewalk' | 'median' | 'station'; label: string; points: Point2[]; surface?: string }
export const CASA_CONTEXT_OUTLINES: ContextOutline[] = roofDrafts.flatMap(({ neighbor, parcel, bodies, acceptedPreview }) => {
  return [
    { id: neighbor.id, kind: 'parcel' as const, label: neighbor.lot, points: parcel.map(cartoToDisplay) },
    ...(acceptedPreview ? bodies.map(body => ({ id: `${neighbor.id}-roof-${body.id}`, kind: 'roof' as const, label: neighbor.lot, surface: body.surface, points: body.points.map(cartoToDisplay) })) : []),
  ]
})

const aerialSectionLength = (section: number[][]) => {
  const [start, end] = section.map(p => applyAffine(CASA_AERIAL_FIT.coefficients, point(p)))
  return Math.hypot(end[0] - start[0], end[1] - start[1])
}
const frontage = draft.roadReview.blockFrontage.map(point)
const sidewalkWidth = aerialSectionLength(draft.roadReview.sidewalkSectionAerial)
const roadSections = draft.roadReview.carriagewaySectionsAerial.map(section => aerialSectionLength(section.points))
const roadWidth = roadSections.reduce((sum, value) => sum + value, 0) / roadSections.length
const curb = offsetFrontage(frontage, sidewalkWidth)
const roadOuter = offsetFrontage(frontage, sidewalkWidth + roadWidth)
const medianOuter = offsetFrontage(frontage, sidewalkWidth + roadWidth + draft.roadReview.avenue.medianCartoPixels)
const oppositeCurb = offsetFrontage(frontage, sidewalkWidth + roadWidth * 2 + draft.roadReview.avenue.medianCartoPixels)
const roadOutlines: ContextOutline[] = [
  { id: 'block-sidewalk', kind: 'sidewalk', label: '', points: frontageStrip(frontage, curb).map(cartoToDisplay) },
  ...draft.streets.map(street => {
    const [start, end] = draft.roadReview.streetRanges[street.id as keyof typeof draft.roadReview.streetRanges]
    return { id: street.id, kind: 'street' as const, label: street.label, points: frontageStrip(curb, roadOuter, start, end).map(cartoToDisplay) }
  }),
  { id: 'zeballos-median', kind: 'median', label: '', points: frontageStrip(roadOuter, medianOuter, 3, 4).map(cartoToDisplay) },
  { id: 'zeballos-opposite-lane', kind: 'avenue-lane', label: '', points: frontageStrip(medianOuter, oppositeCurb, 3, 4).map(cartoToDisplay) },
]
if (roadOutlines.some(outline => !isSimplePolygon(outline.points))) throw new Error('Invalid source road/sidewalk strip: review required')
CASA_CONTEXT_OUTLINES.push(...roadOutlines)
CASA_CONTEXT_OUTLINES.push(...CASA_FRONTAGE_FOOTPRINTS.map(station => ({ id: station.id, kind: 'station' as const, label: station.label, points: station.coordinates.map(([lat, lon]) => toCasaLocal(lat, lon)) })))

export const CASA_CONTEXT_REPORT = {
  metricCalibrated: false,
  units: draft.modelUnits,
  cartoFit: CASA_CARTO_FIT,
  aerialFit: CASA_AERIAL_FIT,
  placementEnvelopePixels: CASA_ROOF_PLACEMENT_ENVELOPE,
  roads: { units: 'cartography pixels, NOT metres', sidewalkWidth, roadWidth, observedSections: roadSections, medianWidth: draft.roadReview.avenue.medianCartoPixels, frontage, curb, roadOuter },
  roofs: roofDrafts.map(({ neighbor, bodies, rawFraction, fraction, shift, acceptedPreview }) => ({
    id: neighbor.id, bodyCount: bodies.length, observedAreaPixels2: bodies.reduce((sum, body) => sum + Math.abs(signedArea(body.points)), 0), rawRetainedFraction: rawFraction,
    retainedFraction: fraction, sourcePixelTranslation: shift, translationLengthPixels: Math.hypot(...shift), acceptedPreview,
    translationUnits: 'original aerial pixels', footprintVerified: false,
  })),
}