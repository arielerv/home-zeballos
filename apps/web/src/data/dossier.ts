import { t3Apartment } from './t3.ts'
import { APARTMENT_PLACEMENT } from './apartment-placement.ts'
import { BUILDING_SITE, SITE_BUILDINGS, SITE_PARCEL } from './building-site.ts'

export type DossierSection = 'identity' | 'building' | 'apartment' | 'energy' | 'context'
export type DossierStatus = 'official' | 'reported' | 'estimated' | 'observed' | 'pending' | 'derived'
export type DossierReview = 'checked' | 'original-pending' | 'disputed' | 'pending'
export type DossierScope = 'Dirección' | 'Parcela' | 'Edificio' | 'Grupo BDNB' | 'Departamento' | 'Vivienda' | 'Estancia' | 'Balcón' | 'Cave' | 'Entorno'

export interface DossierSource {
  id: string
  title: string
  publisher: string
  kind: 'public-record' | 'reference' | 'model' | 'official-guide'
  description: string
  url?: string
  localUrl?: string
  /** Date of the consultation/review described by label, not necessarily issuance. */
  date: string
  label?: string
}

export interface DossierEvidence {
  sourceId: string
  /** Original API field, document location, photograph or model property. */
  locator: string
}

export interface DossierFact {
  id: string
  section: DossierSection
  label: string
  value: string
  unit?: string
  scope: DossierScope
  status: DossierStatus
  review: DossierReview
  sourceIds: string[]
  evidence: DossierEvidence[]
  note: string
  /** Machine-readable value only when a number is actually available. */
  numericValue?: number
  roomId?: string
}

export interface DossierQuestion {
  id: string
  title: string
  description: string
  needed: string
  sourceIds: string[]
}

export interface DossierObservation {
  id: string
  room: string
  title: string
  description: string
  evidence: string
  status: 'observed'
  sourceIds: string[]
}

export const dossierReviewedAt = '2026-09-27'
const publicCaptureUrl = '/dossier/official-sources-2026-09-27.json'

export const dossierSources: DossierSource[] = [
  {
    id: 'ban', title: 'Dirección normalizada', publisher: 'IGN · Base Adresse Nationale', kind: 'public-record',
    description: 'Resultado seleccionado por el identificador de dirección. Su punto sitúa el acceso; no identifica por sí solo la parcela ni el lote interior.',
    url: 'https://data.geopf.fr/geocodage/search?q=1+ter+impasse+Jean-Baptiste+Colbert+Quimper&limit=5',
    localUrl: publicCaptureUrl, date: dossierReviewedAt, label: 'Consulta del 27/09/2026',
  },
  {
    id: 'rnb', title: 'Identidad del edificio', publisher: 'Référentiel National des Bâtiments', kind: 'public-record',
    description: 'Ficha RNB que relaciona los números 1, 1 bis y 1 ter con el edificio y sus identificadores externos. No identifica el departamento.',
    url: BUILDING_SITE.rnbUrl, localUrl: publicCaptureUrl, date: dossierReviewedAt, label: 'Consulta del 27/09/2026',
  },
  {
    id: 'cadastre', title: 'Parcela AL 0538', publisher: 'DGFiP · API Carto IGN', kind: 'public-record',
    description: 'Identificador, contenance y geometría de la parcela. La superficie catastral no es la superficie del departamento ni acredita la designación de sus lotes.',
    url: 'https://apicarto.ign.fr/api/cadastre/parcelle?code_insee=29232&section=AL&numero=0538',
    localUrl: publicCaptureUrl, date: dossierReviewedAt, label: 'Consulta del 27/09/2026',
  },
  {
    id: 'ign', title: 'Geometría y alturas del edificio', publisher: 'IGN · BD TOPO', kind: 'public-record',
    description: 'Registro BATIMENT0000000316727839. La ficha declara modificación el 25/03/2019 y precisión de 3 m en planta y 2,5 m en altura. Consultarla en 2026 no equivale a medir de nuevo.',
    url: 'https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=BDTOPO_V3%3Abatiment&OUTPUTFORMAT=application%2Fjson&COUNT=200&BBOX=48.0004%2C-4.1083%2C48.0024%2C-4.1053%2Curn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A4326',
    localUrl: publicCaptureUrl, date: dossierReviewedAt, label: 'Consulta 27/09/2026 · ficha modificada en 2019',
  },
  {
    id: 'bdnb', title: 'Características del grupo', publisher: 'Base de Données Nationale des Bâtiments', kind: 'public-record',
    description: 'Grupo obtenido por dirección: antigüedad, huella, materiales y viviendas. Los campos de DPE representativo se excluyeron del extracto; no se atribuye un diagnóstico al T3.',
    url: 'https://api.bdnb.io/v1/bdnb/donnees/batiment_groupe_complet/adresse?cle_interop_adr=eq.29232_2090_00001_ter&limit=5',
    localUrl: publicCaptureUrl, date: dossierReviewedAt, label: 'Consulta del 27/09/2026',
  },
  {
    id: 'plan', title: 'Plano proporcional y superficies', publisher: 'Captura aportada al proyecto', kind: 'reference',
    description: 'La captura cita DIO AGENDA, diagnóstico 06/07/2026, dossier M-2026-07-002: superficies p. 62 y disposición p. 65. Esas páginas originales todavía no se recibieron. Las formas y longitudes del dibujo son estimadas.',
    localUrl: '/dossier/apartment-plan.png', date: '2026-09-26', label: 'Captura disponible · original pendiente',
  },
  {
    id: 'visual', title: 'Registro del estado visible', publisher: 'Fotografías y videos aportados', kind: 'reference',
    description: 'Índice de 11 fotografías y 4 videos revisados el 26/09/2026. Documenta elementos y relaciones visibles; las métricas, el estado oculto y las causas de daños no se deducen de las imágenes.',
    localUrl: '/dossier/reference-evidence.md', date: '2026-09-26', label: 'Revisión visual del 26/09/2026',
  },
  {
    id: 'model', title: 'Supuestos de la reconstrucción', publisher: 'Modelo del proyecto', kind: 'model',
    description: 'Geometría de t3.ts y registro de apartment-placement.ts. Planta, cota, dimensiones lineales y orientación siguen siendo aproximaciones, aunque sus cálculos sean reproducibles.',
    date: dossierReviewedAt, label: 'Modelo revisado · valores estimados',
  },
  {
    id: 'ademe', title: 'Identificación del DPE', publisher: 'ADEME · Service Public', kind: 'official-guide',
    description: 'Ruta oficial para verificar un diagnóstico por su número. Aquí no se ha identificado ni recibido el DPE individual del departamento.',
    url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/R67366', date: dossierReviewedAt, label: 'Fuente para completar el expediente',
  },
  {
    id: 'georisques', title: 'Riesgos y estado de riesgos', publisher: 'Géorisques', kind: 'official-guide',
    description: 'Ruta de consulta para los riesgos y el documento entregado en la compra. Su enlace no constituye un informe específico ni una conclusión sobre esta parcela.',
    url: 'https://www.georisques.gouv.fr/information-des-acquereurs-et-locataires', date: dossierReviewedAt, label: 'Investigación específica pendiente',
  },
  {
    id: 'quimper', title: 'Urbanismo y patrimonio', publisher: 'Ville de Quimper', kind: 'official-guide',
    description: 'Portal municipal de PLU y Site Patrimonial Remarquable. Falta cotejar la parcela con los planos y reglamentos vigentes.',
    url: 'https://www.quimper.bzh/1211-plan-local-d-urbanisme.htm', date: dossierReviewedAt, label: 'Investigación específica pendiente',
  },
  {
    id: 'copropriete', title: 'Documentos de la copropriété', publisher: 'Service Public', kind: 'official-guide',
    description: 'Guía de los documentos de venta en copropriété. El acto, EDD, reglamento, tantièmes y documentación de obras de este inmueble siguen pendientes de incorporación.',
    url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F2604', date: dossierReviewedAt, label: 'Documentación del inmueble pendiente',
  },
]

const number = (value: number | null | undefined, digits = 0) => value == null ? 'Sin dato' : value.toLocaleString('es-ES', {
  minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: true,
})
const target = SITE_BUILDINGS.find(building => building.isTarget)!

type FactInput = Omit<DossierFact, 'sourceIds' | 'review'> & { review?: DossierReview }
function fact(input: FactInput): DossierFact {
  return {
    ...input,
    review: input.review ?? (input.status === 'pending' ? 'pending' : 'checked'),
    sourceIds: [...new Set(input.evidence.map(item => item.sourceId))],
  }
}

/** Areas are shared with the existing scene; a matching polygon is not independent evidence. */
export const dossierRoomAreas: DossierFact[] = t3Apartment.rooms.map(room => fact({
  id: `room-area-${room.id}`, roomId: room.id, section: 'apartment', label: room.name,
  value: number(room.reportedArea, 2), numericValue: room.reportedArea, unit: 'm²', scope: 'Estancia',
  status: 'reported', review: 'original-pending', evidence: [{ sourceId: 'plan', locator: `Tabla «Les surfaces» · ${room.name}; cita a p. 62 del diagnóstico aún no recibido` }],
  note: 'Superficie transcrita de la captura. Pendiente de cotejar con el documento original; no resulta de medir el modelo 3D.',
}))

export const dossierFacts: DossierFact[] = [
  fact({ id: 'official-address', section: 'identity', label: 'Dirección normalizada', value: BUILDING_SITE.officialAddress, scope: 'Dirección', status: 'official', evidence: [{ sourceId: 'ban', locator: 'properties.label / properties.id' }], note: 'La referencia inicial «1 ter Rue…» es una variante. El registro consultado utiliza impasse.' }),
  fact({ id: 'ban-address-id', section: 'identity', label: 'Identificador de dirección', value: '29232_2090_00001_ter', scope: 'Dirección', status: 'official', evidence: [{ sourceId: 'ban', locator: 'properties.id' }, { sourceId: 'rnb', locator: 'addresses[street_rep=TER].id' }], note: 'Clave de dirección compartida por las consultas BAN y RNB. Es distinta de los identificadores de edificio y parcela.' }),
  fact({ id: 'address-point', section: 'identity', label: 'Punto de dirección BAN', value: '48,001415 · −4,106796', unit: '°', scope: 'Dirección', status: 'official', evidence: [{ sourceId: 'ban', locator: 'geometry.coordinates: longitude, latitude' }], note: 'Latitud y longitud WGS84, en ese orden aquí. El punto de acceso es distinto del origen interior RNB utilizado por la escena; no asigna una parcela por sí solo.' }),
  fact({ id: 'rnb-id', section: 'identity', label: 'Edificio RNB', value: BUILDING_SITE.rnbId, scope: 'Edificio', status: 'official', evidence: [{ sourceId: 'rnb', locator: 'rnb_id / addresses / ext_ids' }], note: 'La ficha relaciona 1, 1 bis y 1 ter con un mismo edificio; no identifica el lote del departamento.' }),
  fact({ id: 'ign-id', section: 'identity', label: 'Edificio IGN', value: BUILDING_SITE.targetId, scope: 'Edificio', status: 'official', evidence: [{ sourceId: 'ign', locator: 'properties.cleabs' }, { sourceId: 'rnb', locator: 'ext_ids[source=bdtopo]' }], note: 'Correspondencia explícita entre los registros IGN y RNB.' }),
  fact({ id: 'parcel-id', section: 'identity', label: 'Parcela catastral', value: SITE_PARCEL.label, scope: 'Parcela', status: 'official', evidence: [{ sourceId: 'cadastre', locator: 'properties.idu / section / numero' }], note: `Identificador completo ${SITE_PARCEL.id}. Parcela y lote de copropriété son entidades diferentes.` }),
  fact({ id: 'parcel-area', section: 'identity', label: 'Superficie de la parcela', value: number(SITE_PARCEL.area), numericValue: SITE_PARCEL.area, unit: 'm²', scope: 'Parcela', status: 'official', evidence: [{ sourceId: 'cadastre', locator: 'properties.contenance' }], note: 'Contenance catastral de la parcela completa. No es la huella construida ni la superficie del T3.' }),
  fact({ id: 'bdnb-group', section: 'identity', label: 'Grupo BDNB', value: 'bdnb-bg-W5NJ-PFRZ-ME3E', scope: 'Grupo BDNB', status: 'official', evidence: [{ sourceId: 'bdnb', locator: 'batiment_groupe_id / l_parcelle_id' }], note: 'Grupo devuelto por la consulta de dirección; no equivale automáticamente a una copropiedad jurídica.' }),
  fact({ id: 'construction-year', section: 'building', label: 'Construcción reportada', value: '1956', numericValue: 1956, scope: 'Grupo BDNB', status: 'official', evidence: [{ sourceId: 'bdnb', locator: 'annee_construction' }], note: 'Año en BDNB. El campo IGN date_d_apparition también indica 1956, pero conserva otro significado.' }),
  fact({ id: 'dwelling-count', section: 'building', label: 'Viviendas del grupo', value: '30', numericValue: 30, scope: 'Grupo BDNB', status: 'official', evidence: [{ sourceId: 'bdnb', locator: 'nb_log' }, { sourceId: 'ign', locator: 'properties.nombre_de_logements' }], note: 'Ambas fuentes registran 30 viviendas. No confirma cantidad o numeración de lotes jurídicos.' }),
  fact({ id: 'building-footprint', section: 'building', label: 'Huella reportada', value: '475', numericValue: 475, unit: 'm²', scope: 'Grupo BDNB', status: 'official', evidence: [{ sourceId: 'bdnb', locator: 'surface_emprise_sol' }], note: 'Emprise au sol del grupo. El polígono IGN proyectado da aproximadamente 476 m² mediante otro método; no se suman ni se promedian.' }),
  fact({ id: 'building-height', section: 'building', label: 'Altura IGN', value: number(target.height, 1), numericValue: target.height, unit: 'm', scope: 'Edificio', status: 'official', evidence: [{ sourceId: 'ign', locator: 'properties.hauteur' }], note: 'Altura fuente interpretada como contorno/alero en la investigación. No acredita una altura de cumbrera medida en sitio.' }),
  fact({ id: 'building-mean-height', section: 'building', label: 'Altura media BDNB', value: '16', numericValue: 16, unit: 'm', scope: 'Grupo BDNB', status: 'official', evidence: [{ sourceId: 'bdnb', locator: 'hauteur_mean' }], note: 'Otra magnitud de fuente. No reemplaza automáticamente los 15,5 m de IGN.' }),
  fact({ id: 'ground-altitudes', section: 'building', label: 'Cotas de suelo mín. / máx.', value: '8,8 / 8,8', unit: 'm', scope: 'Edificio', status: 'official', evidence: [{ sourceId: 'ign', locator: 'properties.altitude_minimale_sol / altitude_maximale_sol' }], note: 'Altitudes de la fuente IGN. No son alturas de planta ni levantamientos del interior; el terreno del modelo permanece plano.' }),
  fact({ id: 'roof-altitudes', section: 'building', label: 'Cotas de techo mín. / máx.', value: '24,3 / 25,1', unit: 'm', scope: 'Edificio', status: 'official', evidence: [{ sourceId: 'ign', locator: 'properties.altitude_minimale_toit / altitude_maximale_toit' }], note: 'Cotas altimétricas de techo. No determinan por sí solas la pendiente ni la forma de la cubierta.' }),
  fact({ id: 'roof-range', section: 'building', label: 'Rango vertical del techo', value: number(target.roofHeight, 1), numericValue: target.roofHeight, unit: 'm', scope: 'Edificio', status: 'derived', evidence: [{ sourceId: 'ign', locator: 'altitude_maximale_toit − altitude_minimale_toit = 25,1 − 24,3' }], note: 'Diferencia calculada entre las cotas. Usarla como subida de la cubierta visual es una hipótesis del modelo.' }),
  fact({ id: 'building-storeys', section: 'building', label: 'Plantas: campo de fuente', value: number(target.floors), numericValue: target.floors ?? undefined, scope: 'Edificio', status: 'official', evidence: [{ sourceId: 'ign', locator: 'properties.nombre_d_etages' }], note: 'Se conserva el valor literal 5; su convención no confirma en qué planta está el T3.' }),
  fact({ id: 'source-accuracy', section: 'building', label: 'Precisión declarada', value: `${number(target.planarAccuracy)} m / ${number(target.verticalAccuracy, 1)} m`, scope: 'Edificio', status: 'official', evidence: [{ sourceId: 'ign', locator: 'properties.precision_planimetrique / precision_altimetrique' }], note: 'Planta / altura, respectivamente. Métodos: BDParcellaire recalée e Interpolation bâti BDTopo; los decimales del render no mejoran esta precisión.' }),
  fact({ id: 'wall-material', section: 'building', label: 'Material de muros', value: 'BETON - PIERRE', scope: 'Grupo BDNB', status: 'official', evidence: [{ sourceId: 'bdnb', locator: 'mat_mur_txt' }], note: 'Clasificación del grupo. No documenta las capas, los espesores ni el aislamiento de cada pared del departamento.' }),
  fact({ id: 'roof-material', section: 'building', label: 'Material de cubierta', value: 'ZINC ALUMINIUM', scope: 'Grupo BDNB', status: 'official', evidence: [{ sourceId: 'bdnb', locator: 'mat_toit_txt' }], note: 'Clasificación de cubierta del grupo; su forma y pendiente en el 3D siguen siendo una reconstrucción.' }),
  fact({ id: 'ign-record-updated', section: 'building', label: 'Modificación de la ficha IGN', value: '25/03/2019', scope: 'Edificio', status: 'official', evidence: [{ sourceId: 'ign', locator: 'properties.date_modification = 2019-03-25T06:31:23.773Z' }], note: 'Fecha declarada en el registro, distinta de la consulta del 27/09/2026. Esta consulta no implica una medición nueva del edificio.' }),
  fact({ id: 'apartment-carrez', section: 'apartment', label: 'Superficie Carrez reportada', value: number(t3Apartment.metadata.reportedCarrezArea, 2), numericValue: t3Apartment.metadata.reportedCarrezArea, unit: 'm²', scope: 'Departamento', status: 'reported', review: 'original-pending', evidence: [{ sourceId: 'plan', locator: '«Surface privative Carrez» y «Total Carrez»; referencia a diagnóstico p. 62 aún no recibido' }], note: 'La cifra consta en la captura. El certificado original todavía no fue cotejado.' }),
  ...dossierRoomAreas,
  fact({ id: 'apartment-area-sum', section: 'apartment', label: 'Suma de los ocho ambientes', value: number(t3Apartment.rooms.reduce((sum, room) => sum + room.reportedArea, 0), 2), numericValue: t3Apartment.rooms.reduce((sum, room) => sum + room.reportedArea, 0), unit: 'm²', scope: 'Departamento', status: 'derived', evidence: [{ sourceId: 'plan', locator: 'Suma de las ocho superficies de «Les surfaces»' }], note: 'Comprobación aritmética de las áreas transcritas. No es una segunda medición ni certifica Carrez.' }),
  fact({ id: 'balcony-area', section: 'apartment', label: 'Balcón', value: number(t3Apartment.balcony?.reportedArea, 2), numericValue: t3Apartment.balcony?.reportedArea, unit: 'm²', scope: 'Balcón', status: 'reported', review: 'original-pending', evidence: [{ sourceId: 'plan', locator: '«En complément» · Balcon' }], note: 'Fuera de Carrez según la captura. Sus proporciones y el detalle de la baranda todavía son estimados.' }),
  fact({ id: 'basement-area', section: 'apartment', label: 'Cave en subsuelo', value: number(t3Apartment.metadata.reportedBasementArea, 2), numericValue: t3Apartment.metadata.reportedBasementArea, unit: 'm²', scope: 'Cave', status: 'reported', review: 'original-pending', evidence: [{ sourceId: 'plan', locator: '«En complément» · Cave au sous-sol' }], note: 'Fuera de Carrez según la captura. Faltan el lote, la posición y el plano; no se ha reconstruido en 3D.' }),
  fact({ id: 'floor-plan', section: 'apartment', label: 'Planta indicada en la captura', value: '4e étage', scope: 'Departamento', status: 'reported', review: 'disputed', evidence: [{ sourceId: 'plan', locator: 'Encabezado: «1 ter, rue Jean-Baptiste Colbert · 4e étage · Géométrie estimée»' }], note: 'La captura indica cuarta planta. Se conserva esta lectura aunque difiera de la interpretación visual usada por el modelo.' }),
  fact({ id: 'floor-model', section: 'apartment', label: 'Planta usada en el modelo', value: `${APARTMENT_PLACEMENT.floorIndex}.er piso estimado`, scope: 'Departamento', status: 'estimated', review: 'disputed', evidence: [{ sourceId: 'model', locator: 'APARTMENT_PLACEMENT.floorIndex; interpretación de la imagen marcada del edificio' }], note: `La cota de ${number(APARTMENT_PLACEMENT.floorElevation, 2)} m resulta de 3 × (15,5 / 5). No resuelve la discrepancia con «4e étage».` }),
  fact({ id: 'living-orientation', section: 'apartment', label: 'Living y cocina hacia el patio', value: `Suroeste · ${number(APARTMENT_PLACEMENT.livingFacadeAzimuth, 2)}°`, scope: 'Departamento', status: 'estimated', evidence: [{ sourceId: 'model', locator: 'APARTMENT_PLACEMENT.livingFacadeAzimuth' }], note: 'Orientación inferida al encajar el plano en la fachada marcada. Las habitaciones quedan al noreste; falta un plano orientado o medición.' }),
  fact({ id: 'ceiling-height', section: 'apartment', label: 'Altura interior del modelo', value: number(APARTMENT_PLACEMENT.wallHeight, 2), numericValue: APARTMENT_PLACEMENT.wallHeight, unit: 'm', scope: 'Departamento', status: 'estimated', evidence: [{ sourceId: 'model', locator: 't3Apartment.walls[].height / APARTMENT_PLACEMENT.wallHeight' }], note: 'Hipótesis para reconstruir el interior. No es una altura medida ni documentada por el diagnóstico.' }),
  fact({ id: 'apartment-dpe', section: 'energy', label: 'DPE del departamento', value: 'Pendiente de identificar', scope: 'Departamento', status: 'pending', evidence: [{ sourceId: 'ademe', locator: 'Número y documento individual aún no aportados' }, { sourceId: 'bdnb', locator: 'El grupo no establece la correspondencia con este departamento' }], note: 'Ninguna clase energética ni etiqueta GES se atribuye al T3 a partir de otros diagnósticos del edificio.' }),
  fact({ id: 'actual-energy-use', section: 'energy', label: 'Consumo real', value: 'Sin facturas incorporadas', scope: 'Departamento', status: 'pending', evidence: [{ sourceId: 'ademe', locator: 'El diagnóstico convencional no sustituye facturas o exportaciones de consumo' }], note: 'Faltan períodos, energía, lecturas y kWh. Se registrarán por separado del consumo convencional del DPE y sin anualizar períodos incompletos.' }),
  fact({ id: 'energy-cost', section: 'energy', label: 'Gasto energético', value: 'Sin datos incorporados', scope: 'Departamento', status: 'pending', evidence: [{ sourceId: 'ademe', locator: 'Estimación del DPE y facturación real: documentos todavía pendientes' }], note: 'La futura estimación en euros/año del diagnóstico conservará los años de referencia de precios. Las facturas tendrán su propio período y desglose.' }),
  fact({ id: 'legal-lots', section: 'context', label: 'Lotes y copropriété', value: 'Documentación pendiente', scope: 'Departamento', status: 'pending', evidence: [{ sourceId: 'copropriete', locator: 'Acto, EDD y reglamento del inmueble aún no incorporados' }], note: 'Faltan designación jurídica, anexos y tantièmes. Las 30 viviendas de BDNB no permiten reconstruir esos lotes.' }),
  fact({ id: 'risks', section: 'context', label: 'Riesgos de la parcela', value: 'Consulta específica pendiente', scope: 'Parcela', status: 'pending', evidence: [{ sourceId: 'georisques', locator: 'Ruta general; falta informe específico de parcela' }], note: 'No se ha emitido una conclusión de riesgo ni incorporado el estado de riesgos de la compra.' }),
  fact({ id: 'planning', section: 'context', label: 'Urbanismo y patrimonio', value: 'Zonificación por cotejar', scope: 'Parcela', status: 'pending', evidence: [{ sourceId: 'quimper', locator: 'PLU / SPR: planos y reglamento, cotejo de parcela pendiente' }], note: 'El portal municipal es una fuente disponible. Todavía no confirma la zona ni la inclusión de esta parcela en un ámbito protegido.' }),
]

export const dossierQuestions: DossierQuestion[] = [
  { id: 'floor-discrepancy', title: '¿Cuarta planta o tercer piso?', description: 'La captura dice «4e étage» y la reconstrucción usa tercer piso estimado. Ambas afirmaciones se conservan; no hay una planta confirmada.', needed: 'Designación del lote en el acto y plano de planta o referencia inequívoca de acceso.', sourceIds: ['plan', 'model', 'copropriete'] },
  { id: 'original-area', title: 'Cotejar los 49,18 m² con el original', description: 'Las ocho superficies coinciden aritméticamente con el total de la captura. Falta comprobarlas en el documento citado.', needed: 'Dossier DIO AGENDA M-2026-07-002: métrage Carrez p. 62 y disposición p. 65, con su numeración impresa.', sourceIds: ['plan'] },
  { id: 'geometry', title: 'Calibrar dimensiones y orientación', description: 'Muros, aberturas y altura interior son aproximados. El plano queda alrededor de 1–2 m corto respecto de la profundidad cartográfica del edificio.', needed: 'Plano acotado y orientado, espesores, altura entre forjados y medidas de ventanas/balcón.', sourceIds: ['model', 'ign', 'visual'] },
  { id: 'individual-dpe', title: 'Vincular el DPE correcto', description: 'Un diagnóstico del grupo no identifica por sí solo al T3. Tampoco equivale al consumo real de quien lo habita.', needed: 'DPE completo con número ADEME, dirección, planta/lote, fecha y superficies de referencia; facturas por separado.', sourceIds: ['ademe', 'bdnb'] },
  { id: 'parcel-context', title: 'Completar el contexto de la parcela', description: 'Ya está identificada AL 0538; quedan por consultar sus riesgos y reglas urbanísticas concretas.', needed: 'Estado de riesgos de la compra y cotejo con planos/reglamentos de PLU y SPR, conservando fecha y versión.', sourceIds: ['cadastre', 'georisques', 'quimper'] },
]

export const dossierObservations: DossierObservation[] = [
  { id: 'hall-condition', room: 'Entrada', title: 'Suelo y servicios visibles', description: 'Se observa una zona de suelo levantado o roto junto al acceso a baño/WC, tuberías vistas y un tablero sobre el paso al living. La causa y extensión exacta del daño no están establecidas.', evidence: 'P01, P04, P05 · V04 7–16 s', status: 'observed', sourceIds: ['visual'] },
  { id: 'living-condition', room: 'Living', title: 'Parquet, placard y salida al balcón', description: 'Parquet con desgaste, panel de placard roto, radiador junto a cocina y puerta vidriada de dos hojas hacia el balcón. Se documenta su presencia; no las medidas exactas.', evidence: 'P07, P09 · V04 30–44 s', status: 'observed', sourceIds: ['visual'] },
  { id: 'bedroom-openings', room: 'Habitaciones', title: 'Ventanas y radiadores', description: 'Dos ventanas de dos hojas, cajas de persiana, protección exterior y radiadores bajo ventana. La asociación de cada visita a la habitación de 11,81 o 9,32 m² sigue apoyada en el plano.', evidence: 'P09, P10 · V01 · V04 18–28 s', status: 'observed', sourceIds: ['visual', 'plan'] },
  { id: 'kitchen-layout', room: 'Cocina', title: 'Equipamiento en U', description: 'Mesadas y muebles bajos en U, pileta, heladera, horno/placa, campana, microondas y carcasa aparente de caldera. No se confirma un lavavajillas ni prestaciones de los equipos.', evidence: 'P06, P08, P11 · V02, V03', status: 'observed', sourceIds: ['visual'] },
  { id: 'bathroom-fixtures', room: 'Baño', title: 'Lavabo, lavarropas y ducha', description: 'Un lavabo circular sobre mesada, lavarropas frontal, espejo, ducha y partición de bloques de vidrio. El segundo lavabo aparente es un reflejo; el encaje métrico sigue pendiente.', evidence: 'P02 · V04 0–7 s', status: 'observed', sourceIds: ['visual'] },
  { id: 'wc-door', room: 'WC', title: 'Recinto separado', description: 'Inodoro con cisterna, ventilación alta y puerta que abre hacia la entrada. La dimensión real del recinto y el ancho de paso deben medirse.', evidence: 'P03 · V04', status: 'observed', sourceIds: ['visual'] },
]
