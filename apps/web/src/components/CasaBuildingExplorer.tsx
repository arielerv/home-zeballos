import { useState } from 'react'
import { CasaModelViewer } from './CasaModelViewer'
import { SolarControls, SolarMomentTag } from './SolarControls'
import type { SolarStudy } from '../lib/useSolarStudy'
import { CASA_SOLAR_SITE } from '../data/casa-site'
import { useLocale } from '../i18n/useLocale'
import { useTranslation } from 'react-i18next'
import '../building.css'

export function CasaBuildingExplorer({ solar }: { solar: SolarStudy }) {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useLocale()
  const [showSite, setShowSite] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [showNeighbors, setShowNeighbors] = useState(false)
  const [showSolarOrbit, setShowSolarOrbit] = useState(true)
  return <>
    <div className="workspace building-workspace">
      <section className={`viewport building-viewport casa-blender-viewport ${solar.sun.isDaylight ? 'is-day' : 'is-night'}`} aria-label="Casa, sitio y estudio solar de Castelar">
        <CasaModelViewer initialView="axon" views={['axon', 'plan']} showSite={showSite} showLabels={showLabels} solar={solar} showSunPath={showSolarOrbit} showNeighbors={showNeighbors} />
        <div className="viewport-top building-viewport-top">
          <div className="building-location"><span className="eyebrow">{t('casa.buildingScene')}</span><strong>{t('casa.address')}</strong><small>{t('casa.location')}</small>
            <small>{t('casa.coordinates', { latitude: formatNumber(CASA_SOLAR_SITE.latitude, 5), longitude: formatNumber(CASA_SOLAR_SITE.longitude, 5), timeZone: CASA_SOLAR_SITE.timeZone })}</small>
            <small>{t('casa.orientationPending')}</small>
          </div>
        </div>
        <SolarMomentTag solar={solar} />
        <div className="viewport-bottom building-viewport-bottom">
          <div className="scene-guide"><span>{t('casa.referenceCaption')}</span><small>{t('apartment.navigationHelp')}</small></div>
          <fieldset className="display-options building-layers">
            <legend className="sr-only">{t('building.buildingLayers')}</legend>
            <label title={t('casa.priorBlenderLayerNotice')}><input type="checkbox" checked={showSite} onChange={event => setShowSite(event.target.checked)} /> {t('casa.siteLayer')}</label>
            <label title={t('casa.priorBlenderLayerNotice')}><input type="checkbox" checked={showLabels} onChange={event => setShowLabels(event.target.checked)} /> {t('apartment.labels')}</label>
            <label title={t('casa.contextNotice')}><input type="checkbox" checked={showNeighbors} onChange={event => setShowNeighbors(event.target.checked)} /> {t('casa.neighbors')}</label>
            <label title={t('casa.reviewShadowsNotice')}><input type="checkbox" checked={showSolarOrbit} onChange={event => setShowSolarOrbit(event.target.checked)} /> {t('casa.orbitPending')}</label>
          </fieldset>
        </div>
      </section>
      <aside className="inspector solar-inspector">
        <section className="apartment-location-card" aria-label="La casa y su orientación">
          <span className="eyebrow">{t('casa.location')}</span><h2>{t('casa.buildingTitle')}</h2>
          <p>{t('casa.orientationPending')}</p>
          <p><strong>{t('casa.address')}</strong><br />Gobernador Dardo Rocha 877</p>
          <div className="casa-caveat"><strong>{t('casa.neighborsTitle')}</strong><p>{t('casa.contextNotice')}</p><p>{t('casa.neighborsPending')}</p><small>© OpenStreetMap contributors · <a href="https://www.openstreetmap.org/way/472802802" target="_blank" rel="noreferrer">OSM 472802802</a></small></div>
        </section>
        <div className="solar-heading"><span className="eyebrow">{t('building.solarStudy')}</span><h2>{t('casa.buildingSunTitle')}</h2><p>{t('casa.buildingSunNote')}</p></div>
        <SolarControls solar={solar} locationLabel={t('casa.location')} hemisphere="south" astronomicalOnly />
      </aside>
    </div>
    <footer className="app-footer building-footer"><span className="footer-label">{t('casa.buildingFooterTitle')}</span><p>{t('casa.buildingFooterDescription')}</p></footer>
  </>
}
