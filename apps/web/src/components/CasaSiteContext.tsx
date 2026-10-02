import { useEffect, useMemo } from 'react'
import { Html, Line } from '@react-three/drei'
import { DoubleSide, Shape, ShapeGeometry } from 'three'
import { useTranslation } from 'react-i18next'
import { CASA_CONTEXT_OUTLINES } from '../data/casa-context'

/** Source-backed flat review contours only; no calibrated heights or shadow claims. */
export function CasaSiteContext() {
  const { t } = useTranslation('workspace')
  const contours = useMemo(() => CASA_CONTEXT_OUTLINES.map(outline => {
    const points = outline.points
    const shape = new Shape()
    points.forEach(([x, z], index) => index === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z))
    shape.closePath()
    const centroid = points.reduce<[number, number]>((sum, p) => [sum[0] + p[0] / points.length, sum[1] + p[1] / points.length], [0, 0])
    return {
      id: outline.id,
      kind: outline.kind,
      surface: outline.surface,
      label: outline.label,
      geometry: new ShapeGeometry(shape),
      points: [...points, points[0]].map(([x, z]) => [x, outline.kind === 'roof' ? .12 : .06, z] as [number, number, number]),
      labelPosition: [centroid[0], .2, centroid[1]] as [number, number, number],
    }
  }), [])
  useEffect(() => () => contours.forEach(contour => contour.geometry.dispose()), [contours])
  return <group name="Casa approximate context · parcels, observed roofs, sidewalks and carriageways · review only" userData={{ calibrated: false }}>
    {contours.map(contour => <group key={contour.id} name={contour.id} userData={{ contextKind: contour.kind, sourceId: contour.id, calibrated: false }}>
      {contour.kind !== 'parcel' && <mesh geometry={contour.geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, contour.kind === 'roof' ? .1 : .04, 0]} userData={{ contextKind: contour.kind, calibrated: false }}>
        <meshBasicMaterial color={contour.kind === 'roof' ? (contour.surface === 'flat' ? '#c9c7ba' : '#ac8062') : contour.kind === 'sidewalk' ? '#ddd4c5' : contour.kind === 'median' ? '#9ca68c' : '#92979c'} transparent={contour.kind === 'station'} opacity={contour.kind === 'station' ? .35 : 1} depthWrite={false} side={DoubleSide} />
      </mesh>}
      <Line points={contour.points} color={contour.kind === 'roof' ? '#725d48' : contour.kind === 'sidewalk' ? '#a89f8d' : '#687178'} lineWidth={contour.kind === 'parcel' ? 1 : .8} dashed={contour.kind === 'parcel'} dashSize={.35} gapSize={.22} />
      {contour.label && contour.kind !== 'roof' && <Html position={contour.labelPosition} center style={{ pointerEvents: 'none', width: contour.kind === 'station' ? 145 : 92, textAlign: 'center' }}>
        <small data-casa-context={contour.kind === 'station' ? 'station' : contour.id} style={{ display: 'block', padding: '2px 3px', fontSize: 9, lineHeight: 1.2, background: '#f4f4ee99', color: '#454c50', borderRadius: 3 }}>{contour.kind === 'station' ? t('casa.stationContour') : contour.kind === 'parcel' ? t('casa.neighborParcel', { lot: contour.label }) : contour.label}</small>
      </Html>}
    </group>)}
  </group>
}
