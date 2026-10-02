# Casa 2071 — initial import and work plan

## Project identity and scope

- [x] Set the working property reference to Av. Estanislao Zeballos 2071, Castelar, partido de Morón, Buenos Aires, Argentina.
- [x] Record the second access/front at Gobernador Dardo Rocha 877.
- [x] Record cadastral lots 8 and 10 as the user's property references. Confirm their legal boundaries against the official parcel plan before treating the model as a survey.
- [x] Select `casa-2071-revision.blend` as the only usable Blender import: its `casa-planta.png` plan corresponds to the print supplied by the user. Do not import the other two Blender variants.
- [x] Import the selected Blender file and the locally available tentative-plan image without modifying the source files.
- [x] Create a separate editable Blender review scene at `assets/blender/casa-2071-tentative-trace-review.blend` with the source raster packed and 11 approximate room-outline curves/labels in source-image pixels; it contains no metric walls or inferred heights and does not modify the prior `.blend`.
- [x] Inspect the Blender source in background/read-only mode: metric scene, ten labeled room meshes, cut-wall layers, site/pool/access and independent cadastral collection. This inventory is not a survey validation; the traced contour is explicitly marked “no mensura”.
- [ ] Import the remaining original image attachments into this folder when their source files are available locally; the chat previews are not all exposed as filesystem files in this workspace.

## Model transition

### Contexto solicitado el 2026-10-02

- [x] Reemplazar el botón deshabilitado Mostrar edificio de Casa por Mostrar/Ocultar vecinos, sin ocultar la vivienda/sitio; habilitar también el check en Edificio y sol. Mantener T3 intacto.
- [x] Mostrar únicamente el contorno plano comprobado de la estación del frente (OSM 472802802 v5), con atribución y aviso de encaje histórico aproximado, sin alturas estimadas/sombras. Fuente registrada en `assets/reference/casa-frontage-context-source.json`; tests de fuente/control y navegador pasan.
- [ ] Obtener huellas de las casas linderas y revisar su amarre al sitio: no figuran en el bbox OSM consultado. La estación no sustituye este entregable.
- [x] A pedido posterior del usuario, trazar contexto aproximado desde Carto y aérea de Maps: parcelas 7, 9, 11 y 12, techos observados separados de las parcelas, y calles Zeballos/Dardo Rocha/La Cautiva. Registrar controles/errores y crear overlay 2D; mantener el original intacto y sin sombras/alturas vecinas.
- [x] Incluir el vecino pegado de esquina del lote 9 confirmado por el usuario. La mínima traslación calculada preserva su polígono y queda dentro del margen propagado del trazado; encaje provisional pendiente de revisión, no mensura.
- [ ] Aprobar correspondencias, norte, límites construidos reales y alturas: los contornos planos aproximados no completan el gate de vecinos métricos/sombras.
- [x] Corrección posterior de calles/veredas: sustituir bandas catastrales completas por calzadas y vereda exterior continua con esquinas compartidas; separar calzada opuesta y separador de Zeballos. Registrar secciones visuales en píxeles, nunca medidas normativas.
- [x] Revisar sobre aérea ampliada ocho cuerpos de techo (11:3, 12:2, 7:2, 9:1), preservar sus formas y posiciones relativas y registrar ajuste rígido limitado de grupos 7/9. La cubierta posterior incierta del 9 permanece fuera del preview; no forzar su atribución por contención.

### Hito de preview web

- [x] Exportar las colecciones de la escena Blender a `apps/web/public/models/casa-2071/casa-2071.glb` sin modificar el `.blend` fuente; dejar fuera del modelo la colección 07, que contiene el gráfico catastral separado.
- [x] Mostrar Casa 2071 por defecto en los tres workspaces existentes (Departamento, Edificio y sol, Documentación), sin pestaña Casa ni modo antes/después. El demo T3 se conserva con `?project=t3`.
- [x] Mostrar la escena GLB aportada como referencia previa en las vistas 3D, con presets de planta/axonométrica y dos direcciones de cámara; reunir planos, referencia parcelaria, procedencia y pendientes dentro de Documentación. Las fotos se conservan para investigación interna, no se publican.
- [x] Aclarar que Street View son referencias visuales cercanas, no fachadas medidas ni identificación confirmada del frente objetivo.
- [ ] Conciliar niveles/ambientes con los planos, asignar IDs estables y verificar ubicación/orientación. El viewer actual carga directamente el GLB Blender; todavía no proviene del snapshot arquitectónico canónico.
- [ ] Trazar la planta tentativa en 2D y calibrarla con cotas y puntos de control compartidos revisados; no convertir el raster a geometría métrica sin ese gate.
- [ ] Review the unscaled trace overlay in `assets/blender/casa-2071-tentative-trace-review.png` against the original; correct room contours/openings with owner feedback, then provide at least two reviewed image-to-plan control correspondences and one reliable measured length before metric modeling.
- [x] Archive the clean replacement plan supplied in docs on 2026-10-02, byte-for-byte, as `assets/reference/casa-2071-planta-limpia.png`; update the source register/hash and rebuild the unscaled 2D trace from it. The red-marked JPEG is archived only, not active design authority. Kitchen and dining are one connected room with no dividing wall; Living remains a distinct room. The clean image shows the house, not the patio or the second frontage with garage.
- [x] Produce a separate 2D review overlay from the clean image and a nonmetric Blender **visual-review sketch** at `assets/blender/casa-2071-maqueta-revision.blend`. Its browser GLB is visible under the existing Casa/Edificio tabs with camera and layer controls unchanged. Owner authorized this order (2D then 3D) for feedback; this does not approve trace vertices or metric calibration. The left one-storey tiled two-slope roof is provisional. Following owner correction, the preview retains the original site contour, pool, paving, entrance and old garage perimeter objects without inventing lot outlines; only new-house geometry is generated from the clean-plan pixel trace. The new house placement over the preserved original site is an unreviewed display transform. No old house partition is imported. Verified parcel registration and neighbors remain absent. Do not call it the completed remodel or use it as BIM/IFC/DXF/DWG/OBJ.
- [ ] Validar fachada refaccionada y planta alta con elevaciones/cotas finales; las fotos actuales documentan únicamente la fachada existente.

Los rótulos del UI y la lista de ambientes conservan nombres de referencia para orientarse, pero no constituyen una planilla verificada, mensura ni plano de obra. El contorno Blender indica «no mensura».

### Estado del prototipo web y alcance corregido

- El GLB actualmente conectado combina únicamente el sitio/pileta/garaje del
	Blender anterior con una casa nueva trazada de la planta limpia. Su amarre es
	visual no calibrado: no describirlo como la refacción terminada.
- La planta tentativa es la autoridad del diseño remodelado cuando discrepa con
	el Blender anterior. Mantener intacto el archivo Blender como fuente histórica
	y reconciliar por separado lo que se conserva del sitio.
- El trazado raster se mantiene en píxeles hasta calibración; las superficies
	impresas son restricciones de diseño, no cotas suficientes para inventar una
	transformación métrica. Los nombres no visibles permanecen sin nombre.
- La geometría vecina requerida es la de viviendas linderas de la misma manzana.
	El minimercado y la estación de servicio OSM no son vecinos; excluirlos del
	render. Las fotografías aportadas son de investigación, no contenido público.
- Mantener los tres workspaces existentes y el estudio solar; no quitar controles
	para encubrir que la orientación solar del modelo aún requiere calibración.

- [ ] Replace T3/Quimper property data in the existing workspaces with Casa 2071 data while preserving reusable viewer, geometry, localization, and solar tooling; do not add a separate Casa tab.
- [x] Use `assets/reference/casa-2071-planta-limpia.png` as authority for the requested final remodel wherever it conflicts with the old Blender plan; preserve the Blender source and superseded red-marked JPEG unchanged as prior-state evidence.
- [ ] Transcribe and constrain the final plan with its room names/areas/annotations; do not rename unlabeled rooms or infer unprinted dimensions. Keep pixel geometry separate until reviewed calibration.
- [ ] Preserve the complete property boundary, patio, pool, garden, accesses, and all unaffected house portions. Do not create parcel subdivisions from lot labels.
- [ ] Rebuild the rooms/walls to match the tentative-plan design after 2D trace review and calibration; retain uncertainty/provenance for each unresolved element.
- [ ] Represent the left-hand portion as one storey.
- [ ] Review the swimming pool from an overhead Street View/reference image and adjust its position to match the visible site. Keep the current pool shape/location provisional until checked.
- [ ] Do not include the demolished small room beside the pool on the Dardo Rocha side in the finished-house model.
- [ ] Design the renovated street-facing facade from the target plans and supplied photographs. Use Street View to understand frontage and site context, not to recreate the old house.
- [ ] Trace same-block adjoining residential footprints only from verified site/aerial/cadastral evidence. Do not substitute storefronts, fuel stations or across-street features. Street View may inform research but cannot establish unverified parcel adjacency by itself.

## Entregable: visualizar la casa refaccionada terminada

- [ ] Modelar y mostrar directamente la **casa terminada refaccionada** en los tabs existentes; no crear vistas o fases separadas de casa vieja, demolición, obra o anteproyecto.
- [ ] Partir del diseño completo que muestra la planta tentativa; conservar Blender sin modificar como referencia histórica, y modelar el sitio retenido solo tras reconciliar fuentes. Validar escala/orientación antes de detalles.
- [ ] Mostrar la construcción izquierda de un solo piso y representar por separado los cuerpos de distinta altura.
- [ ] Preparar una planta cenital sin techo, una axonométrica/corte 3D y vistas peatonales desde Zeballos y Dardo Rocha; añadir una vista aérea del conjunto.
- [ ] Permitir alternar techo/cubierta, planta por nivel, corte interior, pileta, límites de propiedad y contexto de vecinos; mostrar la casa terminada y conservar patio/sitio que no se refacciona.
- [ ] Etiquetar ambientes y elementos con los IDs estables de la tabla siguiente. Añadir esos IDs sobre una copia de la planta para encontrarlos visualmente.
- [ ] Añadir cotas de referencia y etiquetas para los dos accesos. Diferenciar medidas confirmadas de aproximadas y no presentar la vista como plano de obra.
- [ ] Usar el mismo modelo geométrico como fuente para Blender y la vista web, evitando que ambas representaciones diverjan.
- [ ] Validar las vistas y proporciones de la casa terminada con el usuario antes de avanzar a materiales, muebles y terminaciones; guardar capturas de revisión.

### Referencias para pedir cambios

IDs provisionales asignados en orden visual de arriba hacia abajo y de izquierda a derecha sobre la planta adjunta. Las áreas se copian solo como orientación de esa imagen; no son medidas verificadas ni definen la geometría final. Los IDs no cambian aunque renombremos un ambiente.

- [ ] Usar las áreas impresas en la imagen tentativa como restricciones de diseño del ambiente correspondiente. No son longitudes ni calibración métrica por sí solas; no sobreescribirlas con el Blender anterior.

| ID | Nombre/alias visible en la planta | Área de referencia (provisional) |
| --- | --- | ---: |
| `INT-01` | Sala de estar, comedor, cocina | 38,35 m² |
| `INT-02` | Baño 2 | 3,65 m² |
| `INT-03` | Hab. Serv. / habitación de servicio | 2,30 m² |
| `INT-04` | Distribuidor | 7,27 m² |
| `INT-05` | Ambiente sin nombre (sector superior derecho) | 15,31 m² |
| `INT-06` | Baño 1 | 4,55 m² |
| `INT-07` | Ambiente sin nombre (sector inferior derecho) | 14,54 m² |
| `INT-08` | Living | 28,09 m² |
| `INT-09` | Habitación 3 | 15,50 m² |
| `INT-10` | Cocina complementaria | 8,11 m² |
| `INT-11` | Hall | 4,32 m² |
| `EXT-01` | Pileta | — |
| `EXT-02` | Jardín / espacio verde | — |
| `EXT-03` | Garaje y salida a Dardo Rocha | — |
| `ACC-01` | Acceso por Av. Estanislao Zeballos 2071 | — |
| `ACC-02` | Acceso por Gobernador Dardo Rocha 877 | — |
| `LOT-08` | Lote 8 | — |
| `LOT-10` | Lote 10 | — |

Para pedir un cambio alcanza con el ID o con el nombre/alias, por ejemplo: «`INT-09`, mover la ventana» o «Habitación 3, mover la ventana». Si un ambiente se divide, se unen dos ambientes o aparece uno nuevo, registrar la relación y asignar IDs nuevos; no reciclar un ID anterior.

## References and validation

Las capacidades y gates de 2D/BIM/IFC/DXF/DWG/glTF/OBJ, prompt-to-project,
validación normativa y solar son obligatorios según
[`constitutions.md`](../../constitutions.md) y
[`docs/workflows/casa-bim.md`](../../docs/workflows/casa-bim.md).

- [x] Configure local VS Code MCP entries for Blender and Google Street View; the Street View launcher reads `GOOGLE_API_KEY` from the ignored `.env`, exposes metadata and on-demand image tools, and persists request counts under ignored `artifacts/`.
- [ ] Verify both MCP servers from VS Code. Blender MCP additionally requires Blender open with its matching MCP add-on enabled; Google Street View requires a valid key and enabled Street View Static API.
- [ ] Use the official ARBA Carto GBA screenshot as a parcel/lot reference. Preserve the source URL: https://carto.arba.gov.ar/cartoArba/ . Treat it as the authoritative source cited by the user, but retain a note that screenshots alone do not replace the original parcel record or a survey.
- [ ] Keep source provenance, measured values, visual estimates, and design decisions distinct in model metadata and documentation.
- [ ] Validate any later web export/render against the editable Blender scene and source references; do not describe visual agreement as survey accuracy.

## Imported files

- `casa-2071-revision.blend` — selected as the sole source scene because its plan matches the supplied print; imported unchanged.
- `casa-2071-planta-limpia.png` — latest owner-supplied target house plan, renamed from the original file in docs without modifying its bytes; authoritative for remodel rooms and interior walls.
- `planos tentativa.jpeg` — older, red-marked plan from Downloads; retained unchanged for history and excluded from the active design/UI.
- `casa-2071-vista-previa.png`, `casa-perspectiva.png`, `casa-planta.png`, `catastro-lotes-8-10.png` — supporting preview/render references copied from the source project.

The other two `.blend` variants from `/home/ariel/src/house` were intentionally not copied because the user identified them as incorrect. Their originals were left untouched.

The remaining chat attachments visible during this import, but unavailable as local source files, are:

- ARBA Carto GBA block/parcel views and the close-up dimension view for lots 8 and 10.
- The aerial image with parcel overlays.
- The current floor-plan screenshot with the marked room outline.
- The older yellowed plan, section, elevation and title-block scans.
- Street View captures of the Zeballos frontage and Dardo Rocha side, including the red frontage marks.
- The supplied exterior/property photographs.

Add the original files here when available; do not substitute re-created or recompressed screenshots for originals.
