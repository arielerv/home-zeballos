# Documentación del inmueble: POC local

Fecha editorial: **27/09/2026**. Esta es la referencia editorial de la primera
vista **Documentación**, junto a Departamento y Edificio y sol.

La decisión vigente para esta POC es conservar en el repositorio los datos ya
disponibles y los extractos públicos consultados. Se prioriza una vista útil con
evidencia accesible. **DB, S3, multiusuario, carga de documentos y extracción OCR
quedan diferidos**; no son requisitos para recorrer el expediente actual.
La [arquitectura híbrida](../architecture/property-dossier-architecture.md) se conserva como una
posible evolución, sin servicios implementados por esta entrega.

## Qué respalda cada parte

| Archivo | Responsabilidad actual |
| --- | --- |
| Este documento | Criterios editoriales, alcance, mantenimiento y límites de la POC. |
| [Investigación del 27/09/2026](property-dossier-research.md) | Inventario detallado, contraste de fuentes, diferencias y rutas para ampliar el expediente. |
| [Extracto de cinco consultas públicas](../../apps/web/public/dossier/official-sources-2026-09-27.json) | Valores conservados de BAN, RNB, catastro, IGN y BDNB, con URL, instante de consulta y selección realizada. |
| [Captura del plano](../reference/t3-plan.png) | Áreas transcritas, denominaciones y referencia al diagnóstico todavía no recibido. |
| [Índice de evidencia visual](../reference/evidence.md) | Observaciones de las fotos y videos revisados; no mediciones ni certificados. |
| [Catálogo de la vista](../../apps/web/src/data/dossier.ts) | Presentación estructurada de hechos, fuentes, observaciones y pendientes; vincula cada dato con su evidencia. |
| [Modelo del departamento](../../apps/web/src/data/t3.ts) y [registro en el edificio](../../apps/web/src/data/apartment-placement.ts) | Datos del modelo existente, que conservan sus supuestos y estimaciones. |

La guía editorial no es un segundo catálogo numérico ni se importa automáticamente
desde Markdown. En esta POC el catálogo se mantiene en código: una corrección debe
actualizar conjuntamente la fuente correspondiente, el texto afectado y su
presentación. Una publicación estática requiere reconstruir la aplicación. El
importador Markdown y las actualizaciones de contenido independientes del build
pertenecen a la evolución futura.

## Reglas de lectura

- Cada dato identifica su ámbito: parcela, edificio, grupo BDNB, departamento,
  anexo o estancia. Un grupo estadístico no identifica por sí solo un lote legal.
- Distinguir **registro público consultado**, **transcripción**, **observación**,
  **cálculo**, **estimación** y **pendiente**. La presencia en una fuente oficial
  no elimina su antigüedad, precisión limitada o ámbito de aplicación.
- La fecha de consulta no sustituye a la fecha del dato. El extracto se capturó el
  27/09/2026; la ficha IGN declara modificación de 2019.
- Las cantidades llevan unidades y definición. Identificadores, fechas y
  afirmaciones categóricas no necesitan una unidad artificial.
- Mostrar alternativas y diferencias; no promediar valores con distinta
  definición ni convertir información ausente en cero.
- Cada referencia permite localizar el dato en un campo API, la captura o el
  índice visual. Una página mencionada por otra fuente no se presenta como leída.
- Una corrección documental no modifica automáticamente la geometría del modelo.

Los **49,18 m²** siguen siendo una superficie Carrez reportada en una captura.
El diagnóstico DIO AGENDA citado en su pie no se recibió: sus páginas 62 y 65
son referencias pendientes, no originales verificados. Las longitudes y alturas
del interior continúan estimadas. La captura menciona **4e étage**, mientras el
modelo usa una tercera planta estimada: ambas afirmaciones quedan visibles hasta
identificar el lote y la planta con documentación suficiente.

El DPE del departamento, los consumos reales, los documentos de compra y las
conclusiones específicas de riesgos/urbanismo siguen pendientes. Un DPE asociado
al grupo BDNB no se atribuye al T3. La simulación solar no produce una etiqueta
energética ni un consumo estimado.

## Evidencia disponible en la aplicación

Los enlaces de evidencia se sirven con la aplicación:

| URL | Contenido |
| --- | --- |
| `/dossier/official-sources-2026-09-27.json` | Selección de registros públicos consultados el 27/09/2026. |
| `/dossier/apartment-plan.png` | Copia de la captura del plano ya presente en el proyecto. |
| `/dossier/reference-evidence.md` | Copia del índice visual, sin la ruta personal del archivo local de originales. |

Las fichas y estas copias se consultan sin llamar a APIs externas. Los enlaces
a servicios oficiales sí requieren conexión. No se promete funcionamiento sin
red desde una instalación que no haya descargado la aplicación: no hay service
worker ni modo offline instalable.

El JSON es un **extracto seleccionado**, no un archivo de las respuestas HTTP
íntegras. `response_sha256` identifica los bytes originales recibidos durante la
investigación, que no están incluidos; no es el hash del JSON publicado. Los campos
originales, fechas de recuperación y criterios de selección se conservan.

La imagen del plano es idéntica al archivo de referencia. El índice conserva la
revisión del 26/09/2026 y sus IDs de fotos/videos; la copia web no incluye los
originales audiovisuales. Las fuentes y materiales de terceros mantienen sus
licencias y atribuciones, según [la investigación del edificio](building-research.md#licencias-y-atribución).

## Mantenimiento y próxima incorporación

Para una nueva consulta pública, conservar un extracto fechado con URL, selección
y campos originales, revisar el ámbito y después actualizar el catálogo. No
presentar un cambio de fuente como una nueva medición sobre el terreno. Las copias
de evidencia de esta POC se mantienen explícitamente; no existe aún un generador
automático de los documentos estáticos.

Cuando lleguen los documentos de compra, inventariar originales, emisor, fecha y
páginas; identificar departamento y lote; contrastar Carrez, planta y DPE; y
registrar las afirmaciones con citas precisas. El acceso y almacenamiento de esos
documentos futuros se resolverá antes de incorporarlos: la autorización de esta
POC cubre el material disponible, no convierte en público un contrato futuro.

La validación debe comprobar que los hechos públicos coincidan con sus campos de
evidencia, que las superficies usen el modelo canónico, que los IDs de fuente
resuelvan y que las discrepancias permanezcan explícitas. La integración de la
vista debe pasar `pnpm check` y revisión de navegación/evidencias en navegador.
