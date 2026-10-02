import { useEffect, useMemo, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { DossierQuestion, DossierSource, DossierStatus } from '../data/dossier'
import { BUILDING_SITE, SITE_BUILDINGS, SITE_PARCEL } from '../data/building-site'
import { t3Apartment } from '../data/t3'
import { useLocale } from '../i18n/useLocale'
import { roomLabel } from '../i18n/workspace-labels'
import { localizeDossier, matchesDossierQuery as matches, type LocalizedFact } from '../i18n/dossier-content'
import { resources } from '../i18n/resources'
import { DossierApartmentPlan, DossierIcon, DossierSitePlan } from './DossierVisuals'
import { getCasaDossier, type CasaDossierData } from '../data/casa-dossier'
import tentativePlanImage from '../../../../assets/reference/casa-2071-planta-limpia.png'
import cartoImage from '../../../../assets/reference/carto.webp'
import { publicAssetUrl } from '../lib/public-asset-url'
import '../dossier.css'

type Section = 'overview' | 'apartment' | 'building' | 'energy' | 'sources' | 'questions'
type OpenSource = (id: string) => void
type Translator = TFunction<'dossier'>

function Status({ status, t }: { status: DossierStatus; t: Translator }) {
  return <span className={`dossier-status status-${status}`}><span />{t(`ui.status.${status}`)}</span>
}

function SourceLinks({ ids, onOpen, t, sources }: { ids: readonly string[]; onOpen: OpenSource; t: Translator; sources: readonly DossierSource[] }) {
  return <div className="dossier-source-links">{ids.map(id => {
    const source = sources.find(item => item.id === id)
    return source ? <button key={id} onClick={() => onOpen(id)} title={`${t('ui.openOriginalEvidence')}: ${source.title}`}><DossierIcon name="source" size={12} />{source.publisher}<span aria-hidden="true">↗</span></button> : null
  })}</div>
}

function Facts({ facts, onOpenSource, t, sources }: { facts: readonly LocalizedFact[]; onOpenSource: OpenSource; t: Translator; sources: readonly DossierSource[] }) {
  return <div className="dossier-facts">{facts.map(fact => <article className="dossier-fact" key={fact.id}>
    <div className="dossier-fact-top"><span className="dossier-field-label">{fact.label}</span><Status status={fact.status} t={t} /></div>
    <p className={`dossier-fact-value${fact.value.length > 34 ? ' value-long' : ''}`}>{fact.value}{fact.unit && <span> {fact.unit}</span>}</p>
    <span className="dossier-scope">{fact.scope}</span>
    <p className="dossier-fact-note">{fact.note}</p>
    <SourceLinks ids={fact.sourceIds} onOpen={onOpenSource} t={t} sources={sources} />
  </article>)}</div>
}

function SourceCards({ sources, onOpen, t }: { sources: readonly DossierSource[]; onOpen: OpenSource; t: Translator }) {
  return <div className="dossier-source-grid">{sources.map((source, index) => <button key={source.id} className="dossier-source-card" onClick={() => onOpen(source.id)}>
    <div className="dossier-source-card-top"><span className="dossier-source-symbol"><DossierIcon name="source" size={21} /></span><span className="dossier-source-number">{String(index + 1).padStart(2, '0')} <span aria-hidden="true">↗</span></span></div>
    <span className="dossier-source-publisher">{source.publisher}</span><strong>{source.title}</strong><p>{source.description}</p>
    <span className="dossier-source-card-footer">{t('ui.sourceCard')} <DossierIcon name="arrow" size={15} /></span>
  </button>)}</div>
}

function Questions({ questions, onOpenSource, t, sources }: { questions: readonly DossierQuestion[]; onOpenSource: OpenSource; t: Translator; sources: readonly DossierSource[] }) {
  return <div className="dossier-questions">{questions.map((question, index) => <article key={question.id} className="dossier-question">
    <span className="dossier-question-index">{String(index + 1).padStart(2, '0')}</span><div><h4>{question.title}</h4><p>{question.description}</p><div className="dossier-needed"><DossierIcon name="source" size={14} /><span>{question.needed}</span></div><SourceLinks ids={question.sourceIds} onOpen={onOpenSource} t={t} sources={sources} /></div>
  </article>)}</div>
}

function SourceDialog({ source, onClose, facts }: { source: DossierSource; onClose: () => void; facts: readonly LocalizedFact[] }) {
  const { t } = useTranslation('dossier')
  const { formatDate, formatNumber } = useLocale()
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])
  const linkedFacts = facts.filter(fact => fact.sourceIds.includes(source.id))
  return <dialog ref={dialog} className="dossier-dialog" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }} aria-labelledby="dossier-source-title">
    <div className="dossier-dialog-content">
      <div className="dossier-dialog-heading"><span className="dossier-kicker">{t('ui.sourceEvidence')}</span><button className="dossier-icon-button" onClick={onClose} aria-label={t('ui.closeSource')} autoFocus><DossierIcon name="close" /></button></div>
      <span className="dossier-dialog-symbol"><DossierIcon name="source" size={27} /></span>
      <p className="dossier-source-publisher">{source.publisher}</p><h2 id="dossier-source-title">{source.title}</h2><p className="dossier-dialog-description">{source.description}</p>
      <dl className="dossier-source-meta"><div><dt>{t('ui.sourceType')}</dt><dd>{t(`ui.sourceKind.${source.kind}`)}</dd></div><div><dt>{t('ui.consultationReview')}</dt><dd><time dateTime={source.date}>{formatDate(new Date(`${source.date}T12:00:00Z`), { day: '2-digit', month: 'short', year: 'numeric' })}</time></dd></div></dl>
      {source.label && <p className="dossier-caption">{source.label}</p>}
      <div className="dossier-dialog-actions">{source.url && <a href={source.url} target="_blank" rel="noreferrer" className="dossier-button primary">{t('ui.originalSource')} <span aria-hidden="true">↗</span></a>}{source.localUrl && <a href={publicAssetUrl(source.localUrl)} target="_blank" rel="noreferrer" className="dossier-button">{t('ui.availableCopy')} <span aria-hidden="true">↗</span></a>}</div>
      {linkedFacts.length > 0 && <div className="dossier-linked-facts"><h3>{t('ui.linkedFacts')} <span>{formatNumber(linkedFacts.length)}</span></h3>{linkedFacts.map(fact => <div key={fact.id}><span>{fact.label}<small>{fact.scope} · {t(`ui.status.${fact.status}`)}</small>{fact.review !== 'checked' && <small className="dossier-review-note">{t(`ui.review.${fact.review}`)}</small>}{fact.evidence.filter(item => item.sourceId === source.id).map(item => <small className="dossier-evidence-locator" key={item.locator}>{item.locator}</small>)}</span><strong>{fact.value}{fact.unit && ` ${fact.unit}`}</strong></div>)}</div>}
      <p className="dossier-dialog-footnote">{t('ui.dateCaveat')}</p>
    </div>
  </dialog>
}

function SurfaceBreakdown({ casa }: { casa?: CasaDossierData }) {
  const { t } = useTranslation('dossier')
  const { t: workspaceT } = useTranslation('workspace')
  const { formatNumber } = useLocale()
  if (casa) {
    const rooms = casa.facts.filter(fact => fact.roomId && fact.section === 'apartment')
    return <div className="dossier-surfaces">
      <table><caption>{t('ui.tableCaption')}</caption><thead><tr><th scope="col">{t('ui.room')}</th><th scope="col">{t('ui.area')}</th></tr></thead><tbody>{rooms.map(fact => <tr key={fact.id}><th scope="row">{fact.label.replace(/^.* · /, '')}</th><td>{fact.value} <span>m²</span></td></tr>)}</tbody></table>
      <p className="dossier-caption">{casa.presentation.lead}</p>
    </div>
  }
  return <div className="dossier-surfaces">
    <div className="dossier-area-strip" aria-hidden="true">{t3Apartment.rooms.map((room, index) => <span key={room.id} style={{ flex: room.reportedArea }} className={`room-tone-${index}`} />)}</div>
    <table><caption>{t('ui.tableCaption')}</caption><thead><tr><th scope="col">{t('ui.room')}</th><th scope="col">{t('ui.area')}</th></tr></thead><tbody>{t3Apartment.rooms.map((room, index) => <tr key={room.id}><th scope="row"><i className={`room-tone-${index}`} />{roomLabel(workspaceT, room.id)}</th><td>{formatNumber(room.reportedArea, 2)} <span>m²</span></td></tr>)}</tbody><tfoot><tr><th scope="row">{t('ui.reportedTotal')}</th><td>{formatNumber(t3Apartment.metadata.reportedCarrezArea, 2)} <span>m²</span></td></tr></tfoot></table>
    <p className="dossier-caption">{t('ui.areaSumCaption')}</p>
  </div>
}

export function DossierExplorer({ onOpenApartment, onOpenBuilding, project = 't3' }: { onOpenApartment: () => void; onOpenBuilding: () => void; project?: 't3' | 'casa' }) {
  const { t } = useTranslation('dossier')
  const { t: workspaceT } = useTranslation('workspace')
  const { locale, formatNumber, compass } = useLocale()
  const casa = useMemo(() => project === 'casa' ? getCasaDossier(locale) : undefined, [project, locale])
  const planUrl = casa ? tentativePlanImage : publicAssetUrl('/dossier/apartment-plan.png')
  const localizedT3 = useMemo(() => localizeDossier(locale, t, workspaceT), [locale, t, workspaceT])
  const dossierFacts = casa?.facts ?? localizedT3.facts
  const dossierSources = casa?.sources ?? localizedT3.sources
  const dossierQuestions = casa?.questions ?? localizedT3.questions
  const dossierObservations = casa?.observations ?? localizedT3.observations
  const catalog = resources[locale].dossier
  const [section, setSection] = useState<Section>('overview')
  const [query, setQuery] = useState('')
  const [sourceId, setSourceId] = useState<string | null>(null)
  const panel = useRef<HTMLElement>(null)
  const source = dossierSources.find(item => item.id === sourceId)
  const search = query.trim()
  const foundFacts = search ? dossierFacts.filter(fact => matches(search, [fact.label, fact.value, fact.unit, fact.scope, fact.note, fact.section === 'energy' ? t('ui.sections.energy') : '', t(`ui.status.${fact.status}`), ...fact.evidence.map(item => item.locator), ...fact.sourceIds.map(id => {
    const source = dossierSources.find(item => item.id === id)
    return source ? `${source.publisher} ${source.title} ${source.description}` : ''
  })].join(' '))) : []
  const foundSources = search ? dossierSources.filter(source => matches(search, `${source.title} ${source.publisher} ${source.description} ${source.label}`)) : []
  const foundQuestions = search ? dossierQuestions.filter(question => matches(search, `${question.title} ${question.description} ${question.needed}`)) : []
  const foundObservations = search ? dossierObservations.filter(item => matches(search, `${item.room} ${item.title} ${item.description} ${item.evidence}`)) : []
  const count = foundFacts.length + foundSources.length + foundQuestions.length + foundObservations.length
  const targetBuilding = SITE_BUILDINGS.find(building => building.isTarget)
  const observationsView = (items = dossierObservations) => <div className="dossier-observations">{items.map(item => <article key={item.id}><span className="dossier-observation-room">{item.room}</span><h4>{item.title}</h4><p>{item.description}</p><small>{item.evidence}</small><SourceLinks ids={item.sourceIds} onOpen={setSourceId} t={t} sources={dossierSources} /></article>)}</div>
  function navigate(next: Section) {
    setSection(next)
    setQuery('')
    // Keep the workspace hash intact: these are sections within Documentation.
    if (panel.current && window.scrollY > panel.current.offsetTop) panel.current.scrollIntoView({ block: 'start' })
  }
  const overviewIdentity = dossierFacts.filter(fact => fact.section === 'identity').slice(0, 4)
  const sectionIds = ['overview', 'apartment', 'building', 'energy', 'sources', 'questions'] as const
  const sectionIcons = { overview: 'book', apartment: 'home', building: 'building', energy: 'sun', sources: 'source', questions: 'question' } as const
  const pageTitle = casa?.presentation.sections[section] ?? catalog.ui.titles[section]
  const factsView = (items: readonly LocalizedFact[]) => <Facts facts={items} onOpenSource={setSourceId} t={t} sources={dossierSources} />
  const sourceCardsView = (items: readonly DossierSource[]) => <SourceCards sources={items} onOpen={setSourceId} t={t} />
  const questionsView = (items: readonly DossierQuestion[]) => <Questions questions={items} onOpenSource={setSourceId} t={t} sources={dossierSources} />
  return <div className="dossier">
    <header className="dossier-hero">
      <div className="dossier-intro"><span className="dossier-kicker"><span className="dossier-live-dot" />{casa?.presentation.heroKicker ?? t('ui.heroKicker')}</span>{casa ? <h2>{casa.presentation.heroTitle}</h2> : <h2><Trans t={t} i18nKey="ui.heroTitle" components={{ accent: <span /> }} /></h2>}<p>{casa?.presentation.lead ?? t('ui.heroDescription')}</p><div className="dossier-hero-meta"><span>{casa?.presentation.place ?? 'Quimper, Bretagne'}</span><span>{casa?.presentation.reviewDate ?? t('ui.reviewDate')}</span></div></div>
      <div className="dossier-map">{casa ? <img src={cartoImage} alt={casa.presentation.mapLabel} /> : <DossierSitePlan />}<div className="dossier-map-label"><span className="dossier-map-pin" /><div><strong>{casa?.presentation.address ?? 'Jean-Baptiste Colbert'}</strong><span>{casa?.presentation.mapLabel ?? t('ui.mapPlot', { label: SITE_PARCEL.label })}</span></div></div><span className="dossier-map-coordinates">{casa ? casa.presentation.coordinateLabel : `${formatNumber(BUILDING_SITE.latitude, 4)}° N · ${formatNumber(Math.abs(BUILDING_SITE.longitude), 4)}° ${compass(270)}`}</span></div>
    </header>

    <div className="dossier-stats" aria-label={t('ui.statsLabel')}>
      {casa ? casa.presentation.stats.map(stat => <button key={stat.label} onClick={() => navigate(stat.section)}><span>{stat.label}</span><strong>{stat.value}{stat.unit && <small>{stat.unit}</small>}</strong><div>{stat.note} <span aria-hidden="true">↗</span></div></button>) : <>
        <button onClick={() => navigate('apartment')}><span>{t('ui.apartmentArea')}</span><strong>{formatNumber(t3Apartment.metadata.reportedCarrezArea, 2)}<small>m²</small></strong><div>{t('ui.carrezReported')} <span aria-hidden="true">↗</span></div></button>
        <button onClick={() => navigate('building')}><span>{t('ui.plot')}</span><strong>{formatNumber(SITE_PARCEL.area)}<small>m²</small></strong><div>{t('ui.cadastralArea')} <span aria-hidden="true">↗</span></div></button>
        <button onClick={() => navigate('building')}><span>{t('ui.buildingHeight')}</span><strong>{targetBuilding ? formatNumber(targetBuilding.height, 1) : t('ui.noData')}<small>m</small></strong><div>{t('ui.ignRecord')}{targetBuilding?.verticalAccuracy != null && ` · ${t('ui.accuracy')} ${formatNumber(targetBuilding.verticalAccuracy, 1)} m`} <span aria-hidden="true">↗</span></div></button>
        <button onClick={() => navigate('sources')}><span>{t('ui.evidenceGathered')}</span><strong>{formatNumber(dossierSources.length).padStart(2, '0')}<small>{t('ui.sources')}</small></strong><div>{t('ui.recordsReferences')} <span aria-hidden="true">↗</span></div></button>
      </>}
    </div>

    <div className="dossier-body">
      <aside className="dossier-sidebar"><span className="dossier-kicker">{t('ui.explore')}</span><nav aria-label={t('ui.documentationSections')}>{sectionIds.map(id => <button key={id} aria-current={section === id && !search ? 'page' : undefined} onClick={() => navigate(id)}><DossierIcon name={sectionIcons[id]} size={17} /><span>{catalog.ui.sections[id]}</span>{id === 'questions' && <small>{formatNumber(dossierQuestions.length)}</small>}</button>)}</nav><div className="dossier-legend"><span className="dossier-kicker">{t('ui.readData')}</span><Status status="official" t={t} /><Status status="reported" t={t} /><Status status="estimated" t={t} /><p>{t('ui.legend')}</p></div><button className="dossier-print" onClick={() => window.print()}><DossierIcon name="print" size={16} />{t('ui.print')}</button></aside>

      <section className="dossier-content" ref={panel} aria-label={t('ui.contentLabel')}>
        <div className="dossier-content-heading"><div><span className="dossier-kicker">{search ? t('ui.searchInFile') : pageTitle.eyebrow}</span><h3>{search ? t('ui.findInSources') : pageTitle.title}</h3></div><div className="dossier-search"><DossierIcon name="search" size={17} /><label htmlFor="dossier-search" className="sr-only">{t('ui.searchLabel')}</label><input id="dossier-search" type="search" placeholder={t('ui.searchPlaceholder')} value={query} onChange={event => setQuery(event.target.value)} />{query && <button aria-label={t('ui.clearSearch')} onClick={() => setQuery('')}><DossierIcon name="close" size={15} /></button>}</div></div>
        <p className="dossier-section-description" aria-live="polite">{search ? t('ui.results', { count, query: search }) : pageTitle.description}</p>

        {search ? <div className="dossier-search-results">{count === 0 && <div className="dossier-empty"><DossierIcon name="search" size={28} /><h4>{t('ui.emptyTitle')}</h4><p>{t('ui.emptyDescription')}</p><button className="dossier-button" onClick={() => setQuery('')}>{t('ui.backToFile')}</button></div>}{foundFacts.length > 0 && <><h4 className="dossier-subheading">{t('ui.factsHeading')}</h4>{factsView(foundFacts)}</>}{foundSources.length > 0 && <><h4 className="dossier-subheading">{t('ui.sourcesHeading')}</h4>{sourceCardsView(foundSources)}</>}{foundQuestions.length > 0 && <><h4 className="dossier-subheading">{t('ui.questionsHeading')}</h4>{questionsView(foundQuestions)}</>}{foundObservations.length > 0 && <><h4 className="dossier-subheading">{t('ui.observedHeading')}</h4>{observationsView(foundObservations)}</>}</div>
        : section === 'overview' ? <>
          <div className="dossier-overview-grid"><article className="dossier-summary-card"><div className="dossier-card-eyebrow"><DossierIcon name="home" size={18} /><span>{casa ? casa.presentation.overviewTitle : t('ui.aptLabel')}</span><Status status="reported" t={t} /></div><div className="dossier-apartment-summary"><div><h4>{casa ? casa.presentation.overviewTitle : <Trans t={t} i18nKey="ui.eightRooms" />}</h4><p>{casa ? casa.presentation.overviewBody : t('ui.apartmentIntro')}</p><button className="dossier-text-button" onClick={() => navigate('apartment')}>{t('ui.exploreAreas')} <DossierIcon name="arrow" size={16} /></button></div>{casa ? <img src={tentativePlanImage} alt={casa.presentation.mapLabel} /> : <DossierApartmentPlan />}</div><div className="dossier-card-foot">{casa ? casa.presentation.lead : t('ui.reconstructedPlan')}</div></article>
          <article className="dossier-summary-card dossier-address-card"><span className="dossier-kicker">{casa ? casa.presentation.place : t('ui.placeIdentity')}</span><h4>{casa ? casa.presentation.address : <>1ter impasse<br />Jean-Baptiste Colbert</>}</h4><p>{casa ? casa.presentation.place : '29000 Quimper · Finistère'}</p><div className="dossier-address-detail"><span>{casa ? casa.presentation.mapLabel : t('ui.oneBuilding')}</span><strong>{casa ? casa.presentation.coordinateLabel : '1 · 1 bis · 1 ter'}</strong><small>{casa ? casa.presentation.identityBody : t('ui.rnbRelation')}</small></div><button className="dossier-text-button" onClick={() => navigate('building')}>{t('ui.consultBuilding')} <DossierIcon name="arrow" size={16} /></button></article></div>
          <div className="dossier-note"><span className="dossier-note-icon"><DossierIcon name="question" size={21} /></span><div><h4>{casa ? casa.presentation.questionTitle : t('ui.floorConfirmation')}</h4><p>{casa ? casa.presentation.questionBody : t('ui.floorDescription')}</p></div><button onClick={() => navigate('questions')} aria-label={t('ui.seePending')}><DossierIcon name="arrow" size={19} /></button></div>
          <div className="dossier-section-line"><h4>{t('ui.documentedIdentity')}</h4><button className="dossier-text-button" onClick={() => navigate('sources')}>{t('ui.allSources')} <span aria-hidden="true">↗</span></button></div>{factsView(overviewIdentity)}
          <div className="dossier-model-links"><button onClick={onOpenApartment}><DossierIcon name="home" size={22} /><span><strong>{t('ui.tourApartment')}</strong><small>{t('ui.returnInterior')}</small></span><DossierIcon name="arrow" /></button><button onClick={onOpenBuilding}><DossierIcon name="sun" size={22} /><span><strong>{t('ui.viewBuildingSun')}</strong><small>{t('ui.placeInContext')}</small></span><DossierIcon name="arrow" /></button></div>
        </> : section === 'apartment' ? <>
          <div className="dossier-apartment-layout"><SurfaceBreakdown casa={casa} /><figure className="dossier-plan-card"><a href={planUrl} target="_blank" rel="noreferrer" aria-label={t('ui.openPlan')}><img src={planUrl} alt={casa ? casa.presentation.mapLabel : t('ui.planAlt')} /></a><figcaption>{casa ? casa.presentation.overviewTitle : t('ui.currentReference')}<span>{casa ? casa.presentation.lead : t('ui.estimatedShapes')}</span></figcaption><a href={planUrl} target="_blank" rel="noreferrer" className="dossier-text-button">{t('ui.openFullPlan')} ↗</a></figure></div>
          <h4 className="dossier-subheading">{t('ui.areasAttachments')}</h4>{factsView(dossierFacts.filter(fact => fact.section === 'apartment' && !fact.roomId))}
          <div className="dossier-section-line"><h4>{t('ui.referencesShow')}</h4><Status status="observed" t={t} /></div>{observationsView()}<p className="dossier-caption">{t('ui.observationCaveat')}</p>
        </> : section === 'building' ? <><div className="dossier-building-lead"><div><span className="dossier-kicker">{t('ui.fromCadastre')}</span><h4>{casa ? casa.presentation.identityTitle : <Trans t={t} i18nKey="ui.plotFootprintVolume" />}</h4><p>{casa ? casa.presentation.identityBody : t('ui.scalesDescription')}</p><button className="dossier-text-button" onClick={onOpenBuilding}>{t('ui.view3d')} <span aria-hidden="true">↗</span></button></div><div className="dossier-building-map">{casa ? <img src={cartoImage} alt={casa.presentation.mapLabel} /> : <DossierSitePlan />}<span>{casa ? casa.presentation.mapLabel : t('ui.mapLabel')}</span></div></div>{factsView(dossierFacts.filter(fact => fact.section === 'identity' || fact.section === 'building' || (casa && fact.section === 'context')))}</>
        : section === 'energy' ? <><div className="dossier-energy-intro"><span className="dossier-energy-icon"><DossierIcon name="sun" size={31} /></span><div><span className="dossier-kicker">{t('ui.nextLayer')}</span><h4>{casa ? pageTitle.title : <Trans t={t} i18nKey="ui.learnPerformance" />}</h4><p>{casa ? pageTitle.description : t('ui.dpeMissing')}</p></div></div><div className="dossier-energy-types">{casa ? casa.presentation.energyCards.map((card, index) => <div key={card.title}><span>{String(index + 1).padStart(2, '0')}</span><h4>{card.title}</h4><p>{card.description}</p></div>) : <><div><span>01</span><h4>{t('ui.energyDiagnosis')}</h4><p>{t('ui.conventionalPerformance')}</p></div><div><span>02</span><h4>{t('ui.estimatedCost')}</h4><p>{t('ui.diagnosisRange')}</p></div><div><span>03</span><h4>{t('ui.actualUse')}</h4><p>{t('ui.billsEnergyPeriod')}</p></div></>}</div>{factsView(dossierFacts.filter(fact => fact.section === 'energy' || fact.section === 'context'))}</>
        : section === 'sources' ? <>{casa ? <div className="dossier-library-note"><DossierIcon name="check" size={18} /><p>{casa.presentation.lead}</p></div> : <div className="dossier-library-note"><DossierIcon name="check" size={18} /><p>{t('ui.libraryNote')}</p><a href={publicAssetUrl('/dossier/official-sources-2026-09-27.json')} download><DossierIcon name="download" size={16} />{t('ui.downloadExtract')}</a></div>}{sourceCardsView(dossierSources)}</>
        : <><div className="dossier-questions-intro"><DossierIcon name="book" size={23} /><p>{t('ui.questionsIntro')}</p></div>{questionsView(dossierQuestions)}</>}
      </section>
    </div>
    <footer className="dossier-footer"><span><DossierIcon name="book" size={14} />{t('ui.footerTitle')}</span><p>{casa ? casa.presentation.footer : t('ui.footerDescription')}</p><span>{casa ? casa.presentation.reviewDate : t('ui.footerDate')}</span></footer>
    {source && <SourceDialog key={source.id} source={source} onClose={() => setSourceId(null)} facts={dossierFacts} />}
  </div>
}
