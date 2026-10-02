# 002 — Refactor de librerías y modelo arquitectónico

## Objetivo

Evolucionar `t3-designer` desde el modelo especializado del departamento T3 hacia una base reutilizable para proyectos arquitectónicos, sin reemplazar la arquitectura que ya funciona ni convertir Blender o Three.js en fuente de verdad.

La dirección del flujo es:

```text
Fuentes y decisiones del usuario
             ↓
Modelo arquitectónico canónico + historial de cambios
             ↓
Geometría pura y validación
             ↓
Snapshot versionado y reproducible
         ↙                 ↘
Web / Three.js          Blender / renders
             ↓
      exportadores futuros (SVG, DXF, IFC)
```

**Regla:** el agente podrá proponer operaciones declarativas sobre el modelo; el motor construye la geometría y el validador determina si puede aceptarse. No se generan meshes finales desde el LLM, no se edita la arquitectura directamente en Blender y no se muta el snapshot como fuente.

Este directorio registra una hoja de ruta adaptable del documento `AI_ARCHITECTURAL_T3_IMPLEMENTATION.md`. No implica que las fases estén implementadas.

**Regla obligatoria vigente:** [constitutions.md](../../constitutions.md) y
[el workflow BIM de Casa](../../docs/workflows/casa-bim.md) gobiernan cualquier
cambio arquitectónico. Una corrección explícita del usuario prevalece sobre este
plan y se refleja aquí junto con una prueba de regresión.

**Incremento en curso:** `packages/architecture-model` define un contrato
versionado para una única casa terminada, con estados por elemento y procedencia.
Casa tiene un preview GLB heredado en los tres workspaces existentes; no es el
diseño final remodelado. La planta tentativa es la autoridad del diseño solicitado
cuando contradice las paredes/ambientes del Blender anterior. Ese Blender se
conserva intacto como evidencia del modelo previo, no como sustituto de la planta
tentativa. El snapshot T3/Quimper debe permanecer sin cambios. La planta debe
transcribirse, trazarse y revisarse en 2D antes de producir geometría BIM métrica.

## Alcance correcto de Casa 2071: el diseño tentativo manda

La planta `assets/reference/casa-2071-planta-limpia.png` es la referencia de diseño
solicitada. Sus habitaciones, muros, rótulos, áreas y anotaciones prevalecen
cuando difieren del Blender anterior; por eso el GLB anterior no puede publicarse
como si ya reflejara la refacción. El Blender anterior permanece sin sobrescribir
como evidencia del estado/modelo previo y puede informar únicamente los elementos
de sitio que se reconcilien y no contradigan la intención final. Esta corrección
reemplaza la afirmación previa incorrecta de que la planta tentativa solo era un
alcance parcial y que el Blender anterior era autoridad geométrica final.

Transcribir literalmente rótulos/áreas y dejar nombres o cotas no visibles como
desconocidos. Los valores impresos no definen por sí solos una transformación
píxel→métrica. No crear muros 3D desde trazas sin calibración revisada. El orden
obligatorio es fuente → traza/revisión 2D → calibración → BIM paramétrico →
validadores → intercambios → render y sol. El modelo interno seguirá siendo una
única casa terminada; no habrá dos modelos ni modo antes/después. Conservar el
sitio completo cuando esté conciliado; no dividirlo por rótulos catastrales.

Los vecinos requeridos son las viviendas linderas de la misma manzana. El
minimercado y la estación/cubierta de servicio encontrados en OSM son contexto
comercial distinto, no son los vecinos y se excluyen del render de Casa. Hasta
obtener huellas verificadas de las casas linderas, la geometría de vecinos queda
pendiente y no se dibuja un sustituto. Las fotos aportadas para investigación no
se publican en el sitio.

## Estado del prototipo web y límites que no deben ocultarse

El prototipo anterior debe retirarse de la navegación final:

- El Blender/GLB conectado corresponde al modelo previo y no implementa las paredes de la planta tentativa; mostrarlo como resultado final es incorrecto.
- La vista «Volumetría» eleva cada polígono sobre una misma base plana. Las alturas de extrusión son valores ilustrativos, no niveles, cotas de piso ni evidencia de que la vivienda tenga esos pisos.
- Todavía no hay entidad de nivel, losa, cubierta o relación vertical en los datos de Casa. Por eso no existen botones para mostrar todo, escoger una planta o hacer un corte por piso.
- Los contornos de minimercado/estación no representan las viviendas linderas y deben quedar fuera del modelo de vecinos.
- El MCP local permite pedir imágenes de Street View bajo demanda y registra los intentos en `artifacts/street-view-usage.sqlite3` (total y mes actual, separado por metadatos e imágenes). Evitar solicitudes repetidas o masivas; verificar el contador con `get_street_view_usage`. No se debe afirmar que los contornos vecinos salen de Street View hasta disponer de imágenes/referencias utilizables y trazar sus huellas con procedencia y confianza.

El espacio solar de T3/Quimper no se reutiliza con sus coordenadas para Castelar. La vista solar es objetivo central y no se quita: Casa debe usar fecha/hora/localidad propias y las sombras sobre el GLB esperan calibración de norte/emplazamiento. El Blender de Casa sigue preservado como modelo previo; la planta tentativa debe guiar la geometría final donde haya evidencia y quedar bloqueada —no reemplazada por el Blender— donde falte calibración.

## Estado actual comprobado

### Hito de integración visual (preview, no snapshot canónico)

- [x] Exportar la escena Blender aportada de Casa 2071 a GLB y mostrarla por defecto en los tres workspaces existentes; conservar T3/Quimper detrás de `?project=t3`.
- [x] Reunir planos, referencia catastral, accesos y limitaciones de las fuentes. Las fotos de investigación no se publican en la UI.
- [ ] Reemplazar el puente GLB por un builder de snapshot canónico Casa validado y compartido entre Web/Blender. El modelo actual es una vista visual directa del Blender aportado, no una geometría arquitectónica verificada ni una mensura.

- `packages/scene-schema` ya valida `Apartment` y el snapshot versionado `ProjectSnapshotSchema` (`schemaVersion: 1`). El snapshot actual requiere apartamento, sitio, edificios, parcela y solar.
- `packages/geometry` ya ofrece operaciones geométricas puras para polígonos, límites y segmentación de paredes.
- Los datos canónicos T3 y el cálculo solar siguen en `apps/web/src/data` y `apps/web/src/lib`.
- `scripts/lib/project-snapshot.ts` combina esos datos y los paquetes para crear el snapshot que consume `scripts/blender/assemble_project.py`.
- El prototipo web incorrecto usaba trazas de la zona tentativa en coordenadas de imagen y alturas ilustrativas; se retiraron sus archivos y su ruta de navegación. Esas trazas nunca representaron la casa completa ni pertenecen al schema/snapshot canónico.
- Están importados el Blender de Casa, renders/vistas del modelo, la referencia catastral y el plano tentativo. El plano tentativo es solo el alcance de intervención; no descartar las fuentes de la casa completa.
- Node declarado mínimo por el repo: 24. Los tests web, TypeScript, build y lint pasaron en la primera vista; mantener ese baseline al migrar.

## Principios y límites

1. Conservar el contrato y snapshots existentes mientras se introduce el nuevo modelo; cualquier cambio incompatible requiere versión y migración explícitas.
2. Usar metros, IDs estables y transformaciones locales/sitio explícitas. No inferir escala precisa de una imagen no calibrada.
3. Diferenciar observado, medido por usuario, inferido, estimado, generado y derivado. Toda inferencia debe poder referir a su evidencia o declarar que carece de ella. Una geometría crítica sin fuente/calibración bloquea exportación.
4. Datos autoritativos (puntos, paredes, polígonos) separados de valores derivados (áreas, longitudes, bounds).
5. El modelo arquitectónico y la geometría pura no dependen de React, Three.js, Blender, APIs externas ni del LLM.
6. Mantener a Blender y Three.js como adaptadores de render. Compartir geometría y snapshots; materiales/cámaras/iluminación pueden diferir por renderer.
7. El contexto oculto por cámara puede seguir proyectando sombras; ocultar vecinos y desactivar sus sombras son controles distintos.
8. Las librerías/adaptadores requeridos se fijan por tarea con versión y licencia: React-Konva/Konva para editor 2D, archit-app + Shapely en validación aislada, IfcOpenShell para IFC y ezdxf para DXF; Blender/Three.js para render/intercambio, y un convertidor DWG declarado y licenciado. No se agregan al frontend las librerías Python. Cada adaptador debe tener fixtures y round-trip test antes de declararse soportado.
9. No inventar paredes, cotas, niveles, orientación de norte, parcelas ni vecinos para que una imagen parezca completa.

## Plan de implementación

### Fase 0 — Congelar comportamiento de referencia

- [ ] Registrar versión Node/pnpm/Python, estado de git y comandos exactos del baseline.
- [ ] Ejecutar `pnpm check` con Node 24+; registrar cualquier fallo preexistente antes de mover módulos.
- [ ] Ejecutar `pnpm scene:verify` y conservar el snapshot rastreado como referencia binaria/reproducible.
- [ ] Ejecutar pruebas e2e existentes si el navegador de Playwright está disponible.
- [ ] Dejar Blender/MCP como validación opcional; nunca requerir GUI/MCP para `pnpm check`.

**Salida:** baseline reproducible de tests, snapshot y build antes del refactor.

### Fase 1 — Enderezar las fronteras de librerías existentes

- [x] Revisar `packages/scene-schema`, `packages/geometry`, `scripts/lib/project-snapshot.ts` y sus consumidores antes de mover código.
- [x] Cambiar imports de scripts/tests que apuntaban directamente a `packages/*/src` por entry points del workspace; no quedan accesos directos en TypeScript.
- [x] Mantener dependencias unidireccionales: `scene-schema` no depende de web; geometry depende de contratos puros; web/scripts consumen packages.
- [x] Probar entry points publicados de scene-schema, geometry y el nuevo snapshot versionado desde paquetes/consumidores existentes.
- [ ] Comprobar que `scene:verify` conserva exactamente la semántica del snapshot y no modifica archivos.

**Nota de ejecución:** el workspace declara Node ≥24 pero aquí solo está disponible Node 22.23.1. Con Node 22, `scene:verify` no modifica archivos pero detecta una diferencia solar de ~3×10⁻¹⁵; repetir la comparación con Node 24 antes de actualizar snapshots.

**No hacer en esta fase:** mover todos los datos T3 o rediseñar el schema.

### Fase 2 — Crear `packages/architecture-model` y editor 2D primero

- [x] Crear el paquete versionado con proyecto, unidades, niveles, habitaciones, paredes, huecos, emplazamiento, evidencia, procedencia y confianza.
- [x] Definir un edificio completo terminado, con elementos `retained`, `new` o `modified`; registrar alcance/procedencia sin crear otro edificio ni una vista antes/después.
- [x] Representar el alcance sobre una imagen en coordenadas de píxel y mantenerlo separado de geometría métrica.
- [x] Referenciar elementos existentes del sitio que se conservan y validar que esas referencias existan.
- [x] Añadir entidades de losas/cubiertas, supuestos y metadatos básicos del modelo. Los fixtures son sintéticos y no se presentan como datos métricos reales de Casa.
- [x] Representar pisos explícitamente: `id`, `index`, `name`, `elevation` y altura piso-techo opcional. Un MVP puede tener un nivel, pero ninguna geometría debe inferir el nivel por su altura de extrusión.
- [x] Conservar habitaciones como polígonos y áreas reportadas/objetivo opcionales; un área transcripta de una imagen no se convierte automáticamente en geometría medida.
- [x] Definir paredes con endpoints, espesor, altura, clase, `levelId` y procedencia; puertas/ventanas apuntan a paredes por ID.
- [x] Definir origen/confianza de forma explícita (`observed`, `inferred`, `estimated`, `user_defined`, `generated`, `derived`) y enlazar `evidenceIds`.
- [ ] Completar `Site` separado del edificio: el modelo ya admite el límite completo sin subdividir y features con procedencia; faltan georreferencia/ubicación y geometrías verificadas de calles, terreno y contexto.
- [x] Agregar fixture sintético y pruebas focalizadas de relaciones/IDs, referencias de evidencia y alcance de imagen; no usarlo como dato real de Casa.
- [ ] Hacer requerido el editor 2D (React-Konva/Konva) con snapping, cotas, selección/IDs estables y undo/redo. Revisar superposición contra planta tentativa antes de calibrar o extruir.
- [ ] **Solo después de revisión 2D y calibración:** conservar «Planta» y «Volumetría» como vistas del mismo diseño terminado, generadas desde geometría métrica validada. Al hacer clic, seleccionar el ambiente real por ID estable y resaltarlo en ambas vistas.

**Compatibilidad:** no convertir ni retirar `ApartmentSchema` en este paso.

### Fase 3 — Validación arquitectónica independiente

- [x] Crear `packages/architecture-validation`, consumiendo el modelo canónico y operaciones geométricas mínimas propias del validador; no requiere mutar el modelo.
- [x] Emitir findings estructurados con `severity`, `code`, `elementIds`, `message`, ruta y `fixHint` opcional.
- [x] Validar IDs, niveles, referencias, anillos poligonales simples, paredes y huecos dentro de su pared; detectar además aberturas superpuestas sobre una misma pared. Conectividad, solapes entre ambientes y límites del sitio se difieren hasta definir sus contratos.
- [x] Categorizar por separado errores de schema/geometría y advertencias de calidad arquitectónica/evidencia.
- [x] Mantener reglas normativas específicas fuera del core; no certificar cumplimiento ni mensura.
- [x] Añadir cobertura dirigida para alcance de imagen sin calibrar, niveles faltantes y huecos fuera de pared.

**Regla de aceptación:** la UI puede mostrar borradores inválidos con advertencias, pero exportadores y commits exigirán el nivel de validación que su contrato declare.

### Fase 4 — Adaptador geométrico y geometría compartida

- [x] Crear `packages/architecture-engine` para adaptar geometría determinista fuera del schema y de las reglas de validación.
- [x] Reutilizar `packages/geometry` para área, centroide, bounds, longitud/centro/rotación de paredes; siguen pendientes segmentación de huecos y otras operaciones cuando tengan consumidor.
- [x] Centralizar y probar ida/vuelta de planta local → sitio → Blender; placement real y datum vertical de Casa siguen pendientes de fuentes verificables.
- [x] Integrar archit-app 0.7.0 como adaptador de validación aislado, pinneado y probado; es obligatorio en el gate de validación de arquitectura, no en el frontend ni en el contrato canónico.
- [x] Implementar y probar el adaptador de calibración por puntos correspondientes imagen↔planta usando archit-app `CoordinateConverter`.
- [ ] Obtener referencias medidas y dos pares de puntos revisados para calibrar la imagen tentativa real, y trazar/revisar su alcance. archit-app no vectoriza JPEG/PNG: no convertir píxeles a metros sin esos datos y confirmación humana.
- [ ] Implementar solver/restricciones paramétricas y log de mutaciones tipadas con tests geométricos antes de aceptar generación prompt→proyecto.

### Fase 5 — Snapshot versionado y migración gradual

- [x] Separar versión del modelo arquitectónico (`ARCHITECTURE_MODEL_VERSION`) de las versiones de snapshot.
- [x] Definir snapshot arquitectónico v2 que contiene el modelo canónico sin campos T3/Quimper; mantener intacto `ProjectSnapshotSchema` v1.
- [x] Añadir lector versionado v1/v2 y prueba de regresión del snapshot T3 v1. Migración de persistidos y compatibilidad de render v2 quedan pendientes.
- [ ] Extraer `buildProjectSnapshot()` a una librería pura solo cuando sus imports de `apps/web` se hayan aislado; filesystem/CLI permanece en `scripts/export_scene.ts`.
- [ ] Hacer que Casa y T3 se serialicen por builders/adapters, sin declarar equivalencias falsas entre `Apartment` y `ArchitecturalProject`.
- [x] Añadir builder y CLI del snapshot arquitectónico v2, con prueba focalizada de determinismo/parseo/no mutación y modo `--check`. La instancia Casa queda pendiente hasta disponer del modelo fuente validado.
- [ ] Probar comparación reproducible de snapshots existentes bajo la versión Node declarada (24+); el entorno actual Node 22 produce un delta solar flotante mínimo en `scene:verify`.

### Fase 6 — Integración Three.js y Blender

- [ ] Hacer que el renderer web lea el snapshot validado del proyecto Casa, no una geometría paralela mantenida en el componente.
- [ ] Actualizar Blender como adapter del mismo snapshot y conservar `blender -b` como flujo automatizable.
- [ ] Validar geometría física compartida por IDs/dimensiones; admitir diferencias de materiales e iluminación del renderer.
- [ ] Añadir test que asegure que la revisión/modelo exportado para Web y Blender tenga las mismas plantas, paredes, niveles y colocación.
- [ ] No bloquear esta fase intentando igualar píxeles entre Three.js y Cycles.
- [ ] Para Casa, modelar un solo edificio terminado que conserve lo existente y marque internamente lo nuevo/modificado; el plano tentativo solo documenta alcance, no reemplaza al resto ni crea un modo antes/después.

### Fase 7 — UI de niveles, cortes y contexto Casa 2071

Esta fase resuelve controles de vista; depende de que el modelo incluya niveles/volúmenes/contexto con procedencia.

- [ ] Añadir selector «Todo / nivel» desde `Level[]`; no inventar primer piso si no hay plano/fuente que lo sustente.
- [ ] Añadir corte por nivel y modo techo/cubierta solo cuando exista la geometría de losa/cubierta correspondiente.
- [ ] Incorporar al snapshot Casa el límite completo de la propiedad y la geometría existente disponible de patio/pileta/jardín/accesos; conservar el terreno sin subdividir.
- [ ] Añadir volúmenes vecinos como contexto independiente (`contextBuildings`), apagable en cámara. Configurar aparte si siguen proyectando sombras al ocultarlos visualmente.
- [ ] Obtener/cargar fuentes de contexto permitidas (archivos del usuario, catastro/aérea, imágenes Street View con acceso habilitado); registrar origen y fecha. Solicitar imágenes puntualmente, evitar repeticiones y revisar el contador local de uso.
- [ ] Añadir vistas desde ambas calles y una planta cenital al existir orientación y emplazamiento contrastables.
- [ ] Mantener IDs `INT-*`, `EXT-*`, `ACC-*` y `LOT-*`; diferenciar en UI medido, estimado y pendiente.
- [ ] Pruebas e2e: alternar Todo/nivel/corte, ocultar vecinos, selección por ID y persistencia de la escena del modelo.

### Fase 8 — Operaciones, historial e importación (posterior)

- [ ] Definir `Mutation` declarativa con target IDs, parámetros, motivo y autor; agregar undo/redo solo con un modelo persistible.
- [ ] Guardar proyecto base + log de mutaciones; nunca mutar directamente un snapshot generado.
- [ ] Importar primero JSON del modelo; después evaluar imagen/PDF y DXF con confirmación humana, calibración explícita y registro de candidatos/confianza.
- [ ] Detectar unidades/escala como desconocidas si no existe cota fiable. Solicitar calibración en vez de asignar metros a píxeles arbitrariamente.
- [ ] El usuario revisa/acepta una mutación antes de incorporarla; validación y reparación automática tendrán límites de intentos.
- [ ] No ejecutar código libre generado por el LLM en shell, filesystem o Blender Python.

### Fase 9 — Formatos de intercambio obligatorios

- [ ] Añadir SVG/planta derivada del modelo y cotas calculadas, no duplicadas manualmente.
- [ ] Implementar adaptadores obligatorios IFC (IfcOpenShell), DXF (ezdxf), DWG (conversor/SDK licenciado), glTF/GLB y OBJ desde el snapshot canónico.
- [ ] Añadir round-trip y fixtures de interoperabilidad para cada formato. Si un formato no puede preservar una propiedad, declarar/documentar la pérdida y bloquear su claim de soporte.
- [ ] Añadir gate con fixtures para la versión normativa local aplicable; si la autoridad/fuente no está confirmada, el cumplimiento queda bloqueado, nunca supuesto.

## Criterios de aceptación de `002`

- [ ] Los paquetes existentes tienen fronteras de importación públicas y documentadas.
- [ ] El modelo arquitectónico representa al menos un nivel explícito, habitaciones, paredes, openings, fuentes y contexto opcional.
- [ ] Validación produce findings deterministas y pruebas para los casos principales.
- [ ] Snapshot versionado mantiene compatibilidad con la escena T3 actual y soporta una instancia provisional del modelo final de Casa.
- [ ] Web y Blender derivan la geometría arquitectónica de la misma fuente versionada.
- [ ] El selector de nivel/corte y el toggle de vecinos se habilitan solo con geometría fuente, y no mezclan el sitio de Quimper con Castelar.
- [ ] `pnpm check`, `pnpm scene:verify` y pruebas e2e aplicables pasan; Blender background se verifica cuando el binario esté disponible.
- [ ] Ninguna dimensión, planta, huella vecina u orientación inferida se presenta como medida confirmada.

## Referencias del repositorio

- Arquitectura actual: `docs/architecture/architecture.md`.
- Contratos actuales: `packages/scene-schema/src/apartment.ts`, `packages/scene-schema/src/project.ts`.
- Geometría pura: `packages/geometry/src/index.ts`.
- Builder y exportador: `scripts/lib/project-snapshot.ts`, `scripts/export_scene.ts`.
- Adaptador Blender: `scripts/blender/assemble_project.py`.
- El prototipo visual incorrecto de Casa fue retirado; reimplementar Planta/Volumetría desde geometría fuente queda diferido a la tarea marcada al final de la fase 2.
- Referencias importadas y pendientes de sitio: `specs/001-initial-imports/TASKS.md`.
- Propuesta de arquitectura de referencia: `/home/ariel/Downloads/AI_ARCHITECTURAL_T3_IMPLEMENTATION.md`.
- Nuevo contrato independiente: `packages/architecture-model/README.md`, `packages/architecture-model/src/index.ts`.
