# Expediente del inmueble: investigación y propuesta de vista

Investigación del **27 de septiembre de 2026**, sobre el repositorio en `5153560`.
Estado: investigación de referencia para la POC local de Documentación. Los valores públicos de este informe se consultaron el 27/09/2026; no son respuestas en tiempo real.

**Alcance vigente de la POC:** el usuario autorizó mantener los datos existentes y los extractos públicos en este repositorio para desarrollar la tercera vista. La [guía editorial vigente](property-dossier.md) define esta primera versión. La [arquitectura híbrida](../architecture/property-dossier-architecture.md) queda como evolución diferida; DB, S3 y multiusuario no forman parte de la POC. No se recibieron aún los documentos oficiales de compra.

## Decisión recomendada

Agregar **Documentación** junto a **Departamento** y **Edificio y sol**. Su función
será responder qué sabemos del inmueble, de dónde sale cada dato, a qué parte del
inmueble corresponde y qué falta comprobar. Debe funcionar sin una escena 3D.

La pieza central es un registro de **afirmaciones con evidencia**, del que salgan
la ficha del inmueble, las tablas de superficies, los diagnósticos y los pendientes.
Una carpeta de PDFs por sí sola no permite comparar ni comprobar los datos; una
ficha sin citas pierde el respaldo de esos PDFs. Necesitamos ambas capas.

En esta POC, el contenido disponible permanece versionado en el repositorio: este
informe conserva la investigación, la guía editorial fija sus criterios y el
catálogo de la aplicación presenta los datos con su evidencia. Los documentos
futuros de compra todavía no se incorporan. Su recepción, acceso y eventual
almacenamiento privado se resolverán antes de añadirlos.

## Trabajo realizado y evidencia conservada

- Revisión de las dos vistas, los datos canónicos, los esquemas y la documentación
  existente. Inspección visual de [la captura del plano](../reference/t3-plan.png).
- Consulta actual de **cinco servicios públicos**: BAN mediante IGN, RNB, API
  Carto/catastro, IGN BD TOPO y BDNB. Los identificadores y valores principales
  coinciden con la investigación anterior.
- Conservación de [un extracto de las cinco respuestas](../../apps/web/public/dossier/official-sources-2026-09-27.json)
  con URL, fecha y hora UTC, campos originales, criterio de selección y hash de la
  respuesta recibida. Es una selección documentada, **no un archivo íntegro de
  todas las respuestas HTTP**. Los campos de DPE representativo no se incorporan.
- Revisión de las fuentes primarias para energía, catastro, riesgos, urbanismo y
  documentos de copropriété. Las fuentes generales se enlazan en las secciones
  correspondientes; consultar un portal no significa haber obtenido un informe
  específico de este inmueble.

No se recibió ni verificó en esta iteración el diagnóstico original, el título,
los planos acotados ni el DPE individual. No se modificaron las escenas.

## Inventario inicial: ubicación, parcela y edificio

Los valores de esta tabla se reconsultaron el **27/09/2026**. En el JSON de evidencia,
`sources[].id` identifica cada servicio; `data` conserva sus campos originales.
"Consta en la fuente" describe el registro consultado, no una medición nueva ni
una certificación del departamento.

| Dato | Valor | Ámbito y campo de evidencia | Lectura correcta |
| --- | --- | --- | --- |
| Dirección normalizada | 1ter impasse Jean-Baptiste Colbert, 29000 Quimper | BAN `properties.label`; RNB `addresses` | Conservar «1 ter Rue…» como variante de la referencia original. |
| Identificador de dirección | `29232_2090_00001_ter` | BAN `properties.id` | Es distinto del identificador del edificio. |
| Edificio RNB | `4V8DBS2K1JDV` | RNB `rnb_id`, `status=constructed` | RNB vincula explícitamente 1, 1 bis y 1 ter al mismo edificio. |
| Edificio IGN | `BATIMENT0000000316727839` | RNB `ext_ids`; IGN `properties.cleabs` | Correspondencia entre registros, sin identificar el lote interior. |
| Parcela | `29232000AL0538` — AL 0538 | Catastro `properties.idu`; BDNB `l_parcelle_id` | No equivale a un lote de copropriété. |
| Contenance de parcela | **1.192 m²** | Catastro `properties.contenance` | Superficie de parcela, no del edificio ni del T3. |
| Grupo BDNB | `bdnb-bg-W5NJ-PFRZ-ME3E` | BDNB `batiment_groupe_id` | Mantenerlo separado de la entidad edificio y de la copropiedad jurídica. |
| Año de construcción reportado | **1956** | BDNB `annee_construction` | IGN también registra `date_d_apparition=1956-01-01Z`; conservar los dos conceptos. |
| Viviendas | **30** | BDNB `nb_log`; IGN `nombre_de_logements` | No confirma cantidad ni numeración de lotes jurídicos. |
| Huella reportada | **475 m²** | BDNB `surface_emprise_sol` | Huella del grupo; no sumar plantas para inventar una superficie total. |
| Altura de fuente IGN | **15,5 m** | IGN `hauteur` | Interpretada en la investigación previa como altura al contorno/alero; no una cumbrera levantada en sitio. |
| Altura media BDNB | **16 m** | BDNB `hauteur_mean` | Otra magnitud/representación; no reemplazar automáticamente la altura IGN. |
| Suelo mínimo / máximo | **8,8 / 8,8 m** | IGN `altitude_minimale_sol`, `altitude_maximale_sol` | Cotas altimétricas de fuente, no altura de piso. |
| Techo mínimo / máximo | **24,3 / 25,1 m** | IGN `altitude_minimale_toit`, `altitude_maximale_toit` | La resta da 0,8 m; no establece la forma del techo. |
| Plantas: valor literal | **5** | IGN `nombre_d_etages` | No usar este campo para confirmar la planta del T3. |
| Precisión declarada | **3 m en planta; 2,5 m en altura** | IGN `precision_planimetrique`, `precision_altimetrique` | Conservar los campos como precisión declarada, sin inventar intervalos estadísticos. |
| Materiales clasificados | `BETON - PIERRE`; `ZINC ALUMINIUM` | BDNB `mat_mur_txt`, `mat_toit_txt` | Descripciones a escala del registro; no prueba de capas ni aislamiento de cada pared. |

La ficha IGN declara modificación el **25/03/2019**. La consulta de septiembre de
2026 no actualiza esa fecha ni reduce la incertidumbre. RNB conserva además un ID
BDNB de versión `2023_01` distinto del grupo que devuelve hoy la consulta por
dirección: guardar los identificadores externos con su versión y procedencia.

El catastro tiene finalidad fiscal; el plano no garantiza derechos de propiedad.
La identificación jurídica del departamento requiere la documentación de los lotes.
[Alcance explicado por DGFiP](https://cadastre.gouv.fr/scpc/html/QuestionsReponses.html).

La interpretación previa de alturas y transformación geográfica está en
[building-research.md](building-research.md). La antigua URL del PDF de
especificaciones IGN redirigió al catálogo durante esta revisión: antes de
reinterpretar `nombre_d_etages` o derivar cotas nuevas, archivar la especificación
aplicable al producto y su versión. Esta investigación conserva los valores
literales sin resolver esa convención.

## Inventario inicial: departamento y estado visible

Estas superficies coinciden entre la captura y `apps/web/src/data/t3.ts`, pero
todavía son **transcripciones de una fuente secundaria**. El pie de la captura
menciona DIO AGENDA, diagnóstico del **06/07/2026**, dossier **M-2026-07-002**,
superficies p. **62** y disposición p. **65**. Son pistas para localizar el original,
no páginas que hayamos leído.

| Espacio | Superficie reportada |
| --- | ---: |
| Salon / séjour | 16,39 m² |
| Cuisine | 4,26 m² |
| Chambre 1 | 11,81 m² |
| Chambre 2 | 9,32 m² |
| Salle d’eau | 3,21 m² |
| Entrée | 2,26 m² |
| WC | 0,87 m² |
| Placard | 1,06 m² |
| **Total etiquetado Carrez** | **49,18 m²** |
| Balcón, fuera de Carrez según captura | 1,26 m² |
| Cave, fuera de Carrez según captura | 8,54 m² |

La suma de los ocho ambientes es 49,18 m². Es una comprobación aritmética, no un
cotejo con el certificado Carrez. Los polígonos se construyeron para conservar
esas áreas, por lo que no son una segunda medición independiente.

Las longitudes de muros, altura interior **2,70 m**, espesores **0,18 / 0,10 m**,
dimensiones de aberturas y mobiliario son estimaciones. Se pueden mostrar en un
apartado «Referencias del modelo», fuera de las medidas documentadas del inmueble.

[El índice visual](../reference/evidence.md) describe 11 fotos y 4 videos: presencia
de ventanas, radiadores, cocina, equipo aparente de caldera, revestimientos y daños
visibles. Eso sirve para documentar el estado observado con fecha y fotograma.
No demuestra dimensiones, prestaciones térmicas, conformidad de instalaciones ni
la causa de un daño. El índice es la evidencia revisada aquí; no se volvió a
inspeccionar todo el material audiovisual original.

## Discrepancias que la nueva vista debe hacer visibles

| ID | Cuestión | Evidencia actual | Resolución necesaria |
| --- | --- | --- | --- |
| D01 | **Planta 4 frente a planta 3** | La captura dice `4e étage`; `apartment-placement.ts` usa `floorIndex=3`, rotulado tercer piso estimado. | Acto/designación de lote, plano de planta y referencias de acceso. Mantener ambas afirmaciones; no mover el 3D por intuición. |
| D02 | Norte del plano y orientación del edificio | `apartment-geometry.md` conserva ejes este/sur; `t3.ts` aclara que son ejes históricos del dibujo. La transformación actual estima living SO, 210,79°, y habitaciones NE, 30,79°. | Plano orientado o medición; al implementar, corregir el texto histórico para que no se copie como orientación confirmada. |
| D03 | Cota del departamento | Los **9,30 m** salen de `3 × (15,5 / 5)`, no de un levantamiento. El rótulo web «5 niveles» interpreta el campo IGN. | Confirmar planta, convención de plantas y alturas entre forjados. |
| D04 | Encaje entre fachadas | El plano estimado queda aproximadamente **1–2 m** corto frente a la profundidad cartográfica del edificio. | Cotas interiores, fachadas y espesores; el vacío usado para renderizar no prueba la existencia de otro espacio. |
| D05 | Evidencia de ventanas | `locationConfidence: observed` convive con posiciones y dimensiones estimadas. | Separar existencia observada, posición inferida y dimensiones medidas/estimadas. |

No todo valor diferente es una discrepancia: **475 m²** de huella BDNB y
**≈476 m²** calculados sobre el polígono IGN tienen origen y método distintos;
**15,5 m** y **16 m** tampoco deben promediarse. La cubierta visual a **16,3 m**
es una construcción del modelo, no una tercera altura oficial.

## Fuentes para ampliar el expediente

| Fuente primaria | Qué incorporar | Qué falta para atribuirlo al inmueble |
| --- | --- | --- |
| [RNB](https://rnb.beta.gouv.fr/faq), [IGN/BAN](https://data.geopf.fr/geocodage/search?q=1%20ter%20impasse%20Jean-Baptiste%20Colbert%20Quimper&limit=5) y [catastro](https://cadastre.data.gouv.fr/) | Identificadores, dirección, relaciones y cartografía, con fecha y precisión. | La relación con el lote privativo se obtiene de los documentos de compra. |
| [BDNB: documentación](https://bdnb.io/documentation/accueil_documentation/) | Antigüedad, materiales clasificados, geometría y contexto del grupo. | Conservar procedencia por campo; distinguir fuente, agregación y predicción. |
| [ADEME: verificación de DPE](https://www.service-public.gouv.fr/particuliers/vosdroits/R67366) | DPE individual, número, fecha, método, etiquetas energía/GES, superficies de referencia y equipos. | Número del diagnóstico y correspondencia con dirección, planta y lote del departamento. |
| [Géorisques / ERRIAL](https://www.georisques.gouv.fr/information-des-acquereurs-et-locataires) | Contexto de riesgos y estado de riesgos entregado en la compra. | Consulta específica de parcela, fecha y comprobaciones del documento. No se ha emitido aquí una conclusión de riesgo. |
| [Géoportail de l’urbanisme](https://www.geoportail-urbanisme.gouv.fr/comment-ca-marche/) y [PLU/SPR de Quimper](https://www.quimper.bzh/1211-plan-local-d-urbanisme.htm) | Zona, reglamento, servidumbres y protección patrimonial aplicables, con planos y versión. | Superponer y cotejar la parcela. No se ha confirmado aquí la zona ni inclusión en SPR. |
| [Documentación de venta en copropriété](https://www.service-public.gouv.fr/particuliers/vosdroits/F2604) | Designación de lotes, EDD, reglamento, tantièmes, mantenimiento y obras documentadas. | Los originales del usuario o del syndic; no inferirlos de las 30 viviendas del grupo. |
| [Enedis](https://www.enedis.fr/jaccede-mes-donnees-de-consommation-et-de-production-delectricite) y facturas del proveedor | Consumo real por período y energía. | Documentos/exportaciones aportados por el usuario; gas y calefacción colectiva requieren sus propias fuentes. |

La documentación general de estos servicios define rutas de investigación. Los
únicos registros específicos reconsultados y archivados en esta entrega son los
cinco del extracto local. Los riesgos y el urbanismo quedan como líneas abiertas.

## Energía: tres conjuntos de datos distintos

1. **Diagnóstico convencional:** número ADEME, ámbito individual/colectivo,
   fecha, versión del método, superficie de referencia, kWh de energía primaria
   y final según el documento, kgCO₂e, etiquetas y usos incluidos.
2. **Estimación económica del diagnóstico:** intervalo de euros/año y años de
   referencia de los precios. No confundirlo con una factura o un gasto actual.
3. **Consumo real:** inicio/fin del período, energía, kWh, lectura real/estimada,
   fuente, cobertura y costes separados en energía, abono e impuestos cuando
   el documento permita distinguirlos.

Un DPE representativo BDNB puede corresponder a otro apartamento y no reflejar
todos los alojamientos. La pantalla inicial debe decir **«DPE del departamento:
pendiente de identificar»**, aunque existan diagnósticos en el grupo.
[Metodología publicada por BDNB](https://www.bdnb.io/documentation/methode_traitement_dpe/).

El método DPE y sus factores pueden cambiar sin una obra física. Guardar el
diagnóstico original y las eventuales attestations como versiones vinculadas;
comparar métodos y períodos antes de concluir una mejora del inmueble.
[Explicación ministerial del cálculo](https://www.ecologie.gouv.fr/actualites/evolutions-du-calcul-du-dpe-reponses-vos-questions).

No aplicar automáticamente Carrez como denominador de consumo por m²: conservar
la superficie definida por cada documento. No interpretar un dato ausente como
cero, anualizar un período incompleto sin explicarlo ni sumar facturas solapadas.
La visualización solar tampoco produce una etiqueta DPE ni un ahorro energético.

## Cómo se vería la tercera vista

Cabecera **«Expediente del inmueble»**, dirección y fecha de última revisión.
Debajo, una síntesis de hechos con evidencia y las cuestiones por resolver. Evitar
un porcentaje de certeza: usar recuentos comprobables de documentos, datos
revisados y pendientes.

| Sección | Contenido inicial | Incorporación posterior |
| --- | --- | --- |
| Identidad y ubicación | Dirección, mapa/huella 2D, parcela, IDs RNB/IGN/BDNB y relaciones. | Lote(s), planta, anexos, copropriété. |
| Superficies y dimensiones | Tabla actual, total reportado y estado de respaldo. | Certificado, plano acotado, dimensiones por estancia. |
| Edificio y estado | Altura, antigüedad y materiales de las bases; observaciones visuales diferenciadas. | Construcción, instalaciones, intervenciones y mantenimiento documentados. |
| Energía y diagnósticos | Estado pendiente y explicación breve de cobertura. | DPE, diagnósticos técnicos y consumos con períodos. |
| Riesgos y urbanismo | Fuentes previstas y estado de investigación. | Informes y reglas aplicables a la parcela. |
| Documentos y fuentes | Fuentes públicas consultadas, captura e índices disponibles. | Originales privados y localizadores de página. |
| Pendientes y diferencias | D01–D05, evidencia faltante y dato que resolvería cada cuestión. | Historial de resoluciones y afirmaciones sustituidas. |

Cada dato debe permitir **«Ver evidencia»**: valor original, entidad a la que
corresponde, emisor, fecha del documento, fecha de consulta, campo/página y límite
concreto. Etiquetas iniciales: «Registro público consultado», «Transcrito; original
pendiente», «Observado», «Calculado», «Estimado» y «Sin dato». Un estado de revisión
aparte indica si está cotejado, en discrepancia o reemplazado.

Ejemplo de tarjeta inicial:

> **49,18 m² — superficie Carrez reportada**
> Departamento · transcripción de captura · original pendiente
> Ver evidencia → captura disponible; referencia a DIO AGENDA, p. 62 aún no recibida.

La pantalla debe tener búsqueda textual y filtros por sección, entidad y estado,
ser legible en móvil, funcionar con teclado y tener una impresión útil. Los
detalles técnicos de extracción quedan en la ficha de evidencia; las fichas
principales usan nombres y unidades comprensibles.

## Modelo de datos mínimo

Separar cuatro piezas; no ampliar el contrato de escena para guardar contratos:

| Pieza | Campos necesarios |
| --- | --- |
| Entidad | ID propio estable, tipo y nombre; IDs externos con namespace/versión. Tipos: parcela, edificio, grupo BDNB, copropriété, departamento, lote, anexo y estancia. |
| Fuente | ID, emisor, título, tipo, URL o referencia privada, fecha de emisión, versión, recuperación, licencia y acceso. Hash del archivo al recibir un original. |
| Afirmación | Entidad, propiedad definida, valor original/normalizado, unidad, criterio de medición, período, evidencia, revisión, precisión y notas. |
| Cita / relación | Fuente y página/campo/fotograma; o vínculo entre entidades con su propia evidencia. Cálculos con fórmula e IDs de afirmaciones de entrada. |

Un departamento puede corresponder a varios lotes. Un grupo BDNB no prueba la
existencia de una copropiedad jurídica equivalente. No hay que imponer relaciones
uno a uno entre estas entidades.

Para páginas de PDF, conservar **índice real y numeración impresa**; para APIs,
JSON Pointer o campo exacto; para videos, ID y segundo. Separar fecha de emisión,
período representado, fecha de recepción/consulta y fecha de revisión.

Tipo de evidencia y revisión son dimensiones distintas: un registro oficial
puede estar desactualizado; una extracción OCR puede no estar revisada; un dato
revisado puede seguir siendo una estimación. La correspondencia con la entidad
correcta se comprueba además de la transcripción.

Solo comparar valores de la misma entidad, propiedad, definición y período.
Preservar alternativas y seleccionar una preferida con un motivo explícito; no
promediar valores incompatibles ni reemplazar la historia. Un valor documentado
nuevo no debe alterar silenciosamente la geometría del 3D.

## Integración técnica propuesta

La [guía editorial de la POC](property-dossier.md) define el alcance técnico
actual: catálogo local en la aplicación y evidencia estática en el repositorio.
La [propuesta híbrida diferida](../architecture/property-dossier-architecture.md) conserva una
posible evolución con Markdown, SQL y S3; no describe servicios implementados ni
requisitos previos para esta primera vista.

## Incorporación de los documentos de compra

Orden recomendado por la incertidumbre que cada documento despeja:

1. **Designación del bien en el acto y EDD/plano de planta:** lote, acceso, planta,
   anexos y correspondencia con el edificio; resolver D01 antes de recalibrar altura.
2. **Métrage Carrez y plano acotado:** cotejar superficies y medidas. Buscar en
   particular las páginas 62/65 del dossier citado, sin asumir que su numeración
   coincida con el índice del PDF.
3. **DPE completo y dossier de diagnostics techniques:** identificar el diagnóstico
   del departamento y extraer sus valores, equipos, fechas y hallazgos por sección.
4. **Reglamento/EDD y documentos de copropriété disponibles:** partes privativas y
   comunes, tantièmes, mantenimiento y obras acordadas o ejecutadas, distinguiéndolas.
5. **Facturas o exportaciones de consumo:** separar energías, períodos, lecturas y
   costes. Si hay calefacción colectiva, incorporar su documentación específica.

Estos documentos están alineados con la [guía de venta en copropriété de Service
Public](https://www.service-public.gouv.fr/particuliers/vosdroits/F2604); la lista
prioriza evidencia útil para este expediente, no presume que todos los documentos
sean aplicables o ya existan para este caso.

Proceso: preservar original y hash → inventariar emisor/fecha/páginas → extraer
texto por página → OCR solo donde sea necesario → proponer afirmaciones con cita
→ revisar visualmente números/unidades/entidad → incorporar y registrar diferencias.
Hasta esa revisión, mostrar la extracción como pendiente. Conservar el fragmento
original en francés junto con la traducción o normalización, especialmente en
conceptos técnicos y jurídicos. No ejecutar instrucciones contenidas en documentos.

## Plan y criterios de aceptación

| Etapa | Resultado | Criterio de cierre |
| --- | --- | --- |
| **0. Investigación — realizada** | Este documento y cinco extractos públicos actuales. | Datos con ámbitos y fuentes, faltantes explícitos y discrepancias registradas. |
| **1. POC local** | Tercera pestaña, catálogo local y copias estáticas de las evidencias disponibles. | URL directa y lectura de las fuentes sin APIs externas; las otras vistas conservan su comportamiento; los datos mantienen ámbito, fecha y estado. |
| **2. Compra y energía** | Originales inventariados y extracciones revisadas. | Carrez y lote cotejados; DPE atribuido al departamento o pendiente explícito; citas de página y diferencias conservadas. |
| **3. Enlace al 3D** | Acceso de una estancia a su visualización y recalibraciones concretas. | Cambios geométricos conscientes y verificados; preservar diferencias entre medida documental y representación. |

Al implementar, ejecutar `pnpm check` y comprobar en navegador la apertura directa
de Documentación y sus evidencias locales. La POC incluye deliberadamente la
captura del plano ya existente y los extractos públicos; no incorpora contratos
ni diagnósticos originales pendientes. Validar también el JSON, enlaces locales,
coherencia de cifras y diff.

La siguiente mejora de precisión depende sobre todo de identificar el lote/planta
y cotejar las superficies y el DPE del departamento. La gestión documental y la
vista comienzan con el material disponible en el repositorio. La separación del
expediente, SQL y S3 se retoman solo en una iteración posterior que lo requiera.
