import { useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import { useTranslation } from 'react-i18next'
import tentativePlanImage from '../../../../assets/reference/casa-2071-planta-limpia.png'

export function CasaTentativePlanViewer() {
  const { t } = useTranslation('workspace')
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null)

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    setOffset({ x: drag.current.offsetX + event.clientX - drag.current.x, y: drag.current.offsetY + event.clientY - drag.current.y })
  }

  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null
  }

  function zoomPlan(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault()
    setZoom(current => Math.min(3, Math.max(.65, current * (event.deltaY < 0 ? 1.12 : .89))))
  }

  function resetPlan() {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  return <div className="casa-tentative-plan" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onWheel={zoomPlan}>
    <img
      className="casa-tentative-plan-image"
      src={tentativePlanImage}
      alt={t('casa.tentativePlanAlt')}
      draggable={false}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
    />
    <nav className="view-buttons casa-tentative-plan-views" aria-label={t('apartment.cameraView')}>
      <button type="button" disabled aria-pressed="false" title={t('casa.perspectiveNeedsCalibration')}>{t('apartment.perspective')}</button>
      <button type="button" aria-pressed="true">{t('apartment.plan')}</button>
      <button type="button" className="camera-reset" aria-label={t('apartment.resetView')} title={t('apartment.resetView')} onClick={resetPlan}>↺</button>
    </nav>
    <span className="casa-plan-source-label">{t('casa.tentativePlanIsDesignAuthority')}</span>
  </div>
}
