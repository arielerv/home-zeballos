import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import type { SolarStudy } from '../lib/useSolarStudy'
import { solarRenderPosition } from '../lib/solar-render-position'

/** Computed sky direction, as in BuildingScene. House alignment remains unverified. */
export function CasaReviewSun({ solar, radius, showPath }: { solar: SolarStudy; radius: number; showPath: boolean }) {
  const daylight = useMemo(() => solar.day.path.filter(point => point.altitude > 0), [solar.day])
  // Only radial display distance differs: sphere, light and daily samples all
  // retain their computed azimuth and altitude. Never rotate for the camera.
  // Distant sky marker/orbit, framed by the viewer's maximum zoom-out.
  const skyDistance = radius * 1.2
  const sun = solarRenderPosition(solar.sun.direction, skyDistance)
  const lightPosition = solarRenderPosition(solar.sun.direction, radius * .88)
  const path = daylight.map(point => solarRenderPosition(point.direction, skyDistance))

  return <>
    <ambientLight intensity={solar.sun.isDaylight ? .5 : .26} />
    <hemisphereLight args={['#e8f0ff', '#9da58f', solar.sun.isDaylight ? .75 : .34]} />
    <directionalLight
      position={lightPosition} intensity={solar.sun.isDaylight ? 2.8 * Math.min(1, solar.sun.altitude / 10) : 0}
      color="#fff1d8" castShadow={solar.sun.isDaylight}
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-radius * .8} shadow-camera-right={radius * .8}
      shadow-camera-top={radius * .8} shadow-camera-bottom={-radius * .8}
      shadow-camera-near={.1} shadow-camera-far={radius * 3}
      shadow-bias={-.0001} shadow-normalBias={.035} shadow-radius={2}
    />
    {showPath && path.length > 1 && <Line points={path} color="#b78b50" lineWidth={1.7} depthTest={false} renderOrder={20} />}
    {showPath && solar.sun.isDaylight && <mesh position={sun} renderOrder={21} userData={{ casaReviewSun: true }}>
      <sphereGeometry args={[radius * .035, 20, 12]} />
      <meshBasicMaterial color="#ffc663" depthTest={false} />
    </mesh>}
  </>
}