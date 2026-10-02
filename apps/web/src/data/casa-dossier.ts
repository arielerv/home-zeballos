import type { DossierEvidence, DossierFact, DossierObservation, DossierQuestion, DossierSource } from './dossier'
import type { Locale } from '../i18n/locale'
import tentativePlan from '../../../../assets/reference/casa-tentative-plan-data.json' with { type: 'json' }
import { CASA_SOLAR_SITE } from './casa-site.ts'

const viewedAt = '2026-10-02'

export type CasaDossierData = {
  reviewedAt: string
  sources: DossierSource[]
  facts: DossierFact[]
  questions: DossierQuestion[]
  observations: DossierObservation[]
  presentation: {
    heroKicker: string
    heroTitle: string
    place: string
    lead: string
    address: string
    mapLabel: string
    coordinateLabel: string
    reviewDate: string
    overviewTitle: string
    overviewBody: string
    identityTitle: string
    identityBody: string
    questionTitle: string
    questionBody: string
    stats: Array<{ label: string; value: string; unit?: string; note: string; section: 'apartment' | 'building' | 'sources' | 'questions' }>
    sections: Record<'overview' | 'apartment' | 'building' | 'energy' | 'sources' | 'questions', { eyebrow: string; title: string; description: string }>
    energyCards: Array<{ title: string; description: string }>
    footer: string
  }
}

const translated = <T,>(locale: Locale, es: T, en: T): T => locale === 'es' ? es : en

export function getCasaDossier(locale: Locale): CasaDossierData {
  const copy = locale === 'es' ? {
    sourceTitles: ['Diseño de planta tentativa', 'Modelo Blender anterior', 'Traza 2D Blender (borrador)', 'Referencia cartográfica y catastral', 'Panoramas Street View consultados', 'Fotografías de fachada (investigación interna)', 'Esquema de planta alta'],
    sourceDescriptions: [
      'Imagen aportada que define la distribución objetivo, rótulos, áreas impresas y anotaciones visibles. Autoridad de diseño donde muestra la casa; sin calibración métrica revisada.',
      'casa-2071-revision.blend y su GLB derivado. Solo documentan una versión anterior; sus paredes no sustituyen la planta tentativa.',
      'Archivo Blender nuevo y editable con el raster original empaquetado y 11 contornos 2D aproximados en píxeles. Es un borrador para revisar, no una casa 3D ni un plano aprobado.',
      'Captura Carto GBA de lotes de referencia 8 y 10. Orienta la búsqueda; no acredita lindero legal, mensura ni una huella precisa.',
      'Cuatro tomas de febrero de 2025: dos orientaciones desde cada punto consultado en Zeballos y Dardo Rocha. Muestran fachadas desde la calle; vegetación y perspectiva ocultan tramos. No prueban qué pared comparte linde.',
      'Las fotografías aportadas se consultaron para investigar materiales, accesos y estado visible. No se publican ni se embeben en el expediente web.',
      'Plano de planta alta con medidas declaradas aproximadas. Sin anclajes comunes revisados no determina el encaje vertical ni la altura de muros retenidos.',
    ],
    labels: [
      ['Superficie impresa · Sala de estar, comedor, cocina', 'Superficie impresa · Baño 2', 'Superficie impresa · Hab. Serv.', 'Superficie impresa · Distribuidor', 'Superficie impresa · ambiente sin rótulo (superior derecho)', 'Superficie impresa · Baño 1', 'Superficie impresa · ambiente sin rótulo (inferior derecho)', 'Superficie impresa · Living', 'Superficie impresa · Habitación 3', 'Superficie impresa · Cocina complementaria', 'Superficie impresa · Hall'],
      ['Sala de estar, comedor y cocina', 'Baño 2', 'Habitación de servicio', 'Distribuidor', 'Ambiente sin rótulo (superior derecho)', 'Baño 1', 'Ambiente sin rótulo (inferior derecho)', 'Living', 'Habitación 3', 'Cocina complementaria', 'Hall'],
    ],
    sourceAreaNote: 'Área transcrita de la imagen tentativa; no es una medición independiente. La superficie del polígono y la escala permanecen sin validar.',
    pending: 'Pendiente de traza y calibración',
    questionTitles: ['Calibrar la planta tentativa', 'Identificar retenciones y alturas existentes', 'Vincular puertas, accesos y ventanas', 'Verificar casas realmente linderas', 'Alinear la planta alta'],
    questionDescriptions: [
      'El diseño objetivo debe seguir la planta tentativa, no las paredes del Blender anterior. Los píxeles todavía no están registrados con cotas verificadas.',
      'Una altura del modelo anterior solo pasa al diseño si la misma pared está identificada como retenida y la cota está sustentada.',
      'El análisis solar por habitación requiere identificar accesos y ventanas de cada ambiente en la planta objetivo. No se agregan huecos por intuición.',
      'Las cuatro vistas ayudan a leer fachadas, pero no identifican límites parcelarios ni confirman qué viviendas comparten medianera.',
      'La hoja indica cotas aproximadas; faltan referencias medidas comunes con planta baja.',
    ],
    questionNeeded: [
      'Puntos comunes medidos/revisados y una longitud fiable; después confirmar la superposición 2D antes de extruir.',
      'Plano, sección, fotografía identificable o confirmación del usuario que enlace la altura con un elemento retenido.',
      'Una planta/elevación legible que relacione cada opening con su ambiente y muro.',
      'Trazado cartográfico/aéreo o parcelario revisado y correspondencia de las vistas con las viviendas contiguas.',
      'Medidas de nivel y puntos de alineación respecto de planta baja.',
    ],
    observationTitles: ['Viviendas residenciales hacia Zeballos', 'Frente comercial hacia Zeballos', 'Fachada y acceso desde Dardo Rocha', 'Casa residencial desde Dardo Rocha'],
    observationRooms: ['Manzana · no asignada a parcela', 'Frente comercial · excluido de vecinos', 'Manzana · relación parcelaria pendiente', 'Manzana · relación parcelaria pendiente'],
    observationDescriptions: [
      'Panorama de calle con varias fachadas residenciales, cercos, árboles y accesos. La copa y el ángulo esconden continuidad y límites; no asignar un contorno a un lote concreto.',
      'Se ve una estación de servicio/minimercado y su cubierta. Es comercio del frente, no casa lindera: queda excluido de la capa vecinos.',
      'Vista desde el frente lateral con vegetación, rejas y volúmenes parcialmente tapados. Permite inventariar rasgos visibles, no medir ni confirmar medianeras.',
      'Vista oblicua de una vivienda de dos niveles desde la calle. La toma por sí sola no demuestra que sea adyacente al terreno de Casa 2071.',
    ],
  } : {
    sourceTitles: ['Tentative design floor plan', 'Prior Blender model', 'Blender 2D trace (draft)', 'Cartographic and cadastral reference', 'Street View panoramas reviewed', 'Facade photos (internal research)', 'Upper-floor sketch'],
    sourceDescriptions: [
      'User-supplied image defining the target layout, labels, printed areas and visible annotations. Design authority where it depicts the house; no reviewed metric calibration.',
      'casa-2071-revision.blend and derived GLB. These document a prior version only; their walls do not replace the tentative plan.',
      'New editable Blender file with the original raster packed and 11 approximate room outlines in source pixels. This is an unreviewed draft, not a 3D house or approved drawing.',
      'Carto GBA screenshot for reference lots 8 and 10. It guides research; it does not establish legal boundaries, survey, or precise footprint.',
      'Four February 2025 views: two headings from each consulted point at Zeballos and Dardo Rocha. They show street facades; foliage and perspective obscure sections. They do not prove which wall shares a boundary.',
      'User-supplied photos were consulted to research materials, access, and visible condition. They are not published or embedded in the web dossier.',
      'Upper-floor sketch with explicitly approximate dimensions. Without reviewed common anchors, it does not determine vertical alignment or retained wall heights.',
    ],
    labels: [
      ['Printed area · Living, dining, kitchen', 'Printed area · Bathroom 2', 'Printed area · Service room', 'Printed area · Distributor', 'Printed area · unlabeled room (upper right)', 'Printed area · Bathroom 1', 'Printed area · unlabeled room (lower right)', 'Printed area · Living room', 'Printed area · Bedroom 3', 'Printed area · Secondary kitchen', 'Printed area · Hall'],
      ['Living, dining and kitchen', 'Bathroom 2', 'Service room', 'Distributor', 'Unlabeled room (upper right)', 'Bathroom 1', 'Unlabeled room (lower right)', 'Living room', 'Bedroom 3', 'Secondary kitchen', 'Hall'],
    ],
    sourceAreaNote: 'Area transcribed from the tentative image; not an independent measurement. Polygon area and scale remain unverified.',
    pending: 'Trace and calibration pending',
    questionTitles: ['Calibrate the tentative plan', 'Identify retained elements and heights', 'Map doors, access and windows', 'Verify truly adjoining homes', 'Align the upper-floor plan'],
    questionDescriptions: [
      'The target design must follow the tentative plan, not the prior Blender walls. Pixels have not yet been registered against verified dimensions.',
      'A prior model height carries over only if the same wall is identified as retained and the height is supported.',
      'Room-level solar analysis requires identifying access points and windows in each target-plan room. Do not add openings by intuition.',
      'The four views help read facades, but do not identify parcel boundaries or prove which houses share a party wall.',
      'The sheet says dimensions are approximate; shared measured references to the ground floor are missing.',
    ],
    questionNeeded: [
      'Reviewed shared control points and one reliable length; then approve the 2D overlay before extrusion.',
      'A plan, section, identifiable photo, or user confirmation linking the height to a retained element.',
      'A legible plan/elevation linking each opening to its room and host wall.',
      'Reviewed cartographic/aerial or parcel trace plus correspondence between the views and adjoining homes.',
      'Level measurements and alignment points relative to the ground floor.',
    ],
    observationTitles: ['Residential facades on Zeballos', 'Commercial frontage on Zeballos', 'Facade and access from Dardo Rocha', 'Residential house from Dardo Rocha'],
    observationRooms: ['Block · parcel not identified', 'Commercial frontage · excluded from neighbors', 'Block · parcel relation pending', 'Block · parcel relation pending'],
    observationDescriptions: [
      'Street panorama with residential-looking facades, fences, trees and entrances. Canopies and perspective obscure continuity and lot boundaries; do not assign one outline to a specific parcel.',
      'A fuel station/minimarket and canopy are visible. This is commercial frontage, not an adjoining house: exclude it from the neighbor layer.',
      'View from the side frontage with foliage, fences and partly hidden volumes. Useful for visible-feature research, not measurement or party-wall confirmation.',
      'Oblique street view of a two-level residence. This view alone does not prove it adjoins Casa 2071.',
    ],
  }

  const tentativeSource = {
    id: 'tentative-plan', title: copy.sourceTitles[0], publisher: translated(locale, 'Imagen aportada por la propietaria', 'User-supplied image'), kind: 'reference' as const,
    description: copy.sourceDescriptions[0], date: '2026-10-02', label: `${tentativePlan.source.path} · 1158 × 852 · SHA-256 ${tentativePlan.source.sha256}`,
  }
  const sources: DossierSource[] = [
    { id: 'project-brief', title: translated(locale, 'Identificación y accesos indicados', 'User-provided property brief'), publisher: translated(locale, 'Propietaria del proyecto', 'Project owner'), kind: 'reference', description: translated(locale, 'Dirección y segundo frente ingresados por la usuaria. El amarre exacto de ambos accesos con la parcela queda sujeto a verificación.', 'Address and second frontage supplied by the user. Their exact relationship to the parcel remains to be verified.'), date: viewedAt, label: translated(locale, 'Dato de entrada del proyecto', 'Project input') },
    tentativeSource,
    { id: 'prior-blender', title: copy.sourceTitles[1], publisher: 'Fuente local Blender', kind: 'model', description: copy.sourceDescriptions[1], date: '2026-10-02', label: 'Conservado sin sobrescribir · geometría anterior' },
    { id: 'tentative-trace-blender', title: copy.sourceTitles[2], publisher: 'Generado en Blender 5.2.2', kind: 'model', description: copy.sourceDescriptions[2], localUrl: '/models/casa-2071/casa-2071-tentative-trace-review.blend', date: viewedAt, label: 'Borrador editable · píxeles de origen · calibración y revisión pendientes' },
    { id: 'parcel-reference', title: copy.sourceTitles[3], publisher: 'Carto GBA · ARBA', kind: 'reference', description: copy.sourceDescriptions[3], url: 'https://carto.arba.gov.ar/cartoArba/', date: '2026-10-02', label: 'Captura aportada · no mensura' },
    { id: 'street-view', title: copy.sourceTitles[4], publisher: 'Google Street View', kind: 'reference', description: copy.sourceDescriptions[4], date: viewedAt, label: 'Consulta/revisión 2026-10-02 · panoramas de 2025-02 · 4 headings · análisis interno' },
    { id: 'facade-photos', title: copy.sourceTitles[5], publisher: translated(locale, 'Fotos aportadas por la propietaria', 'User-supplied photos'), kind: 'reference', description: copy.sourceDescriptions[5], date: '2026-10-02', label: translated(locale, 'No publicadas', 'Not published') },
    { id: 'upper-floor', title: copy.sourceTitles[6], publisher: translated(locale, 'Plano aportado', 'User-supplied plan'), kind: 'reference', description: copy.sourceDescriptions[6], date: '2026-10-02', label: '1er piso.webp · calibration pending' },
  ]

  const evidence = (sourceId: string, locator: string): DossierEvidence[] => [{ sourceId, locator }]
  const facts: DossierFact[] = [
    { id: 'house-address', section: 'identity', label: translated(locale, 'Dirección del proyecto', 'Project address'), value: 'Av. Estanislao Zeballos 2071, Castelar, Morón', scope: 'Dirección', status: 'reported', review: 'checked', evidence: evidence('project-brief', 'User-provided project brief'), sourceIds: ['project-brief'], note: translated(locale, 'Dirección suministrada por la propietaria. El punto geográfico disponible es interpolado; no es mensura.', 'Address supplied by the owner. The available geographic point is interpolated, not a survey.') },
    { id: 'street-access', section: 'identity', label: translated(locale, 'Segundo frente indicado', 'Second stated frontage'), value: 'Gobernador Dardo Rocha 877', scope: 'Dirección', status: 'reported', review: 'pending', evidence: evidence('project-brief', 'User-provided project brief'), sourceIds: ['project-brief'], note: translated(locale, 'Referencia de acceso provista; su lindero y correspondencia con el perímetro requieren cotejo.', 'User-supplied access reference; its parcel relationship and perimeter correspondence need review.') },
    { id: 'plan-area-set', section: 'apartment', label: translated(locale, 'Ambientes con superficie impresa', 'Rooms with printed areas'), value: '11', numericValue: 11, scope: 'Vivienda', status: 'reported', review: 'checked', evidence: evidence('tentative-plan', 'Image labels and room areas'), sourceIds: ['tentative-plan'], note: translated(locale, 'Conteo de los rótulos/superficies transcritos. No implica geometría métrica revisada.', 'Count of transcribed room labels/areas. Does not imply reviewed metric geometry.') },
    ...tentativePlan.rooms.map((room, index): DossierFact => ({
      id: `tentative-area-${room.id}`, roomId: room.id, section: 'apartment', label: copy.labels[0][index], value: room.printedAreaM2.toLocaleString(locale === 'es' ? 'es-ES' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), numericValue: room.printedAreaM2, unit: 'm²', scope: 'Estancia', status: 'reported', review: 'original-pending',
      evidence: evidence('tentative-plan', `Printed area: ${room.printedAreaM2} m²`), sourceIds: ['tentative-plan'], note: copy.sourceAreaNote,
    })),
    { id: 'plan-calibration', section: 'apartment', label: translated(locale, 'Escala del raster', 'Raster calibration'), value: copy.pending, scope: 'Edificio', status: 'pending', review: 'pending', evidence: evidence('tentative-plan', 'No approved image-to-metric anchors'), sourceIds: ['tentative-plan'], note: translated(locale, 'No convertir píxeles a metros ni deducir dimensiones desde las áreas solamente.', 'Do not convert pixels to metres or derive dimensions from areas alone.') },
    { id: 'parcel-survey', section: 'context', label: translated(locale, 'Lindero legal y mensura', 'Legal boundary and survey'), value: copy.pending, scope: 'Parcela', status: 'pending', review: 'pending', evidence: evidence('parcel-reference', 'Carto GBA screenshot · lots 8 and 10'), sourceIds: ['parcel-reference'], note: translated(locale, 'La captura no es un plano parcelario certificado ni acredita la subdivisión interior.', 'The screenshot is not a certified parcel plan and does not establish the internal subdivision.') },
    { id: 'adjacent-neighbors', section: 'context', label: translated(locale, 'Huellas de casas linderas', 'Adjoining-home footprints'), value: copy.pending, scope: 'Entorno', status: 'pending', review: 'pending', evidence: evidence('street-view', 'Four street-level headings; visual adjacency not confirmed'), sourceIds: ['street-view'], note: copy.sourceDescriptions[3] },
    { id: 'model-north', section: 'building', label: translated(locale, 'Norte y orientación del Blender', 'Blender north/orientation'), value: copy.pending, scope: 'Edificio', status: 'pending', review: 'pending', evidence: evidence('prior-blender', 'No georeferenced transform in source scene'), sourceIds: ['prior-blender'], note: translated(locale, 'La posición del sol se calcula para la dirección, pero no se proyecta sobre una casa cuyo norte no está calibrado.', 'The sun position is calculated for the address, but is not projected onto a house whose north is uncalibrated.') },
    { id: 'energy-evidence', section: 'energy', label: translated(locale, 'Datos de consumo/energía', 'Energy/consumption data'), value: copy.pending, scope: 'Edificio', status: 'pending', review: 'pending', evidence: evidence('tentative-plan', 'No energy certificate, bill, or measured data received'), sourceIds: ['tentative-plan'], note: translated(locale, 'No se infieren rendimiento, consumo ni cumplimiento normativo desde las fotos o la planta.', 'Do not infer performance, consumption, or code compliance from photos or the floor plan.') },
  ]
  const questions: DossierQuestion[] = copy.questionTitles.map((title, index) => ({
    id: `casa-question-${index + 1}`, title,
    description: copy.questionDescriptions[index], needed: copy.questionNeeded[index],
    sourceIds: [index === 3 ? 'street-view' : index === 1 ? 'prior-blender' : 'tentative-plan'],
  }))
  const viewObservation = (id: string, sourceId: string, index: number): DossierObservation => ({
    id, room: copy.observationRooms[index], title: copy.observationTitles[index], description: copy.observationDescriptions[index],
    evidence: `Google Street View · ${index < 2 ? 'Zeballos' : 'Dardo Rocha'} · pano 2025-02 · heading ${[0, 180, 90, 270][index]}°`,
    status: 'observed', sourceIds: [sourceId],
  })
  const observations = [
    viewObservation('street-zeballos-0', 'street-view', 0),
    viewObservation('street-zeballos-180', 'street-view', 1),
    viewObservation('street-dardo-90', 'street-view', 2),
    viewObservation('street-dardo-270', 'street-view', 3),
  ]
  return {
    reviewedAt: viewedAt, sources, facts, questions, observations,
    presentation: {
      place: 'Castelar · Morón · Buenos Aires',
      lead: translated(locale, 'La planta tentativa gobierna el diseño objetivo; las medidas aún no están calibradas.', 'The tentative plan governs the target design; metric calibration is still pending.'),
      address: 'Av. Estanislao Zeballos 2071',
      mapLabel: translated(locale, 'Punto de dirección interpolado · no mensura', 'Interpolated address point · not a survey'),
      heroKicker: translated(locale, 'EXPEDIENTE DE PROYECTO · CASTELAR', 'PROJECT DOSSIER · CASTELAR'),
      heroTitle: translated(locale, 'Casa 2071 · planta tentativa', 'Casa 2071 · tentative design'),
      coordinateLabel: `${CASA_SOLAR_SITE.latitude.toFixed(5)}° · ${CASA_SOLAR_SITE.longitude.toFixed(5)}°`,
      reviewDate: translated(locale, '4 vistas Street View revisadas · 02/10/2026', '4 Street View images reviewed · 02 Oct 2026'),
      overviewTitle: translated(locale, 'Diseño objetivo según la planta tentativa', 'Target design from the tentative plan'),
      overviewBody: translated(locale, 'La planta tentativa define la distribución y las áreas visibles. El Blender anterior queda como evidencia, no como la casa reformada.', 'The tentative plan defines the shown layout and printed areas. The prior Blender file remains evidence, not the remodeled house.'),
      identityTitle: translated(locale, 'Zeballos 2071 · Castelar', 'Zeballos 2071 · Castelar'),
      identityBody: translated(locale, 'Punto interpolado para localizar el estudio astronómico. No es una mensura ni fija el norte del modelo.', 'Interpolated point used to locate the astronomical study. It is not a survey and does not set model north.'),
      questionTitle: translated(locale, 'La planta aún no está calibrada', 'The plan is not yet calibrated'),
      questionBody: translated(locale, 'Las áreas impresas no bastan para deducir largos, alturas o escala. El modelo 3D y la luz por ambiente esperan referencias verificables.', 'Printed areas are not enough to derive lengths, heights, or scale. 3D geometry and room sunlight need verified references.'),
      stats: [
        { label: translated(locale, 'Ambientes rotulados', 'Labeled rooms'), value: '11', note: translated(locale, 'áreas transcritas de la planta tentativa', 'areas transcribed from tentative plan'), section: 'apartment' as const },
        { label: translated(locale, 'Frentes indicados', 'Stated frontages'), value: '2', note: translated(locale, 'Zeballos y Dardo Rocha · relación por confirmar', 'Zeballos and Dardo Rocha · relation to verify'), section: 'building' as const },
        { label: translated(locale, 'Vistas públicas revisadas', 'Public views reviewed'), value: '4', note: translated(locale, 'solo referencia visual, no mensura', 'visual reference only, not a survey'), section: 'sources' as const },
        { label: translated(locale, 'Anclajes métricos aprobados', 'Approved metric anchors'), value: '0', note: translated(locale, 'no emitir geometría métrica todavía', 'do not generate metric geometry yet'), section: 'questions' as const },
      ],
      sections: locale === 'es' ? {
        overview: { eyebrow: 'Casa 2071', title: 'Resumen de la vivienda', description: 'Datos del proyecto, la dirección y el estado de la evidencia.' },
        apartment: { eyebrow: 'Planta tentativa', title: 'Ambientes y superficies', description: 'Áreas impresas en el plano aportado. Todavía no equivalen a áreas medidas del modelo.' },
        building: { eyebrow: 'Sitio y entorno', title: 'Casa, lote y calles', description: 'Separación entre casa, referencias catastrales, calles y vecinos pendientes de verificar.' },
        energy: { eyebrow: 'Información pendiente', title: 'Energía y normativa', description: 'No se recibieron mediciones ni certificados. No se infieren consumo ni cumplimiento.' },
        sources: { eyebrow: 'Procedencia', title: 'Fuentes consultadas', description: 'Documentos, modelo previo y observaciones Street View con sus límites.' },
        questions: { eyebrow: 'Siguiente revisión', title: 'Pendientes de verificación', description: 'Decisiones y evidencias que faltan para calibrar y validar el diseño.' },
      } : {
        overview: { eyebrow: 'Casa 2071', title: 'House overview', description: 'Project data, address, and evidence status.' },
        apartment: { eyebrow: 'Tentative floor plan', title: 'Rooms and areas', description: 'Areas printed on the supplied plan. These are not measured model areas yet.' },
        building: { eyebrow: 'Site and surroundings', title: 'House, parcel, and streets', description: 'Distinguish the house, cadastral references, streets, and neighbors still to verify.' },
        energy: { eyebrow: 'Information pending', title: 'Energy and regulation', description: 'No measurements or certificates were supplied. Do not infer consumption or compliance.' },
        sources: { eyebrow: 'Provenance', title: 'Sources reviewed', description: 'Documents, prior model, and Street View observations with their limitations.' },
        questions: { eyebrow: 'Next review', title: 'Open verification items', description: 'Evidence and decisions needed to calibrate and validate the design.' },
      },
      energyCards: locale === 'es' ? [
        { title: 'Certificado energético', description: 'No se aportó certificado verificable.' },
        { title: 'Consumo medido', description: 'No se aportaron facturas ni lecturas.' },
        { title: 'Normativa de obra', description: 'Requiere reglas vigentes de Morón y revisión profesional.' },
      ] : [
        { title: 'Energy certificate', description: 'No verifiable certificate was supplied.' },
        { title: 'Measured consumption', description: 'No bills or meter readings were supplied.' },
        { title: 'Building regulations', description: 'Requires current Morón rules and professional review.' },
      ],
      footer: translated(locale, 'Expediente de Casa 2071 · fuentes y límites visibles · sin mensura ni plano de obra', 'Casa 2071 dossier · sources and limitations visible · not a survey or construction plan'),
    },
  }
}
