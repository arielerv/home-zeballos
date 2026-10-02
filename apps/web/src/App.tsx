import { lazy, Suspense, useEffect, useState } from 'react'
import { useSolarStudy } from './lib/useSolarStudy'
import { useApartmentView } from './lib/useApartmentView'
import { t3Apartment } from './data/t3'
import { CASA_SOLAR_SITE } from './data/casa-site'
import { workspaceFromHash, type WorkspaceView } from './lib/workspace-view'
import { useTranslation } from 'react-i18next'
import { useLocale } from './i18n/useLocale'
import { listenForLanguageChanges } from './i18n/preferences'
import { ApplicationSettings } from './components/ApplicationSettings'
import { listenForThemeChanges } from './lib/theme'
import './casa.css'

const BuildingExplorer = lazy(() => import('./components/BuildingExplorer').then(module => ({ default: module.BuildingExplorer })))
const ApartmentExplorer = lazy(() => import('./components/ApartmentExplorer').then(module => ({ default: module.ApartmentExplorer })))
const DossierExplorer = lazy(() => import('./components/DossierExplorer').then(module => ({ default: module.DossierExplorer })))
const CasaApartmentExplorer = lazy(() => import('./components/CasaApartmentExplorer').then(module => ({ default: module.CasaApartmentExplorer })))
const CasaBuildingExplorer = lazy(() => import('./components/CasaBuildingExplorer').then(module => ({ default: module.CasaBuildingExplorer })))
const CasaDossierExplorer = lazy(() => import('./components/CasaDossierExplorer').then(module => ({ default: module.CasaDossierExplorer })))

export default function App() {
  const { t } = useTranslation('common')
  const { t: workspaceT } = useTranslation('workspace')
  const { formatNumber } = useLocale()
  const isCasaProject = new URLSearchParams(window.location.search).get('project') !== 't3'
  const solar = useSolarStudy(isCasaProject ? CASA_SOLAR_SITE : undefined)
  const apartmentView = useApartmentView()
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>(() => workspaceFromHash(window.location.hash))
  const { setPlaying } = solar
  const workspaceTitle = isCasaProject
    ? workspaceT(`casa.${({ apartment: 'workspaceTitle', building: 'buildingWorkspaceTitle', documentation: 'documentationWorkspaceTitle' } as const)[workspaceView]}`)
    : t(`workspaces.${workspaceView}.title`)
  useEffect(listenForLanguageChanges, [])
  useEffect(listenForThemeChanges, [])
  useEffect(() => {
    document.title = isCasaProject ? `Casa 2071 · ${workspaceTitle}` : t('app.title', { workspace: workspaceTitle })
  }, [t, workspaceTitle, isCasaProject])
  useEffect(() => {
    function handleNavigation() {
      setWorkspaceView(workspaceFromHash(window.location.hash))
      setPlaying(false)
    }
    window.addEventListener('hashchange', handleNavigation)
    window.addEventListener('popstate', handleNavigation)
    return () => {
      window.removeEventListener('hashchange', handleNavigation)
      window.removeEventListener('popstate', handleNavigation)
    }
  }, [setPlaying])

  function switchWorkspace(next: WorkspaceView) {
    setWorkspaceView(next)
    solar.setPlaying(false)
    if (window.location.pathname !== '/' || window.location.hash !== `#${next}`) window.history.pushState(null, '', `/${window.location.search}#${next}`)
  }

  return (
    <main className={`designer${workspaceView === 'documentation' ? ' documentation-designer' : ''}`}>
      <header className="app-header">
        <div className="project-heading">
          <span className="eyebrow">{isCasaProject ? `${workspaceT('casa.city').toUpperCase()} · ${workspaceT('casa.district').toUpperCase()}` : t('app.eyebrow')}</span>
          <h1>{isCasaProject ? 'Casa 2071' : 'T3 Designer'} <span className="stage-label">{workspaceTitle}</span></h1>
        </div>
        <div className="header-actions">
          <div className="project-details">
            <span className="estimate-badge"><span /> {isCasaProject ? workspaceT('casa.projectBadge') : t(`workspaces.${workspaceView}.badge`)}</span>
            <div className="area-stat">{isCasaProject ? <><strong>{workspaceT('casa.city')}</strong><span>{workspaceT('casa.district')}</span></> : <><strong>{formatNumber(t3Apartment.metadata.reportedCarrezArea, 2)} m²</strong><span>{t('app.areaLabel')}</span></>}</div>
          </div>
          <ApplicationSettings />
        </div>
      </header>

      <nav className="workspace-switcher" aria-label={isCasaProject ? 'Vistas del proyecto' : t('app.navigation')}>
        {(['apartment', 'building', 'documentation'] as const).map(view => <button key={view} aria-pressed={workspaceView === view} onClick={() => switchWorkspace(view)}>{isCasaProject ? view === 'apartment' ? workspaceT('casa.houseTab') : workspaceT(`casa.${({ building: 'buildingWorkspaceTitle', documentation: 'documentationWorkspaceTitle' } as const)[view]}`) : t(`workspaces.${view}.nav`)}</button>)}
      </nav>
      <Suspense fallback={<div className="workspace-loading" role="status">{t('app.loading', { workspace: t(`workspaces.${workspaceView}.title`) })}</div>}>
      {isCasaProject
        ? workspaceView === 'documentation'
          ? <CasaDossierExplorer onOpenHouse={() => switchWorkspace('apartment')} onOpenBuilding={() => switchWorkspace('building')} />
          : workspaceView === 'building'
            ? <CasaBuildingExplorer solar={solar} />
            : <CasaApartmentExplorer solar={solar} />
        : workspaceView === 'documentation'
        ? <DossierExplorer onOpenApartment={() => { apartmentView.setPanel('rooms'); switchWorkspace('apartment') }} onOpenBuilding={() => switchWorkspace('building')} />
        : workspaceView === 'building'
        ? <BuildingExplorer solar={solar} onOpenApartment={() => { apartmentView.setPanel('sun'); switchWorkspace('apartment') }} />
        : <ApartmentExplorer solar={solar} state={apartmentView} />}
      </Suspense>
    </main>
  )
}
