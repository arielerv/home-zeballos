# Checkpoint: edificio y sol — 26/09/2026

Milestone local: **`checkpoint/t3-building-sun-v1`**. El usuario pidió guardar y hacer commit antes de seguir iterando en otro chat. Leer este archivo al retomar. El checkpoint anterior del interior está preservado en [checkpoints/t3-current-state-v1.md](t3-current-state-v1.md), tag `checkpoint/t3-current-state-v1`, commit `5e45d4e`.

## Estado implementado

- Dos vistas en la misma aplicación: **Departamento** (`#apartment`) y **Edificio y sol** (`#building`, vista inicial). El interior conserva su reconstrucción y assets previos.
- Edificio principal confirmado por RNB, con huella y altura IGN, parcela catastral AL 0538, 98 vecinos y 27 tramos de calles. Fachada y cubierta principal reconstruidas visualmente a partir de las 10 capturas del usuario.
- Fecha y hora civil de **Europe/Paris**, cambios CET/CEST, presets de estaciones, animación del día, trayectoria solar, altura/azimut, salida/puesta y mediodía solar.
- Sombras dinámicas en el modelo, apagado de luz solar directa durante la noche, perspectiva/planta, reinicio de cámara y capas de vecinos/trayectoria/rótulos.
- Interfaz responsive, render bajo demanda para evitar redibujar continuamente en reposo y rótulos DOM proyectados sin raíces adicionales de React.
- Escena Blender editable con contexto y recorrido solar, más draft Superdesign y captura web guardados.

## Fuentes de verdad

- `apps/web/src/data/building-site.ts`: geodatos locales y atribución; ejes metros **X este / Y arriba / Z sur**. Origen RNB: lat 48.00129436934608, lon -4.106788129193569.
- `apps/web/src/lib/solar.ts`: cálculo astronómico NOAA/Meeus y manejo de hora local/DST, independiente del renderer.
- `apps/web/src/components/BuildingScene.tsx`: volúmenes, fachadas procedurales, cubiertas inferidas, sombras y cámara.
- `apps/web/src/components/BuildingLabels.tsx`: proyección de rótulos al overlay React normal.
- `apps/web/src/components/BuildingExplorer.tsx` y `apps/web/src/building.css`: controles y presentación.
- `apps/web/src/App.tsx`: selector de vistas.
- `apps/web/src/data/t3.ts`, `current-state.ts`: datos del interior, aún sin alineación geográfica confirmada con el edificio.
- [building-research.md](../research/building-research.md): identidad, consultas reproducibles BAN/RNB/IGN/catastro/BDNB, licencias y precisión.
- [solar-model.md](../model/solar-model.md): ecuaciones, contrato, DST y límites del modelo solar.

## Proyectos y archivos guardados

Todos los `.blend` siguientes forman parte del repositorio:

| Archivo | Contenido |
| --- | --- |
| `assets/blender/t3-building-context.blend` | Escena `T3 Building Sun`, 99 edificios, 27 vías y 639 objetos; escena inicial `Scene` de 3 objetos preservada. Guardado de nuevo desde la sesión viva al hacer este checkpoint. |
| `assets/blender/t3-current-state.blend` | Reconstrucción editable del interior existente. |
| `assets/blender/asset-library.blend` | Biblioteca editable de assets del interior. |
| `assets/blender/door-frame.blend` | Asset de marco de puerta de muestra. |

`assets/blender/checkpoint-validation.json` registra apertura de los cuatro archivos, escenas, tamaños, SHA-256 y comprobación de imágenes externas faltantes. Los 18 GLB del interior, GLB de muestra, previews y scripts también están guardados.

El Blender abierto queda asociado a `t3-building-context.blend`; no se borraron las escenas anteriores. El generador `scripts/blender/assemble_building.py` crea una escena nueva y guarda una copia, por lo que repetirlo en una sesión viva agrega otra escena. Para regeneración limpia, usar un proceso en background.

`docs/snapshots/building-site.json` guarda la instantánea geográfica y 96 muestras solares cada 15 min del **26/09/2026**. En Blender el fotograma 61 corresponde a **15:00 París**; los ejes son **X este / Y norte / Z arriba**. Cambiar el timeline recorre ese día. Para otro día hay que regenerar la instantánea; todavía no hay un exportador persistido específico ni calendario interactivo en Blender. `pnpm scene:snapshot` exporta solamente el interior.

Superdesign:

- [Canvas del proyecto](https://superdesign.dev/teams/8e22fdf1-c847-4485-a20c-dd877eb35305/projects/70972c38-b053-432e-93c4-2558f13d812d).
- [Draft v2](https://p.superdesign.dev/draft/79772ad2-4ae7-4e2e-95ea-df98539404e3).
- `.superdesign/drafts/building-solar-v2.html`: export local del diseño estático. La web React es la implementación interactiva.
- `.superdesign/resume.json`: IDs y contexto de generación; el código final contiene ajustes posteriores, así que corresponde refresh incremental al iterar diseño.
- `docs/reference/building-explorer.png`: captura de la web funcionando.

## Validación de este milestone

Antes del checkpoint, sin cambios posteriores de código funcional:

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`: aprobados.
- **36 pruebas**: 24 web + 6 geometry + 6 schema. Incluyen referencia NREL independiente, ejes geográficos, polígonos/patios y transiciones DST modernas e históricas.
- Navegador: día/noche, estaciones, hora por teclado/slider, reproducción/pausa, planta/perspectiva, capas, ida/vuelta al interior y ancho móvil 390 px. Consola sin errores en la sesión final.
- Blender: render EEVEE y vector solar verificados; los cuatro archivos `.blend` se volvieron a abrir en un proceso independiente al guardar este checkpoint.
- Build emite aviso de bundle Three.js grande (~1,45 MB minificado / 405 KB gzip); no es un fallo. Puede aparecer el warning upstream `THREE.Clock` en desarrollo.

## Precisión y pendientes acordados

El usuario aceptó continuar con geometría aproximada y buscar más información oficial después. No bloquear la iteración por esa falta de detalle.

- Confirmado: relación 1/1bis/1ter con RNB `4V8DBS2K1JDV`, parcela AL 0538 (1.192 m²), huella ≈476 m², altura alero 15,5 m y rango de techo 0,8 m; BDNB indica 1956 y 30 viviendas para el grupo. Fuentes declaran incertidumbre métrica.
- Estimado: ritmo/medidas de ventanas, materiales, pendientes y formas de techos. Terreno web plano; cotas IGN preservadas como metadatos. Vecinos simplificados. Blender y web tienen representaciones de cubiertas distintas; no asumir mallas idénticas.
- Contexto de unos 95 m; sin relieve completo, vegetación ni horizonte lejano. Sombras para comparación visual, no irradiancia, iluminancia ni informe certificado.
- **No sabemos qué ventanas/planta exactas corresponden al T3.** No atribuir automáticamente DPE o fachadas al departamento. El plano interior todavía necesita orientación/alineación real.
- Próximas iteraciones posibles: mejorar fachadas y detalle de vecinos; localizar el departamento y sus ventanas; después conectar este motor solar a las aberturas del interior.

## Retomar

1. Leer este checkpoint, `docs/research/building-research.md` y `docs/model/solar-model.md`.
2. `pnpm dev` y abrir `http://127.0.0.1:5173/#building`.
3. Para editar en Blender, abrir `assets/blender/t3-building-context.blend`; inspeccionar antes de modificar y preservar trabajo vivo. `pnpm blender:check` comprueba MCP.
4. Para regenerar la escena guardada desde su instantánea:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/blender/assemble_building.py -- --render
```

5. Mantener arquitectura/geodatos paramétricos como fuente de verdad y ejecutar checks apropiados después de cambios.

Las 10 capturas `ChatGPT Image 26 Sept 2026, ...png` originales permanecen en Descargas; no se incorporaron al repositorio ni se redistribuyeron como texturas. Los medios originales del interior siguen también fuera del repo. No se hizo deploy ni push remoto en este checkpoint.

## Separación de la iteración siguiente

Al guardar este checkpoint, el chat «Agregar departamento y sol 3D» ya estaba modificando el mismo checkout. El commit conserva exactamente el código de la vista de edificio previamente terminada y validada, recuperado desde la instantánea previa a esa iteración. Los cambios nuevos del interior se dejaron intactos en el árbol de trabajo y no forman parte de este milestone. No usar un reset del checkout para consultar esta versión mientras esa iteración siga en curso.
