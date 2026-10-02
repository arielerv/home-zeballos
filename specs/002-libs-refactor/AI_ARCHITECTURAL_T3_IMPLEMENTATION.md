# AI Architectural House Designer — Plan de implementación

## 0. Objetivo

Transformar `t3-designer` en la base de una plataforma capaz de:

1. Recibir un plano existente, imagen/PDF/DXF o una descripción textual.
2. Reconstruir una **representación arquitectónica paramétrica y métrica**, no una imagen.
3. Permitir que un agente LLM proponga y ejecute modificaciones.
4. Validar matemáticamente que el plano tenga sentido antes de aceptarlo.
5. Mantener una única fuente de verdad del proyecto.
6. Generar:
   - planta 2D;
   - geometría 3D;
   - modelo IFC;
   - escena Blender;
   - renders fotorrealistas;
   - modelo GLB/glTF para web.
7. Visualizar la vivienda en Three.js/WebGL.
8. Calcular y visualizar el sol y sombras por fecha/hora/ubicación.
9. Permitir cutaways, ocultar techo, mostrar habitaciones, mobiliario, contexto y terreno.
10. Poder desplegar el resultado como una experiencia web comercial.
11. Mantener trazabilidad entre datos aportados por el usuario, inferencias de IA y geometría efectivamente construida.

La regla fundamental del sistema es:

> **El LLM no dibuja la geometría final. El LLM modifica un modelo arquitectónico estructurado; un motor geométrico lo construye; un validador decide si es válido; los renderers lo visualizan.**

---

# 1. Base existente: T3 Designer

Repositorio de referencia:

https://github.com/pablitxn/t3-designer

El proyecto actual ya implementa una arquitectura especialmente adecuada para esta evolución.

Actualmente tiene:

- `apps/web`: React + Three.js, UI, escenas y materiales.
- `packages/scene-schema`: contrato versionado y validación del modelo.
- `packages/geometry`: geometría independiente del renderer.
- `scripts/lib/project-snapshot.ts`: generación determinista del snapshot.
- `scripts/blender`: adapter de Blender.
- `apps/web/src/lib/solar.ts`: cálculo solar independiente del renderer.
- GLBs de assets reutilizables.
- snapshots JSON persistidos.
- tests TypeScript/Python/browser.
- pipeline de render Blender sin necesidad de una sesión MCP abierta.

El README describe explícitamente un "metric model, two rendering workflows": React/Three.js para interacción y Blender para renders offline. La arquitectura también separa schema, geometría, datos, solar, snapshot y Blender.

**No reemplazar esta arquitectura. Extenderla.**

---

# 2. Principio arquitectónico

La arquitectura objetivo será:

```text
                    ┌─────────────────────┐
                    │       USER          │
                    │ PDF / imagen / DXF  │
                    │ texto / medidas     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   INGEST / IMPORT   │
                    │                     │
                    │ PDF/image parser    │
                    │ DXF importer        │
                    │ OCR / vision        │
                    │ manual correction   │
                    └──────────┬──────────┘
                               │
                               ▼
                  ┌──────────────────────────┐
                  │ ARCHITECTURAL MODEL      │
                  │                          │
                  │ walls                    │
                  │ rooms                    │
                  │ openings                 │
                  │ levels                   │
                  │ slabs                    │
                  │ stairs                   │
                  │ columns                  │
                  │ roof                     │
                  │ site                     │
                  │ fixtures                 │
                  └────────────┬─────────────┘
                               │
                               ▼
                  ┌──────────────────────────┐
                  │ GEOMETRY / BIM ENGINE    │
                  │                          │
                  │ archit-app               │
                  │ Shapely                 │
                  │ IFC / DXF                │
                  └────────────┬─────────────┘
                               │
                               ▼
                  ┌──────────────────────────┐
                  │ VALIDATION ENGINE        │
                  │                          │
                  │ topology                 │
                  │ dimensions               │
                  │ collisions                │
                  │ openings                 │
                  │ room connectivity        │
                  │ areas                    │
                  │ stairs                   │
                  │ envelope                 │
                  │ constraints              │
                  └────────────┬─────────────┘
                               │
                      valid? ──┴── no
                               │
                               ▼
                         AGENT REPAIR
                               │
                               └──────► validate

                               │ yes
                               ▼
                    ┌─────────────────────┐
                    │ VERSIONED SNAPSHOT  │
                    │       JSON          │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
             ┌─────────────┐      ┌─────────────┐
             │ Three.js    │      │   Blender   │
             │ Web viewer  │      │ offline     │
             └──────┬──────┘      └──────┬──────┘
                    │                    │
                    ▼                    ▼
                 GLB/web            Cycles render
                    │                    │
                    └────────┬───────────┘
                             ▼
                         PRODUCT
```

---

# 3. Decisión importante: no hacer de Blender la fuente de verdad

Blender NO debe ser el lugar donde se define la arquitectura.

Blender debe ser un adapter/render target.

La fuente de verdad será:

```text
Architectural Project
        +
Versioned Scene Snapshot
```

Blender recibirá ese snapshot.

Three.js recibirá el mismo snapshot.

IFC será otra representación/exportación del mismo modelo.

Esto evita que:

- Blender tenga una geometría diferente de la web.
- el plano 2D no coincida con el 3D.
- las sombras web no coincidan con la posición real de las paredes.
- un cambio manual en Blender rompa el modelo paramétrico.

---

# 4. archit-app

Usar `archit-app` como motor geométrico/arquitectónico cuando sea conveniente.

Repositorio:

https://github.com/archit-app/archit-app

La librería actualmente ofrece:

- `Wall`
- `Room`
- `Opening`
- `Column`
- `Staircase`
- `Slab`
- `Ramp`
- `Elevator`
- `Beam`
- furniture
- annotations
- structural grid
- multi-level `Building`
- land parcel
- spatial analysis
- adjacency
- egress
- area validation
- zoning/compliance
- daylighting
- JSON
- SVG
- DXF
- IFC 4.x
- PNG
- PDF
- validación estructurada
- Floorplan Agent Protocol.

Además utiliza coordenadas WORLD en metros y modelos inmutables.

## Regla

No hacer que `archit-app` sea el contrato de frontend.

El contrato público de la aplicación seguirá siendo el schema de T3 Designer ampliado.

Crear un adapter:

```text
packages/architecture-engine/
    src/
        archit/
        import/
        export/
        normalize/
        validate/
```

El adapter convierte:

```text
T3 Architectural Model
        ↓
archit-app model
        ↓
geometry
        ↓
IFC / DXF / SVG
```

Esto permite cambiar el motor posteriormente sin destruir el frontend.

---

# 5. Modelo de datos objetivo

El actual `ApartmentSchema` de T3 Designer ya define:

- unidades en metros;
- puntos 2D;
- rooms;
- walls;
- doors;
- windows;
- metadata;
- evidencia;
- estimaciones.

Mantener compatibilidad donde sea posible.

Actualmente el schema ya valida, entre otras cosas:

- polígonos con área distinta de cero;
- paredes con endpoints diferentes;
- openings que referencian una pared existente;
- openings que no exceden la longitud de la pared;
- openings que no exceden la altura de la pared;
- openings que no se superponen;
- IDs únicos.

Ampliar estas validaciones.

---

# 6. Nuevo modelo `ArchitecturalProject`

Crear un dominio más general que `Apartment`.

Propuesta conceptual:

```ts
type ArchitecturalProject = {
  schemaVersion: number
  id: string
  name: string

  units: "meters"

  site: Site
  levels: Level[]
  rooms: Room[]
  walls: Wall[]
  openings: Opening[]
  slabs: Slab[]
  ceilings: Ceiling[]
  stairs: Stair[]
  columns: Column[]
  beams: Beam[]
  roofs: Roof[]
  fixtures: Fixture[]
  assets: Asset[]

  constraints: Constraint[]
  evidence: Evidence[]
  assumptions: Assumption[]

  metadata: ProjectMetadata
}
```

No implementar todo de una vez.

---

# 7. Niveles

El proyecto debe soportar múltiples pisos desde el principio aunque MVP use uno.

```ts
type Level = {
  id: string
  index: number
  name: string
  elevation: number
  floorHeight: number
}
```

Ejemplo:

```json
{
  "id": "ground",
  "index": 0,
  "elevation": 0,
  "floorHeight": 2.70
}
```

---

# 8. Paredes

La pared es una entidad geométrica, no simplemente un mesh.

```ts
type Wall = {
  id: string
  levelId: string

  from: Point2D
  to: Point2D

  thickness: number
  height: number

  kind: "exterior" | "interior" | "party" | "structural"

  material?: string

  source: SourceConfidence
}
```

El sistema debe poder derivar:

- longitud;
- orientación;
- normal;
- segmento sólido;
- bounding box;
- intersecciones;
- openings;
- habitaciones asociadas.

---

# 9. Habitaciones

Una habitación debe tener:

```ts
type Room = {
  id: string
  levelId: string
  name: string
  program:
    | "living"
    | "dining"
    | "kitchen"
    | "bedroom"
    | "bathroom"
    | "hall"
    | "laundry"
    | "garage"
    | "office"
    | "storage"
    | "balcony"
    | "patio"
    | "other"

  polygon: Point2D[]

  targetArea?: number
  reportedArea?: number

  source: SourceConfidence
}
```

No permitir que el LLM tenga que inventar los puntos del polígono manualmente si puede expresarlo mediante constraints.

---

# 10. Modelo paramétrico

Además del resultado geométrico, soportar constraints.

Ejemplo:

```json
{
  "type": "distance",
  "a": "wall:w01",
  "b": "wall:w02",
  "value": 3.5,
  "tolerance": 0.01
}
```

Otros tipos:

```text
distance
parallel
perpendicular
aligned
equal_length
room_area
wall_thickness
opening_width
minimum_clearance
inside_boundary
adjacent
connected
orientation
setback
```

Esto es fundamental.

El LLM debería poder decir:

> "Quiero que el dormitorio tenga aproximadamente 10 m² y una ventana exterior."

en vez de decidir a mano todos los vértices.

---

# 11. Fuente y confianza

Separar claramente:

```text
OBSERVED
INFERRED
GENERATED
ESTIMATED
USER_DEFINED
DERIVED
```

Cada elemento puede incluir:

```ts
type SourceInfo = {
  type:
    | "observed"
    | "inferred"
    | "estimated"
    | "user_defined"
    | "generated"
    | "derived"

  confidence: number
  evidenceIds: string[]
}
```

Esto es importante cuando el plano proviene de una foto/PDF.

Ejemplo:

```text
Wall W12
source = observed
confidence = 0.98
```

versus:

```text
Window W07
source = inferred
confidence = 0.63
```

El render puede verse igual, pero el sistema debe saber que no tienen el mismo grado de certeza.

---

# 12. Evidence / provenance

Crear:

```ts
type Evidence = {
  id: string
  type:
    | "user_upload"
    | "measurement"
    | "photo"
    | "pdf"
    | "dxf"
    | "web_source"
    | "manual_note"

  label: string
  uri?: string
  page?: number
  description?: string
}
```

No mezclar evidencia con geometría.

---

# 13. Site

El modelo debe separar:

```text
building
parcel
street
neighbor buildings
terrain
north
geolocation
```

Ejemplo:

```ts
type Site = {
  parcel?: Parcel

  latitude?: number
  longitude?: number

  timezone?: string

  northAzimuth: number

  boundary?: Polygon
  setbacks?: Setback[]

  contextBuildings: ContextBuilding[]
  roads: Road[]
}
```

Para una casa nueva sin geolocalización todavía:

```text
latitude = null
longitude = null
northAzimuth = 0
```

---

# 14. Sistema de coordenadas

Conservar el principio actual de T3 Designer:

- geometría arquitectónica en metros;
- sistema local de planta;
- Y como altura;
- transformación explícita hacia site;
- transformación explícita hacia Blender.

No introducir transformaciones ocultas.

Documentar formalmente:

```text
Architectural local:
X = right/east-local
Y = up
Z = depth

Site:
X = east
Y = up
Z = south

Blender:
X = east
Y = north
Z = up
```

La transformación debe estar centralizada en un solo módulo.

No permitir que cada renderer implemente su propia conversión.

---

# 15. Precisión numérica

No usar centímetros como floats ambiguos en el LLM.

La representación interna seguirá en metros porque T3 Designer ya usa metros.

Para prompts y UI permitir:

```text
3m
3.50m
350cm
3500mm
```

Normalizar internamente:

```text
3.5
```

Definir tolerancias:

```ts
GEOMETRY_EPSILON = 1e-8
DIMENSION_TOLERANCE = 0.005
SNAP_TOLERANCE = 0.01
```

Las tolerancias deben ser configurables.

---

# 16. Pipeline de importación de planos

Soportar inicialmente:

### Nivel 1

Imagen:

```text
PNG
JPG
WEBP
```

### Nivel 2

PDF.

### Nivel 3

DXF.

### Nivel 4

IFC.

### Nivel 5

JSON/archit-app/T3.

El pipeline:

```text
input
 ↓
detect scale
 ↓
detect orientation
 ↓
detect walls
 ↓
detect openings
 ↓
detect rooms
 ↓
human/AI confirmation
 ↓
canonical architectural model
 ↓
validation
```

Nunca convertir directamente una imagen a mesh 3D.

---

# 17. Escala de imagen

Si una imagen tiene una cota conocida:

```text
pixel distance = 412
real distance = 4.12m
```

derivar:

```text
scale = 0.01 m/pixel
```

Si no existe escala conocida:

```text
scale confidence = unknown
```

El sistema NO debe inventar dimensiones precisas.

Debe mostrar:

```text
Escala no confirmada.
Necesito una medida real para calibrar el plano.
```

---

# 18. Reconstrucción desde imagen

La IA puede detectar candidatos:

```text
WallCandidate
DoorCandidate
WindowCandidate
RoomCandidate
DimensionCandidate
TextCandidate
```

Pero estos candidatos no pasan automáticamente a producción.

Pipeline:

```text
Vision
 ↓
Candidates
 ↓
Geometric reconstruction
 ↓
Topology
 ↓
Validation
 ↓
Confidence
 ↓
User confirmation if required
 ↓
Canonical model
```

---

# 19. DXF

Cuando exista DXF, usarlo preferentemente sobre visión.

El DXF contiene geometría más confiable.

Pipeline:

```text
DXF
 ↓
entities
 ↓
lines/polylines
 ↓
wall candidate
 ↓
join/merge
 ↓
rooms
 ↓
openings
 ↓
canonical model
```

Conservar:

```text
sourceEntityId
layer
originalCoordinates
```

cuando sea posible.

---

# 20. LLM Architecture Agent

Crear un agente especializado:

```text
ArchitectureAgent
```

El agente NO tendrá acceso directo a Three.js ni a Blender para modificar arquitectura.

Tendrá herramientas conceptuales:

```text
inspect_project
inspect_level
inspect_room
inspect_wall
create_room
move_wall
resize_room
add_wall
remove_wall
add_door
move_door
add_window
move_window
create_level
set_constraint
validate_project
repair_project
export_ifc
export_dxf
create_snapshot
```

---

# 21. Ejemplo de interacción

Usuario:

> Quiero agrandar el living 80 cm hacia el patio y mantener la cocina igual.

El agente debe:

1. localizar living;
2. localizar patio;
3. identificar pared divisoria;
4. comprobar que la cocina no dependa de esa pared;
5. proponer modificación;
6. aplicar mutación;
7. ejecutar validator;
8. si falla, reparar;
9. presentar resultado.

No debe simplemente editar coordenadas arbitrariamente.

---

# 22. Mutation model

Toda modificación debe ser una operación explícita:

```ts
type Mutation = {
  id: string
  type: string
  targetIds: string[]
  parameters: Record<string, unknown>
  reason: string
  author: "user" | "agent" | "system"
}
```

Ejemplo:

```json
{
  "type": "move_wall",
  "targetIds": ["wall:w12"],
  "parameters": {
    "delta": [0.8, 0]
  },
  "reason": "Expand living room toward patio",
  "author": "agent"
}
```

Guardar historial.

Esto permite undo/redo y auditoría.

---

# 23. No permitir edición destructiva del snapshot

Nunca modificar directamente:

```text
scene.json
```

La aplicación debe construir:

```text
base project
+
mutation log
=
derived project
```

Opcionalmente compactar el historial posteriormente.

---

# 24. Validation Engine

Este es el componente más importante.

Crear:

```text
packages/architecture-validation/
```

Validaciones:

## Geométricas

- paredes con longitud > 0;
- rooms con área > 0;
- polígonos válidos;
- no self-intersection;
- walls no inválidas;
- vertices coincidentes dentro de tolerancia;
- no geometría NaN/Infinity.

## Paredes

- endpoints válidos;
- espesor > 0;
- altura > 0;
- joins válidos;
- exterior/interior coherentes.

## Openings

- opening referencia wall;
- opening está dentro de wall;
- no overlap;
- opening no supera altura;
- door/window no tienen dimensiones imposibles.

## Rooms

- rooms válidas;
- rooms no se superponen de forma imposible;
- rooms están dentro del perímetro;
- habitaciones principales tienen acceso;
- baños/cocinas tienen conexión.

## Circulación

- no bloquear puertas;
- puerta no abre contra una pared;
- ancho de circulación;
- habitaciones accesibles desde circulación.

## Multi-level

- escaleras conectan niveles;
- escalera no termina en vacío;
- slab/floor compatibles;
- openings de escalera compatibles.

## Site

- edificio dentro del parcel;
- setbacks;
- orientación;
- límites.

---

# 25. Findings estructurados

Seguir el patrón actual de `archit-app` y T3 Designer.

Cada problema:

```ts
type Finding = {
  severity: "error" | "warning" | "info"
  code: string
  elementIds: string[]
  message: string
  fixHint?: string
}
```

Ejemplo:

```json
{
  "severity": "error",
  "code": "DOOR_OUTSIDE_WALL",
  "elementIds": ["door:d12", "wall:w08"],
  "message": "Door d12 extends 0.18m beyond wall w08.",
  "fixHint": "Move door offset to <= 2.71m or enlarge wall."
}
```

---

# 26. Reparación automática

El agente recibe:

```text
project
+
findings
```

y debe producir una nueva mutation.

Ejemplo:

```text
ERROR:
WINDOW_OUTSIDE_WALL

window:w08
wall:w12

window extends 0.12m beyond wall.

Suggested fix:
move window offset by -0.12m
```

Luego:

```text
mutate
→ validate
→ validate again
```

Máximo configurable:

```text
repairAttempts = 3
```

Si después de 3 intentos sigue inválido:

```text
status = needs_human_review
```

No permitir loops infinitos.

---

# 27. Validación de sentido arquitectónico

Separar:

### Validación geométrica

"¿Es matemáticamente válido?"

de:

### Validación arquitectónica

"¿Tiene sentido como vivienda?"

Ejemplos:

```text
bedroom has no exterior/window
bathroom has no access
living room has no door
stairs do not connect floors
door opens into impossible collision
room area below configured threshold
corridor ends without destination
```

Estas reglas deben ser configurables por proyecto/país.

No hardcodear normativa argentina dentro del core.

---

# 28. Layout generation

Para generar una casa desde cero:

```text
requirements
 ↓
program
 ↓
room graph
 ↓
layout candidates
 ↓
geometric solver
 ↓
validation
 ↓
rank candidates internally
 ↓
present candidates
```

El LLM puede producir el programa:

```json
{
  "rooms": [
    {"type": "living", "targetArea": 30},
    {"type": "kitchen", "targetArea": 12},
    {"type": "bedroom", "targetArea": 14},
    {"type": "bedroom", "targetArea": 11},
    {"type": "bathroom", "targetArea": 5}
  ]
}
```

Pero no debería inventar todos los vértices sin solver.

---

# 29. Room adjacency graph

Crear:

```ts
type RoomGraph = {
  nodes: RoomNode[]
  edges: RoomEdge[]
}
```

Ejemplo:

```text
Living
 ├── Kitchen
 ├── Hall
 └── Patio

Hall
 ├── Bedroom 1
 ├── Bedroom 2
 └── Bathroom
```

El layout solver debe intentar respetar este grafo.

---

# 30. IFC

IFC debe ser un export target.

Mapear:

```text
Project
  → IfcProject

Site
  → IfcSite

Building
  → IfcBuilding

Level
  → IfcBuildingStorey

Wall
  → IfcWall

Door
  → IfcDoor

Window
  → IfcWindow

Slab
  → IfcSlab

Roof
  → IfcRoof

Stair
  → IfcStair
```

No depender de IFC para la UI.

IFC sirve como intercambio profesional.

---

# 31. T3 Scene Snapshot

Ampliar el snapshot existente.

Actualmente `ProjectSnapshotSchema` ya tiene:

- project;
- units;
- coordinates;
- apartment;
- assets;
- fixtures;
- placement;
- geometry;
- site;
- buildings;
- roads;
- parcel;
- solar.

Mantener este patrón.

Cambiar:

```text
Apartment
```

por una capa compatible:

```text
ArchitectureProject
```

o agregar:

```text
architecture
```

sin romper inmediatamente los snapshots existentes.

Usar migration:

```text
schemaVersion 1
→ migration
→ schemaVersion 2
```

No editar silenciosamente snapshots antiguos.

---

# 32. Versioning

Definir:

```text
ARCHITECTURE_SCHEMA_VERSION
PROJECT_SNAPSHOT_VERSION
```

independientemente.

Ejemplo:

```text
architecture schema = 2
snapshot = 2
```

Cada snapshot debe declarar:

```json
{
  "schemaVersion": 2,
  "generatedFrom": "project revision 17"
}
```

---

# 33. Web renderer

Mantener React + Three.js.

El web renderer debe consumir solamente:

```text
validated snapshot
```

Nunca consumir datos parcialmente inválidos.

Debe soportar:

- orbit;
- pan;
- zoom;
- first person opcional;
- floor plan;
- cutaway;
- hide roof;
- hide ceiling;
- show room;
- show dimensions;
- labels;
- room selection;
- wall selection;
- door/window selection;
- fixtures;
- building context;
- site;
- terrain;
- north;
- sun.

---

# 34. Sun system

Conservar la arquitectura existente de `solar.ts`.

Actualmente T3 Designer ya calcula el sol localmente y guarda:

- altitude;
- azimuth;
- direction;
- daylight;
- sunrise;
- sunset;
- solar noon;
- samples de 15 minutos;
- timezone;
- UTC instant.

No reemplazar este sistema por una API externa.

Agregar:

```text
latitude
longitude
timezone
northAzimuth
date
time
```

y calcular:

```text
sun direction
sun altitude
shadow direction
```

---

# 35. Sol exacto

La selección del instante debe conservar el comportamiento actual:

```text
exact UTC instant
```

El `defaultFrame` puede seguir siendo el sample de 15 minutos más cercano.

No confundir:

```text
selected instant
```

con:

```text
nearest timeline frame
```

Esto ya está correctamente separado en el proyecto actual.

---

# 36. Blender

Conservar el patrón actual de:

```text
JSON snapshot
→ assemble_project.py
→ .blend
→ Cycles
→ PNG
```

No usar MCP para el pipeline automático de render.

El MCP puede existir como herramienta opcional para desarrollo/inspección, pero producción debe funcionar:

```bash
blender -b
```

sin GUI.

---

# 37. Blender architectural adapter

Crear:

```text
scripts/blender/architecture/
    walls.py
    rooms.py
    slabs.py
    roofs.py
    doors.py
    windows.py
    stairs.py
    fixtures.py
    materials.py
```

No mezclar toda la lógica en `assemble_project.py`.

`assemble_project.py` debe ser un orchestrator.

---

# 38. Materiales

Separar:

```text
architecture geometry
```

de:

```text
presentation/materials
```

Ejemplo:

```ts
Wall:
  material = "plaster-white"
```

pero Blender decide:

```text
Principled BSDF
roughness
normal map
texture
displacement
```

Three.js puede usar una versión simplificada.

---

# 39. GLB

El web viewer debe usar GLB cuando sea conveniente.

Exportar:

```text
architecture.glb
fixtures/*.glb
context/*.glb
```

No generar necesariamente un único GLB gigante.

Mantener assets independientes para:

- muebles;
- electrodomésticos;
- sanitarios;
- vegetación;
- decoración.

Esto coincide con la filosofía actual de T3 Designer, donde fixtures permanecen separados del mesh arquitectónico.

---

# 40. Assets

Extender el catálogo actual:

```ts
type Asset = {
  id
  label
  url
  dimensions
  category
  evidence
  dimensionalStatus
  source
  license
}
```

Agregar:

```text
manufacturer
productUrl
model
thumbnail
```

cuando corresponda.

---

# 41. Web architecture editing

Inicialmente NO crear un CAD completo.

Implementar primero:

- seleccionar pared;
- mover pared;
- editar longitud;
- cambiar espesor;
- agregar/eliminar puerta;
- agregar/eliminar ventana;
- seleccionar habitación;
- editar nombre;
- cambiar área objetivo;
- agregar habitación.

La modificación compleja puede ser ejecutada por el agente.

---

# 42. Agent UX

Interface:

```text
┌───────────────────────────────────────────┐
│                                           │
│               3D VIEW                     │
│                                           │
│                                           │
├───────────────────────┬───────────────────┤
│ PLAN / INSPECTOR      │ AI ASSISTANT      │
│                       │                   │
│ Living 32.4m²         │ "Agrandá el       │
│ Kitchen 11.8m²        │ living 80cm."     │
│ Bedroom 13.2m²        │                   │
│ ...                   │ [Apply]           │
└───────────────────────┴───────────────────┘
```

Después de una modificación:

```text
AI:
Propuesta aplicada.

✓ Living: 32.4 → 36.1 m²
✓ Kitchen unchanged
✓ 3 openings preserved
✓ No collisions
✓ Floor perimeter preserved
```

---

# 43. Preview antes de commit

Las mutaciones del agente deben ejecutarse inicialmente como:

```text
draft mutation
```

El sistema genera:

```text
before
after
validation
```

El usuario puede:

```text
Accept
Reject
Ask AI to adjust
```

Para modo automático se podrá configurar:

```text
autoApprove = true
```

pero el modo interactivo debe ser el default.

---

# 44. MCP

Crear un MCP separado:

```text
architectural-model-mcp
```

Herramientas:

```text
get_project
get_rooms
get_walls
get_openings
get_constraints
get_validation
create_room
move_wall
resize_room
create_opening
move_opening
set_constraint
validate
export_ifc
export_dxf
export_snapshot
```

No exponer directamente:

```text
three.js
bpy
DOM
React state
```

El MCP opera sobre el dominio.

---

# 45. Skill para Claude/Copilot/Codex

Crear:

```text
skills/architectural-design/SKILL.md
```

La skill debe enseñar al agente:

1. Nunca dibujar arquitectura como imagen.
2. Inspeccionar el modelo antes de modificarlo.
3. Usar unidades métricas.
4. Usar IDs.
5. Aplicar mutations.
6. Validar después de cada modificación.
7. Nunca ocultar errores.
8. No inventar dimensiones cuando faltan datos.
9. Diferenciar observado/inferido/estimado.
10. No modificar directamente Blender.
11. No modificar directamente archivos derivados.
12. Regenerar snapshot.
13. Ejecutar tests/validation.
14. Explicar al usuario qué cambió.

---

# 46. Skill anti-alucinación

Regla crítica:

> Si una dimensión no está disponible, no inventarla silenciosamente.

Ejemplo:

Usuario:

> ¿Cuánto mide exactamente esta pared?

Si solo se conoce la imagen:

```text
No puedo garantizar la medida exacta.
La estimación actual es 4.21m ± 0.15m.
Necesito una cota o referencia real para calibrarla.
```

---

# 47. No usar visión para decidir geometría si existe información mejor

Prioridad de fuentes:

```text
1. User measurement
2. Surveyed CAD/DXF/IFC
3. Dimension annotations
4. Existing structured model
5. Image geometry
6. AI inference
7. Generic architectural assumption
```

La fuente de menor confianza nunca debe sobreescribir una de mayor confianza sin autorización.

---

# 48. Conflictos

Ejemplo:

```text
DXF says 4.00m
Image inference says 4.18m
User says 4.05m
```

No elegir silenciosamente.

Mostrar:

```text
Conflicting measurements:
DXF: 4.00m
Image: ~4.18m
User: 4.05m

Current authoritative value: user measurement 4.05m
```

---

# 49. Site / geolocation

Para proyectos reales:

```text
project.location
```

puede incluir:

```text
latitude
longitude
timezone
north
address
```

El sistema puede obtener:

- parcela;
- edificios vecinos;
- calles;
- orientación;
- contexto.

Pero estos datos deben quedar marcados como externos/estimados según su origen.

---

# 50. Sombras

La simulación de sombras debe incluir:

```text
house
neighbor buildings
terrain
walls
roof
trees/objects when available
```

La cámara puede ocultar geometría sin eliminarla de shadow casting.

Conservar el principio actual de T3 Designer:

> Una geometría invisible para la cámara puede seguir bloqueando físicamente la luz.

---

# 51. Diferencia entre visualización y certificación

La aplicación debe indicar:

```text
Solar visualization
```

y NO:

```text
certified solar analysis
energy certification
legal survey
structural certification
```

salvo que se agreguen módulos específicos y fuentes profesionales.

---

# 52. Output de proyecto

Un proyecto terminado debe poder generar:

```text
project/
├── project.json
├── snapshot.json
├── floorplans/
│   ├── ground.svg
│   ├── ground.pdf
│   └── ground.dxf
├── ifc/
│   └── project.ifc
├── web/
│   ├── architecture.glb
│   ├── fixtures/
│   └── context/
├── blender/
│   ├── project.blend
│   └── render-config.json
├── renders/
│   ├── exterior.png
│   ├── living.png
│   └── ...
└── evidence/
```

---

# 53. API

Si se implementa backend:

```text
POST /projects
GET /projects/:id
POST /projects/:id/import
POST /projects/:id/mutations
POST /projects/:id/validate
POST /projects/:id/export/ifc
POST /projects/:id/export/dxf
POST /projects/:id/render
GET /projects/:id/snapshot
```

Para MVP local puede no existir backend.

Primero debe funcionar filesystem-first.

---

# 54. Persistencia

MVP:

```text
JSON files
```

Posteriormente:

```text
PostgreSQL
```

No introducir DB prematuramente.

El modelo debe poder exportarse/importarse completamente desde JSON.

---

# 55. Testing

## Unit

Testear:

- geometry;
- walls;
- rooms;
- openings;
- constraints;
- mutations;
- validators;
- coordinate transformations;
- solar;
- snapshot.

## Property tests

Especialmente:

```text
wall segmentation
opening offsets
room area
coordinate transforms
round-trip IFC
round-trip DXF
```

## Snapshot tests

Cambios de arquitectura deben producir snapshots deterministas.

## E2E

Test:

```text
import
→ edit
→ validate
→ snapshot
→ web render
```

## Blender

Test en background:

```bash
blender -b --python ...
```

No depender de GUI.

---

# 56. Acceptance test principal

Crear una casa de prueba:

```text
Terreno: 10m × 25m

Casa:
10m × 12m

Ambientes:
Living
Kitchen
2 bedrooms
Bathroom
Laundry
Hall
Patio
```

Debe poder:

1. generar el plano;
2. validarlo;
3. exportarlo a SVG;
4. exportarlo a DXF;
5. exportarlo a IFC;
6. convertirlo a snapshot T3;
7. visualizarlo en Three.js;
8. visualizarlo en planta;
9. mostrar puertas;
10. mostrar ventanas;
11. mostrar sol;
12. exportar Blender;
13. renderizar;
14. exportar GLB;
15. cargar GLB en web.

---

# 57. Acceptance test de modificación IA

Prompt:

> "Agranda el living 80 cm hacia el patio sin cambiar la cocina ni el ancho del terreno."

Expected:

```text
✓ wall moved
✓ living area increased
✓ kitchen geometry unchanged
✓ exterior boundary unchanged
✓ door/window constraints preserved
✓ no collision
✓ snapshot valid
✓ web updated
✓ Blender render updated
```

---

# 58. Acceptance test de error

Prompt:

> "Mové la pared del dormitorio hasta atravesar el baño."

Expected:

```text
Mutation generated
→ validator catches room overlap
→ mutation rejected or repaired
→ no invalid project committed
```

Nunca debe aparecer un proyecto visualmente bonito pero geométricamente inválido.

---

# 59. Acceptance test de incertidumbre

Input:

```text
image without known scale
```

Expected:

```text
project generated as estimated
confidence recorded
scale warning shown
no claim of exact dimensions
```

---

# 60. Migración de T3 Designer

No reescribir.

### Fase 1

Preservar:

```text
apps/web
packages/geometry
packages/scene-schema
scripts/blender
solar
```

### Fase 2

Agregar:

```text
packages/architecture-model
packages/architecture-validation
packages/architecture-engine
packages/agent-protocol
```

### Fase 3

Adaptar T3:

```text
t3Apartment
```

para convertirse en un `ArchitecturalProject`.

### Fase 4

Mantener compatibilidad con snapshots actuales.

### Fase 5

Agregar importación.

### Fase 6

Agregar agente.

---

# 61. Estructura propuesta del monorepo

```text
t3-designer/
├── apps/
│   └── web/
│
├── packages/
│   ├── scene-schema/
│   ├── geometry/
│   ├── architecture-model/
│   ├── architecture-validation/
│   ├── architecture-engine/
│   ├── agent-protocol/
│   ├── solar/
│   └── rendering-contract/
│
├── scripts/
│   ├── architecture/
│   │   ├── import_image.py
│   │   ├── import_dxf.py
│   │   ├── export_ifc.py
│   │   └── validate.py
│   │
│   └── blender/
│       ├── assemble_project.py
│       └── architecture/
│
├── skills/
│   └── architectural-design/
│       ├── SKILL.md
│       └── references/
│
├── mcp/
│   └── architectural-model/
│
├── assets/
│   ├── scenes/
│   ├── blender/
│   └── fixtures/
│
└── docs/
    ├── architecture/
    ├── domain/
    ├── agent/
    └── workflows/
```

---

# 62. Dependencias

No agregar dependencias innecesarias.

Frontend:

```text
React
Three.js
Zod
```

ya existentes.

Geometry:

```text
existing geometry package
```

Python architecture engine:

```text
archit-app
shapely
pydantic
ifcopenshell
```

Solo agregar según necesidad.

---

# 63. Regla de dependencia

Nunca:

```text
React → archit-app
```

Nunca:

```text
Three.js → Blender
```

Nunca:

```text
Blender → canonical model
```

La dirección correcta es:

```text
Domain
 ↓
Geometry
 ↓
Validation
 ↓
Snapshot
 ↓
Adapters
```

---

# 64. Rendimiento

La UI no debe recalcular todo Blender ante cada movimiento.

Durante edición:

```text
user drag
 ↓
local geometry
 ↓
lightweight validation
 ↓
Three.js preview
```

Al confirmar:

```text
commit
 ↓
full validation
 ↓
snapshot
 ↓
optional Blender render
```

---

# 65. Render queue

Más adelante:

```text
POST /render
```

crea:

```text
RenderJob
```

Estados:

```text
queued
running
completed
failed
cancelled
```

No bloquear el navegador esperando Cycles.

---

# 66. Render presets

Crear:

```text
draft
preview
marketing
high_quality
```

Ejemplo:

```text
draft:
  samples = 32

preview:
  samples = 128

marketing:
  samples = 512+

high_quality:
  configurable
```

No hardcodear valores sin permitir configuración.

---

# 67. Cámaras

Presets:

```text
exterior_front
exterior_back
living
kitchen
bedroom
top_down
floor_plan
isometric
```

Guardar cámaras como datos:

```ts
type CameraPreset = {
  id
  position
  target
  lens
}
```

Blender y Three.js pueden adaptar esos valores a sus APIs.

---

# 68. Mobiliario

El mobiliario NO forma parte de la geometría arquitectónica.

Separar:

```text
architecture
fixtures
decor
vegetation
context
```

Así se puede cambiar un sofá sin invalidar el plano.

---

# 69. Catálogo de muebles

Mantener assets independientes.

Cada asset:

```text
GLB
dimensions
category
evidence
license
```

El placement:

```text
roomId
position
rotation
scale
```

---

# 70. Editor de planta

Crear un modo:

```text
2D PLAN
```

con:

- grid;
- snap;
- dimension display;
- wall selection;
- room labels;
- opening symbols;
- north;
- parcel boundary.

No implementar un editor CAD completo inicialmente.

---

# 71. Dimension chains

Agregar anotaciones derivadas:

```text
overall width
overall depth
room width
room depth
door width
window width
wall thickness
```

Las cotas deben derivarse de geometría.

No guardar una cota que pueda quedar desactualizada sin marcarla como derivada.

---

# 72. Derived data

Separar:

```text
authoritative
derived
```

Ejemplo:

```text
wall.from/to = authoritative
wall.length = derived
room.area = derived
opening.center = derived
```

Nunca pedirle al LLM que mantenga simultáneamente datos derivados.

---

# 73. Consistencia

Un proyecto válido debe poder reconstruirse completamente a partir de:

```text
canonical model
+
assets
+
site
+
solar inputs
```

No depender de estado oculto del navegador.

---

# 74. Determinismo

El snapshot debe ser determinista.

La misma entrada debe generar:

```text
same JSON
same geometry
same wall segmentation
same transformations
```

excepto metadata explícitamente no determinista.

Mantener el patrón existente de `buildProjectSnapshot()`.

---

# 75. Git workflow

Los archivos fuente deben ser versionables.

Evitar commitear:

```text
renders gigantes
artifacts temporales
generated .blend
```

salvo escenas de referencia explícitamente versionadas.

Mantener el patrón actual de `artifacts/` ignorado.

---

# 76. Documentación

Crear:

```text
docs/domain/architectural-model.md
docs/domain/constraints.md
docs/domain/validation.md
docs/agent/architecture-agent.md
docs/agent/mcp.md
docs/workflows/import.md
docs/workflows/blender.md
docs/workflows/web.md
```

Actualizar:

```text
docs/architecture/architecture.md
```

para explicar el nuevo flujo.

---

# 77. MCP vs Skill

No confundir.

### Skill

Instrucciones de comportamiento del agente.

### MCP

Herramientas para modificar/consultar el proyecto.

### Domain model

Fuente de verdad.

### Validator

Autoridad geométrica.

### Blender

Renderer.

### Three.js

Viewer.

La combinación correcta es:

```text
LLM
 +
Skill
 +
MCP
 +
Domain
 +
Validator
```

---

# 78. Qué NO implementar

No implementar inicialmente:

- entrenamiento de un modelo propio;
- generación directa de meshes mediante IA;
- text-to-image como fuente arquitectónica;
- CAD completo;
- cálculo estructural;
- cálculo energético certificado;
- normativa municipal completa;
- BIM colaborativo multiusuario;
- render cloud complejo;
- marketplace de muebles.

Primero resolver:

```text
precise floorplan
→ validated model
→ 3D
→ web
→ Blender
```

---

# 79. MVP

El MVP debe soportar:

```text
1. JSON architectural model
2. walls
3. rooms
4. doors
5. windows
6. floor
7. one level
8. validation
9. snapshot
10. Three.js
11. Blender
12. solar
13. GLB
14. SVG
15. DXF
16. IFC
17. basic agent mutations
```

No esperar a tener visión/OCR para probar el sistema.

---

# 80. MVP demo

La demo debe permitir:

```text
Crear casa 10 × 20
        ↓
Agregar habitaciones
        ↓
Modificar pared por lenguaje natural
        ↓
Validar
        ↓
Ver planta
        ↓
Ver 3D
        ↓
Mover hora del día
        ↓
Ver sombras
        ↓
Render Blender
        ↓
Abrir modelo web
```

Si esto funciona, el resto son inputs adicionales.

---

# 81. Fase 2

Agregar:

```text
PDF
image
OCR
dimension detection
DXF
IFC import
multi-level
stairs
roof
terrain
```

---

# 82. Fase 3

Agregar:

```text
AI floorplan generation
constraint solver
multiple layout proposals
automatic repair
architectural program
```

---

# 83. Fase 4

Agregar:

```text
commercial project management
cloud render
user accounts
project sharing
web publishing
```

---

# 84. Publicación web

Cada proyecto publicado puede generar:

```text
/projects/:slug
```

con:

- 3D;
- floor plan;
- rooms;
- sunlight;
- date/time;
- season;
- camera presets;
- cutaway;
- context.

El proyecto web debe cargar solamente un snapshot validado y assets publicados.

---

# 85. Seguridad

Nunca ejecutar código generado por el LLM directamente en:

```text
Blender Python
OS shell
filesystem
```

sin una capa controlada.

El agente debe usar operaciones declarativas.

El backend puede convertir:

```text
Mutation
```

a operaciones internas.

---

# 86. Auditoría

Registrar:

```text
who
when
mutation
before
after
validation
```

Ejemplo:

```text
Revision 18
Author: agent
Mutation: move_wall
Target: W12
Delta: +0.8m
Validation: PASS
```

---

# 87. Requisitos de calidad

El sistema debe cumplir:

### Geometría

- sin geometría inválida;
- unidades consistentes;
- transformaciones deterministas.

### Arquitectura

- rooms conectados;
- openings válidos;
- paredes consistentes.

### Render

- web y Blender reciben la misma geometría física.

### Solar

- misma posición solar para web y Blender.

### AI

- ninguna mutación inválida se convierte automáticamente en estado final.

---

# 88. Criterio de éxito real

No considerar éxito:

> "La IA dibuja una casa bonita."

Considerar éxito:

> "La IA puede modificar una casa paramétrica existente, mantener dimensiones y restricciones, validar el resultado y producir exactamente el mismo modelo arquitectónico para 2D, Three.js, IFC y Blender."

---

# 89. Orden exacto de implementación

## Paso 1

Fork/branch del T3 Designer.

No reescribir.

## Paso 2

Crear `packages/architecture-model`.

## Paso 3

Migrar el modelo actual de apartamento al nuevo modelo.

## Paso 4

Crear `architecture-validation`.

## Paso 5

Hacer que `project-snapshot.ts` consuma el nuevo modelo.

## Paso 6

Mantener Three.js funcionando con el nuevo snapshot.

## Paso 7

Mantener Blender funcionando con el nuevo snapshot.

## Paso 8

Agregar archit-app adapter.

## Paso 9

Agregar IFC/DXF/SVG.

## Paso 10

Agregar mutation engine.

## Paso 11

Agregar Architecture Agent.

## Paso 12

Agregar MCP.

## Paso 13

Agregar skill.

## Paso 14

Agregar edición 2D.

## Paso 15

Agregar importación DXF/PDF/imagen.

## Paso 16

Agregar generación automática de layouts.

---

# 90. Instrucción para el agente implementador

Antes de escribir código:

1. Leer todo el repositorio existente.
2. Leer `docs/architecture/architecture.md`.
3. Leer `packages/scene-schema`.
4. Leer `packages/geometry`.
5. Leer `scripts/lib/project-snapshot.ts`.
6. Leer `scripts/blender`.
7. Leer `apps/web/src/lib/solar.ts`.
8. Ejecutar tests actuales.
9. Ejecutar la aplicación actual.
10. Identificar exactamente los límites de cada módulo.
11. No duplicar lógica existente.
12. No reemplazar componentes funcionales sin necesidad.

Después:

1. Implementar el dominio.
2. Implementar validation.
3. Migrar el ejemplo existente.
4. Ejecutar todos los tests.
5. Confirmar que Three.js sigue igual.
6. Confirmar que Blender sigue generando el render.
7. Recién después agregar IA.

---

# 91. Regla de oro para el desarrollo

Ante cualquier decisión arquitectónica:

```text
¿Esto pertenece al modelo?
¿Esto pertenece a geometría?
¿Esto pertenece a validación?
¿Esto pertenece al renderer?
¿Esto pertenece al agente?
```

No mezclar responsabilidades.

Especialmente:

```text
LLM ≠ geometry engine
LLM ≠ renderer
Blender ≠ source of truth
Three.js ≠ source of truth
Image ≠ architectural model
```

---

# 92. Resultado final esperado

El sistema terminado debe permitir algo como:

```text
Usuario:

"Esta es mi casa. Tiene 10m de frente,
25m de fondo. Quiero mantener la fachada,
agrandar el living hacia el patio y agregar
un dormitorio."

                ↓

Architecture Agent

                ↓

Canonical Architectural Model

                ↓

Constraint / Geometry Engine

                ↓

Validation

                ↓

Versioned Snapshot

        ┌───────┼────────┐
        ▼       ▼        ▼
       2D      3D       IFC
        │       │
        │       ▼
        │    Blender
        │       │
        │       ▼
        │     Render
        │
        ▼
     Web/Three.js
        │
        ▼
Sun + shadows + interactive model
```

Y si el usuario después dice:

> "El dormitorio quedó muy chico. Hacelo de 12 m² sin tocar el baño."

el agente debe poder hacer una segunda mutation sobre el mismo modelo, validar las consecuencias y regenerar automáticamente todos los outputs.

---

# 93. Referencias técnicas

## T3 Designer

Repositorio:
https://github.com/pablitxn/t3-designer

Puntos especialmente relevantes del repositorio actual:

- `packages/scene-schema/src/apartment.ts`
- `packages/scene-schema/src/project.ts`
- `packages/geometry`
- `scripts/lib/project-snapshot.ts`
- `scripts/blender/assemble_project.py`
- `apps/web/src/lib/solar.ts`
- `docs/architecture/architecture.md`
- `docs/workflows/blender.md`

El schema actual ya utiliza Zod y valida paredes/openings, el snapshot es versionado y determinista, y el adapter de Blender consume el snapshot en lugar de depender de una sesión GUI/MCP.

## archit-app

Repositorio:
https://github.com/archit-app/archit-app

Usarlo como motor/adaptador de arquitectura y análisis, no como dependencia del frontend.

---

# 94. Nota final para el implementador

La prioridad no es agregar muchas features.

La prioridad es construir una **cadena de confianza geométrica**:

```text
INPUT
  ↓
STRUCTURED MODEL
  ↓
GEOMETRY
  ↓
VALIDATION
  ↓
SNAPSHOT
  ↓
RENDERERS
```

Si esta cadena es correcta, podemos cambiar:

- GPT por Claude;
- Claude por Codex;
- archit-app por otro engine;
- Blender por otro renderer;
- Three.js por otro viewer;

sin destruir el sistema.

El componente más importante de todo el proyecto no es el LLM ni Blender.

Es el **modelo arquitectónico canónico + validator + snapshot versionado**.

Ese debe ser el núcleo.
