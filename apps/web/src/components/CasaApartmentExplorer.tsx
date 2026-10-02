import { useState } from 'react'
import tentativePlan from '../../../../assets/reference/casa-tentative-plan-data.json' with { type: 'json' }
import { CasaModelViewer } from './CasaModelViewer'
import { SolarControls, SolarMomentTag } from './SolarControls'
import type { SolarStudy } from '../lib/useSolarStudy'
import { useTranslation } from 'react-i18next'
import { useLocale } from '../i18n/useLocale'
import '../building.css'

type InspectorPanel = 'sun' | 'rooms' | 'assets'
const referenceFurniture = [
  'Almohadas', 'Cama - posicion orientativa', 'Escritorio - mueble orientativo', 'Bañera',
  'Isla cocina', 'Lavatorio', 'Mesa comedor', 'Mesa living', 'Mesada cocina', 'Silla', 'Sofa estar', 'Sofa living',
]

export function CasaApartmentExplorer({ solar }: { solar: SolarStudy }) {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useLocale()
  const [panel, setPanel] = useState<InspectorPanel>('sun')
  const [selectedRoomId, setSelectedRoomId] = useState<string>()
  const [cutaway, setCutaway] = useState(true)
  const [showFixtures, setShowFixtures] = useState(true)
  const [showLabels, setShowLabels] = useState(false)
  const [showNeighbors, setShowNeighbors] = useState(false)

  return <>
    <div className="workspace apartment-workspace">
      <section className={`viewport apartment-viewport ${solar.sun.isDaylight ? 'is-day' : 'is-night'}`} aria-label={t('casa.modelAria')}>
        <CasaModelViewer initialView="plan" views={['axon', 'plan']} cutaway={cutaway} showFixtures={showFixtures} showLabels={showLabels} solar={solar} showNeighbors={showNeighbors} />
        <div className="viewport-top">
          <div className="model-caption"><span className="caption-dot" /> Casa 2071 <span className="version">{t('casa.priorBlenderCaption')}</span></div>
        </div>
        <SolarMomentTag solar={solar} className="apartment-moment-tag" />
        <button className="apartment-context-toggle" aria-pressed={showNeighbors} onClick={() => setShowNeighbors(previous => !previous)} title={t('casa.contextNotice')}>{t(showNeighbors ? 'casa.hideNeighbors' : 'casa.showNeighbors')}</button>
        <div className="viewport-bottom">
          <div className="scene-guide"><span>{t('casa.sunGuide')}</span><small>{t('apartment.navigationHelp')}</small></div>
          <fieldset className="display-options">
            <legend className="sr-only">{t('casa.layers')}</legend>
            <label title={t('casa.priorBlenderLayerNotice')}><input type="checkbox" checked={cutaway} onChange={event => setCutaway(event.target.checked)} /> {t('apartment.cutaway')}</label>
            <label title={t('casa.priorBlenderLayerNotice')}><input type="checkbox" checked={showFixtures} onChange={event => setShowFixtures(event.target.checked)} /> {t('apartment.fixtures')}</label>
            <label title={t('casa.priorBlenderLayerNotice')}><input type="checkbox" checked={showLabels} onChange={event => setShowLabels(event.target.checked)} /> {t('apartment.labels')}</label>
          </fieldset>
        </div>
      </section>
      <aside className="inspector solar-inspector apartment-inspector" aria-label={t('casa.inspectorAria')}>
        <div className="inspector-heading"><span className="eyebrow">{t('casa.title')}</span><p>{t('casa.tagline')}</p></div>
        <div className="inspector-tabs" role="group" aria-label={t('casa.panelContents')}>
          <button aria-pressed={panel === 'sun'} onClick={() => setPanel('sun')}>{t('apartment.sunTab')}</button>
          <button aria-pressed={panel === 'rooms'} onClick={() => setPanel('rooms')}>{t('apartment.roomsTab')} <span>{tentativePlan.rooms.length}</span></button>
          <button aria-pressed={panel === 'assets'} onClick={() => setPanel('assets')}>{t('apartment.assetsTab')} <span>{referenceFurniture.length}</span></button>
        </div>
        {panel === 'sun' ? <>
          <section className="solar-room-focus" aria-label={t('apartment.observeLight')}>
            <h2>{t('apartment.lookAtLight')}</h2>
            <p>{t('casa.solarRoomNotice')}</p>
            <div className="apartment-orientation"><small>{t('casa.interpolatedPoint')}</small></div>
          </section>
          <SolarControls solar={solar} locationLabel={t('casa.location')} hemisphere="south" astronomicalOnly />
          <details className="evidence-notes"><summary>{t('casa.referencePrecision')}</summary><p>{t('casa.interpolatedPoint')}</p><p>{t('casa.roomFocusBlocked')}</p><p>{t('casa.contextNotice')}</p></details>
        </> : panel === 'rooms' ? <>
          <p className="inspector-note">{t('casa.roomsNotice')}</p>
          <div className="room-navigation">
            {tentativePlan.rooms.map((room, index) => <button key={room.id} className={`room-nav ${selectedRoomId === room.id ? 'selected' : ''}`} aria-pressed={selectedRoomId === room.id} onClick={() => setSelectedRoomId(room.id)}>
              <span><i>{String(index + 1).padStart(2, '0')}</i>{room.label ?? t('casa.unknownRoom')}</span><small>{t('casa.referenceArea', { area: formatNumber(room.printedAreaM2, 2) })}</small>
            </button>)}
          </div>
          <div className="solar-interior-note"><strong>{selectedRoomId ? tentativePlan.rooms.find(room => room.id === selectedRoomId)?.label ?? t('casa.unknownRoom') : t('apartment.focusRoom')}</strong><p>{t('casa.roomFocusBlocked')}</p></div>
        </> : <>
          <p className="inspector-note">{t('casa.assetsNotice')}</p>
          <div className="asset-list">{referenceFurniture.map((name, index) => <div className="asset-row" key={name}><span>{name}</span><small>{t('casa.referenceTag')} {String(index + 1).padStart(2, '0')}</small></div>)}</div>
        </>}
      </aside>
    </div>
    <footer className="app-footer"><span className="footer-label">{t('casa.footerTitle')}</span><p>{t('casa.footerDescription')}</p></footer>
  </>
}
