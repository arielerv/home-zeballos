import draft from '../../../../assets/reference/casa-context-trace-draft.json' with { type: 'json' }
import { applyAffine, clipToLot, fitAffine, fitRoofTranslation, signedArea, type Point2 } from '../lib/context-trace.ts'
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
  const sourceRoof = neighbor.roofAerial.map(point)
  const tracedRoof = sourceRoof.map(p => applyAffine(CASA_AERIAL_FIT.coefficients, p))
  const rawFraction = Math.abs(signedArea(clipToLot(tracedRoof, parcel)) / signedArea(tracedRoof))
  // No deformation or clipping. The explicitly confirmed corner neighbor may
  // receive only the minimum rigid translation inside the computed error envelope.
  const proposedShift = neighbor.lot === '9' && rawFraction < .98
    ? fitRoofTranslation(sourceRoof, parcel, CASA_AERIAL_FIT.coefficients) : [0, 0] as Point2
  const bounded = proposedShift !== null && Math.hypot(...proposedShift) <= CASA_ROOF_PLACEMENT_ENVELOPE
  const shift: Point2 = bounded ? proposedShift! : [0, 0]
  const roof = sourceRoof.map(p => applyAffine(CASA_AERIAL_FIT.coefficients, [p[0] + shift[0], p[1] + shift[1]]))
  const fraction = Math.abs(signedArea(clipToLot(roof, parcel)) / signedArea(roof))
  return { neighbor, parcel, roof, rawFraction, fraction, shift, acceptedPreview: bounded && fraction >= .98 }
})

export type ContextOutline = { id: string; kind: 'parcel' | 'roof' | 'street' | 'station'; label: string; points: Point2[] }
export const CASA_CONTEXT_OUTLINES: ContextOutline[] = roofDrafts.flatMap(({ neighbor, parcel, roof, acceptedPreview }) => {
  return [
    { id: neighbor.id, kind: 'parcel' as const, label: neighbor.lot, points: parcel.map(cartoToDisplay) },
    ...(acceptedPreview ? [{ id: `${neighbor.id}-roof`, kind: 'roof' as const, label: neighbor.lot, points: roof.map(cartoToDisplay) }] : []),
  ]
})
CASA_CONTEXT_OUTLINES.push(...draft.streets.map(street => ({ id: street.id, kind: 'street' as const, label: street.label, points: street.polygon.map(value => cartoToDisplay(point(value))) })))
CASA_CONTEXT_OUTLINES.push(...CASA_FRONTAGE_FOOTPRINTS.map(station => ({ id: station.id, kind: 'station' as const, label: station.label, points: station.coordinates.map(([lat, lon]) => toCasaLocal(lat, lon)) })))

export const CASA_CONTEXT_REPORT = {
  metricCalibrated: false,
  units: draft.modelUnits,
  cartoFit: CASA_CARTO_FIT,
  aerialFit: CASA_AERIAL_FIT,
  placementEnvelopePixels: CASA_ROOF_PLACEMENT_ENVELOPE,
  roofs: roofDrafts.map(({ neighbor, roof, rawFraction, fraction, shift, acceptedPreview }) => ({
    id: neighbor.id, observedAreaPixels2: Math.abs(signedArea(roof)), rawRetainedFraction: rawFraction,
    retainedFraction: fraction, sourcePixelTranslation: shift, translationLengthPixels: Math.hypot(...shift), acceptedPreview,
  })),
}