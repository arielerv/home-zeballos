import { Suspense, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { Box3, Vector3 } from 'three'
import { WebGLGuard } from './WebGLGuard'
import { useTranslation } from 'react-i18next'
import { advanceCameraTransition, type CameraTransition } from '../lib/camera-transition'
import type { SolarStudy } from '../lib/useSolarStudy'
import { CasaReviewSun } from './CasaReviewSun'
import { CasaSiteContext } from './CasaSiteContext'
import { CASA_CONTEXT_OUTLINES } from '../data/casa-context'
import { publicAssetUrl } from '../lib/public-asset-url'
import '../casa.css'

const MODEL_URL = publicAssetUrl('/models/casa-2071/casa-2071-maqueta-revision.glb')
type CameraView = 'plan' | 'axon' | 'zeballos' | 'dardo'

function Model({ view, resetVersion, showSite, cutaway, showFixtures, showLabels, solar, showSunPath, showNeighbors }: {
  view: CameraView
  resetVersion: number
  showSite: boolean
  cutaway: boolean
  showFixtures: boolean
  showLabels: boolean
  solar?: SolarStudy
  showSunPath: boolean
  showNeighbors: boolean
}) {
  const camera = useThree(state => state.camera)
  const { scene } = useGLTF(MODEL_URL)
  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse(object => {
      const sourceCollection = object.userData.casaCollection
      if (sourceCollection === '01 - Terreno y jardin') {
        object.visible = showSite
      } else if (sourceCollection === '02 - Ambientes trazados') {
        object.visible = true
      } else if (sourceCollection === '03 - Muros en corte a 1.10 m' || sourceCollection === '04 - Muros superiores - ocultos en corte') {
        const isUpperWall = sourceCollection === '04 - Muros superiores - ocultos en corte'
        // Collection 03 contains the 1.10 m cut-height walls. Collection 04
        // completes those walls to full height and is only shown outside a cut.
        object.visible = !isUpperWall || (!cutaway && view !== 'plan')
      } else if (sourceCollection === '05 - Equipamiento orientativo') {
        object.visible = showFixtures
      } else if (sourceCollection === '06 - Rotulos de planta') {
        object.visible = showLabels
      } else if (sourceCollection === '07 - Cubierta ilustrativa') {
        object.visible = !cutaway && view !== 'plan'
      } else if (sourceCollection === '08 - Planta alta envolvente de revision') {
        // External P1 mass is a visual review shell, not registered upstairs rooms.
        // Hide it with cutaway so it never occludes the ground-floor review.
        object.visible = !cutaway && view !== 'plan'
      }
      if ('isMesh' in object && object.isMesh) {
        object.castShadow = sourceCollection !== '01 - Terreno y jardin' && sourceCollection !== '02 - Ambientes trazados'
        object.receiveShadow = sourceCollection === '01 - Terreno y jardin' || sourceCollection === '02 - Ambientes trazados' || sourceCollection === '07 - Cubierta ilustrativa'
      }
    })
    return clone
  }, [scene, view, showSite, cutaway, showFixtures, showLabels])
  const bounds = useMemo(() => new Box3().setFromObject(model), [model])
  const center = useMemo(() => bounds.getCenter(new Vector3()), [bounds])
  const size = useMemo(() => bounds.getSize(new Vector3()), [bounds])
  const radius = Math.max(size.x, size.y, size.z, 1)
  const contextBounds = useMemo(() => {
    const combined = bounds.clone()
    CASA_CONTEXT_OUTLINES.forEach(outline => outline.points.forEach(([x, z]) => {
      combined.expandByPoint(new Vector3(x, center.y, z))
    }))
    return combined
  }, [bounds, center])
  const contextCenter = useMemo(() => contextBounds.getCenter(new Vector3()).sub(center), [contextBounds, center])
  const contextSize = useMemo(() => contextBounds.getSize(new Vector3()), [contextBounds])
  const contextRadius = Math.max(contextSize.x, contextSize.y, contextSize.z, radius)
  const cameraPosition: Record<CameraView, [number, number, number]> = {
    plan: [0, radius * 1.8, 0.01],
    axon: [radius * 1.2, radius * 0.9, radius * 1.2],
    zeballos: [0, radius * 0.55, radius * 1.65],
    dardo: [radius * 1.65, radius * 0.58, -radius * 0.2],
  }
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const goal = useRef<CameraTransition | null>(null)
  const initialized = useRef(false)
  const { invalidate } = useThree()
  useEffect(() => {
    const control = controls.current
    if (!control) return
    camera.up.set(0, 1, 0)
    if (view === 'plan') camera.up.set(0, 0, -1)
    camera.updateProjectionMatrix()
    const target = showNeighbors ? contextCenter.clone() : new Vector3(0, 0, 0)
    const position = new Vector3(...cameraPosition[view]).multiplyScalar(showNeighbors ? contextRadius / radius : 1).add(target)
    control.enableDamping = false
    control.update()
    if (!initialized.current) {
      camera.position.copy(position)
      control.target.copy(target)
      initialized.current = true
    } else {
      goal.current = { position, target }
    }
    control.update()
    control.enableDamping = true
    invalidate()
  }, [camera, view, radius, resetVersion, invalidate, showNeighbors, contextRadius, contextCenter])
  useFrame((_, delta) => {
    if (!goal.current || !controls.current) return
    const arrived = advanceCameraTransition(camera.position, controls.current.target, goal.current, delta)
    controls.current.update()
    if (arrived) goal.current = null
    else invalidate()
  })
  const placement = useMemo(() => [-center.x, -center.y, -center.z] as [number, number, number], [center])

  return <>
    {solar ? <CasaReviewSun solar={solar} radius={radius} showPath={showSunPath} /> : <>
      <ambientLight intensity={1.4} />
      <directionalLight position={[radius, radius * 1.8, radius]} intensity={1.1} />
    </>}
    <primitive object={model} position={placement} />
    {showNeighbors && <group position={placement}><CasaSiteContext /></group>}
    <OrbitControls
      ref={controls}
      makeDefault
      target={[0, 0, 0]}
      reverseVerticalOrbit
      minDistance={radius * 0.34}
      maxDistance={(showNeighbors ? contextRadius : radius) * 4}
      maxPolarAngle={Math.PI / 2 - 0.015}
      enableRotate
      enablePan
      enableZoom
      enableDamping
      onStart={() => { goal.current = null }}
    />
  </>
}

export function CasaModelViewer({ initialView = 'axon', views = ['plan', 'axon'], compact = false, showSite = true, cutaway = false, showFixtures = true, showLabels = true, solar, showSunPath = true, showNeighbors = false }: {
  initialView?: CameraView
  views?: CameraView[]
  compact?: boolean
  showSite?: boolean
  cutaway?: boolean
  showFixtures?: boolean
  showLabels?: boolean
  solar?: SolarStudy
  showSunPath?: boolean
  showNeighbors?: boolean
}) {
  const { t } = useTranslation('workspace')
  const [cameraView, setCameraView] = useState<{ mode: CameraView; revision: number }>({ mode: initialView, revision: 0 })
  const labels: Record<CameraView, string> = {
    plan: t('apartment.plan'), axon: t('apartment.perspective'), zeballos: t('casa.fromZeballos'), dardo: t('casa.fromDardoRocha'),
  }
  return <div className={`casa-model-viewer${compact ? ' compact' : ''}`}>
    <WebGLGuard fallback={<div className="canvas-fallback">La vista 3D requiere WebGL. El inspector y el estudio solar siguen disponibles.</div>}>
      <Canvas shadows="percentage" camera={{ position: [40, 30, 40], fov: 38, near: 0.05, far: 1000 }} dpr={[1, 1.75]} frameloop="demand">
        <color attach="background" args={['#e8e8e2']} />
        <Suspense fallback={null}><Model view={cameraView.mode} resetVersion={cameraView.revision} showSite={showSite} cutaway={cutaway} showFixtures={showFixtures} showLabels={showLabels} solar={solar} showSunPath={showSunPath} showNeighbors={showNeighbors} /></Suspense>
      </Canvas>
    </WebGLGuard>
    <nav className="view-buttons casa-model-views" role="group" aria-label={t('apartment.cameraView')}>
      {views.map(option => <button key={option} type="button" aria-pressed={cameraView.mode === option} onClick={() => setCameraView(previous => ({ mode: option, revision: previous.revision + 1 }))}>{labels[option]}</button>)}
      <button type="button" className="camera-reset casa-camera-reset" aria-label={t('apartment.resetView')} title={t('apartment.resetView')} onClick={() => setCameraView(previous => ({ ...previous, revision: previous.revision + 1 }))}>↺</button>
    </nav>
    <span className="casa-model-source">{t('casa.modelSource')}</span>
  </div>
}

useGLTF.preload(MODEL_URL)
