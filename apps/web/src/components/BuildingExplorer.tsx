import { useState } from 'react'
import { BuildingScene } from './BuildingScene'
import { SolarControls, SolarMomentTag } from './SolarControls'
import { BUILDING_SITE, SITE_BUILDINGS, SITE_PARCEL } from '../data/building-site'
import { APARTMENT_PLACEMENT } from '../data/apartment-placement'
import type { SolarStudy } from '../lib/useSolarStudy'
import { useTranslation } from 'react-i18next'
import { useLocale } from '../i18n/useLocale'
import '../building.css'

const targetBuilding = SITE_BUILDINGS.find(building => building.isTarget)

export function BuildingExplorer({ solar, onOpenApartment }: { solar: SolarStudy; onOpenApartment: () => void }) {
  const { t } = useTranslation('workspace')
  const { formatNumber, formatDate } = useLocale()
  const { sun, instant } = solar
  const [cutaway, setCutaway] = useState<'none' | 'floor' | 'apartment'>('none')
  const [focusApartment, setFocusApartment] = useState(false)
  const [showNeighbors, setShowNeighbors] = useState(true)
  const [showSunPath, setShowSunPath] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [view, setView] = useState<{ mode: '3d' | 'top'; revision: number }>({ mode: '3d', revision: 0 })
  function resetView(mode: '3d' | 'top') {
    setView(previous => ({ mode, revision: previous.revision + 1 }))
  }

  return <>
    <div className="workspace building-workspace">
      <section className={`viewport building-viewport ${sun.isDaylight ? 'is-day' : 'is-night'}`} aria-label={t('building.sceneAria')}>
        <BuildingScene instant={instant} sun={sun} showNeighbors={showNeighbors} showSunPath={showSunPath} showLabels={showLabels} view={view} cutaway={cutaway} focusApartment={focusApartment} />
        <div className="viewport-top building-viewport-top">
          <div className="building-location"><span className="eyebrow">{t('building.locationEyebrow')}</span><strong>Jean-Baptiste Colbert</strong><small>{t('building.location')}</small><small>{t('building.coordinates', { latitude: formatNumber(BUILDING_SITE.latitude, 5), longitude: formatNumber(BUILDING_SITE.longitude, 5), timeZone: BUILDING_SITE.timeZone })}</small></div>
          <div className="view-buttons" role="group" aria-label={t('building.camera')}>
            <button aria-pressed={view.mode === '3d'} onClick={() => resetView('3d')}>{t('apartment.perspective')}</button>
            <button aria-pressed={view.mode === 'top'} onClick={() => resetView('top')}>{t('apartment.plan')}</button>
            <button className="camera-reset" aria-label={t('apartment.resetView')} title={t('apartment.resetView')} onClick={() => resetView(view.mode)}>↺</button>
          </div>
        </div>
        <SolarMomentTag solar={solar} />
        <div className="viewport-bottom building-viewport-bottom">
          <div className="scene-guide"><span><i className="target-key" /> {t('building.buildingPart')} <i className="apartment-key" /> {t('building.apartmentKey')} <i className="neighbor-key" /> {t('building.contextKey')}</span><small>{t('building.navigationHelp')}</small></div>
          <fieldset className="display-options building-layers">
            <legend className="sr-only">{t('building.buildingLayers')}</legend>
            <label><input type="checkbox" checked={showNeighbors} onChange={event => setShowNeighbors(event.target.checked)} /> {t('building.neighbors')}</label>
            <label><input type="checkbox" checked={showSunPath} onChange={event => setShowSunPath(event.target.checked)} /> {t('building.solarOrbit')}</label>
            <label><input type="checkbox" checked={showLabels} onChange={event => setShowLabels(event.target.checked)} /> {t('apartment.labels')}</label>
          </fieldset>
        </div>
      </section>

      <aside className="inspector solar-inspector" aria-label={t('building.solarStudy')}>
        <section className="apartment-location-card" aria-label={t('building.department')}>
          <span className="eyebrow">{t('building.department')}</span><h2>{t('building.apartmentLocationTitle')}</h2>
          <p>{t('building.apartmentFloor', { floor: formatNumber(APARTMENT_PLACEMENT.floorIndex) })}<br /><small>{t('building.courtyardAssumption')}</small></p>
          <div className="building-section-options" role="group" aria-label={t('building.buildingCuts')}>
            {([{ mode: 'none', label: t('building.wholeBuilding') }, { mode: 'floor', label: t('building.floorCut') }, { mode: 'apartment', label: t('building.interior') }] as const).map(option => <button key={option.mode} aria-pressed={cutaway === option.mode} onClick={() => { setCutaway(option.mode); setFocusApartment(option.mode !== 'none'); resetView('3d') }}>{option.label}</button>)}
          </div>
          <button className="apartment-locate" aria-pressed={focusApartment} onClick={() => { setFocusApartment(previous => !previous); resetView('3d') }}>{focusApartment ? t('building.wholeBuildingLink') : t('building.locateApartment')}</button>
          <button className="apartment-enter" onClick={onOpenApartment}>{t('building.exploreApartment')} <span>→</span></button>
        </section>
        <div className="solar-heading"><span className="eyebrow">{t('building.solarStudy')}</span><h2>{t('building.annualLightLine1')}<br /> {t('building.annualLightLine2')}</h2><p>{t('building.sharedMoment')}</p></div>

        <SolarControls solar={solar} />

        <details className="evidence-notes building-evidence"><summary>{t('building.evidencePrecision')}</summary>
          <p><a href={BUILDING_SITE.rnbUrl} target="_blank" rel="noreferrer">{t('building.nationalBuildingRegister')}</a><br />{t('building.registerDescription', { address: BUILDING_SITE.officialAddress })}</p>
          <p><a href="https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/diffusion/wfs/" target="_blank" rel="noreferrer">{t('building.ignTopo')}</a><br />{t('building.ignDescription', { height: formatNumber(targetBuilding?.height ?? 0, 1), floors: formatNumber(targetBuilding?.floors ?? 0), planar: formatNumber(targetBuilding?.planarAccuracy ?? 0, 1), vertical: formatNumber(targetBuilding?.verticalAccuracy ?? 0, 1) })}</p>
          <p><a href="https://apicarto.ign.fr/api/cadastre/parcelle?code_insee=29232&section=AL&numero=0538" target="_blank" rel="noreferrer">{t('building.cadastre', { label: SITE_PARCEL.label })}</a><br />{t('building.parcelDescription', { area: formatNumber(SITE_PARCEL.area) })}</p>
          <p>{t('building.modelScope', { radius: formatNumber(BUILDING_SITE.radiusMeters), assumption: t('apartment.placementAssumption') })}</p>
          <p><a href="https://gml.noaa.gov/grad/solcalc/calcdetails.html" target="_blank" rel="noreferrer">{t('building.solarSource')}</a><br />{t('building.solarDescription')}</p>
          <p>{t('building.dataConsulted', { date: formatDate(new Date(`${BUILDING_SITE.retrievedAt}T12:00:00Z`), { dateStyle: 'long' }), attribution: BUILDING_SITE.attribution })}</p>
        </details>
      </aside>
    </div>
    <footer className="app-footer building-footer"><span className="footer-label">{t('building.footerTitle')}</span><p>{t('building.footerDescription')}</p><a href={BUILDING_SITE.mapUrl} target="_blank" rel="noreferrer">{t('building.mapLink')}</a></footer>
  </>
}
