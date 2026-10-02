# Edificio Colbert, Quimper: fuentes y geometría

Consulta realizada el **26 de septiembre de 2026**. Los datos usados en la aplicación están en `apps/web/src/data/building-site.ts`; son un extracto local reproducible y no requieren APIs al mover el reloj solar.

## Identificación confirmada por fuentes públicas

La dirección del usuario, **1 ter Rue Jean-Baptiste Colbert, Quimper**, se resuelve oficialmente como **1ter impasse Jean-Baptiste Colbert, 29000 Quimper**. El punto de dirección BAN es `longitude=-4.106796`, `latitude=48.001415`, ID `29232_2090_00001_ter`. El punto de dirección cae al lado del edificio y no debe usarse para identificar una parcela por intersección puntual.

El [RNB, ficha API del edificio 4V8DBS2K1JDV](https://rnb-api.beta.gouv.fr/api/alpha/buildings/4V8DBS2K1JDV/) enlaza expresamente las direcciones **1, 1 bis y 1 ter** con el mismo edificio, su polígono, y el identificador IGN `BATIMENT0000000316727839`. Esto confirma el vínculo, más allá de elegir simplemente la huella más cercana al resultado del geocodificador.

Fuentes reproducibles:

- [Geocodificador oficial IGN/BAN](https://data.geopf.fr/geocodage/search?q=1%20ter%20rue%20Jean%20Baptiste%20Colbert%20Quimper&limit=5).
- [Parcela catastral AL 0538, API Carto IGN](https://apicarto.ign.fr/api/cadastre/parcelle?code_insee=29232&section=AL&numero=0538).
- [BDNB: consulta por el identificador de dirección](https://api.bdnb.io/v1/bdnb/donnees/batiment_groupe_complet/adresse?cle_interop_adr=eq.29232_2090_00001_ter&limit=5).

| Dato | Valor observado | Procedencia / interpretación |
| --- | --- | --- |
| Parcela | `29232000AL0538` | Catastro, sección AL, número 0538 |
| Superficie de parcela | 1.192 m² | `contenance`, no superficie del departamento |
| Edificio IGN | `BATIMENT0000000316727839` | BD TOPO; vínculo RNB confirmado |
| Edificio RNB | `4V8DBS2K1JDV` | Estado `constructed` |
| Grupo BDNB actual | `bdnb-bg-W5NJ-PFRZ-ME3E` | Consulta por dirección; agrupa 1 / 1 bis / 1 ter |
| Año de construcción | 1956 | BDNB `annee_construction`; IGN tiene `date_d_apparition=1956-01-01` |
| Viviendas en el grupo | 30 | BDNB e IGN, no identificación del T3 |
| Huella BDNB | 475 m² | `surface_emprise_sol`; superficie aproximada de toda la huella |
| Altura IGN | 15,5 m | `hauteur`; hasta el contorno/alero, no necesariamente la cumbrera |
| Altura media BDNB | 16 m | `hauteur_mean`, otra representación del mismo orden de magnitud |
| Nivel mínimo / máximo del suelo | 8,8 / 8,8 m | Altitudes fuente IGN, no altura del edificio |
| Nivel mínimo / máximo del techo | 24,3 / 25,1 m | Altitudes fuente IGN |
| Rango vertical del techo | 0,8 m | Diferencia calculada; **no determina la forma de la cubierta** |
| Campo IGN `nombre_d_etages` | 5 | Conservado literalmente; no identifica plantas ni ventanas del departamento |
| Precisión planimétrica declarada | 3 m | Método: `BDParcellaire recalée` |
| Precisión altimétrica declarada | 2,5 m | Método: `Interpolation bâti BDTopo` |
| Material de muros en BDNB | `BETON - PIERRE` | Clasificación del edificio/grupo |
| Material de techo en BDNB | `ZINC ALUMINIUM` | Clasificación del edificio/grupo |

La ficha IGN fue creada en 2012 y su campo `date_modification` es 2019-03-25. Consultar el servicio en 2026 no significa que el edificio haya sido medido de nuevo en 2026. Los decimales del archivo son precisión numérica para renderizar; no mejoran la precisión real de varios metros declarada por la fuente.

## Extracto de edificios y calles

Se recuperaron **132 huellas** en un rectángulo alrededor del sitio mediante el servicio oficial WFS; se conservaron **99 edificios**, incluido el principal, con algún vértice a menos de 95 m del origen. Todos los edificios incluidos tienen un valor `hauteur` en IGN. Se conservan los identificadores y la precisión de cada uno. No se usó OpenStreetMap para la geometría de esta versión.

[Consulta WFS BD TOPO de edificios](https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=BDTOPO_V3%3Abatiment&OUTPUTFORMAT=application%2Fjson&COUNT=200&BBOX=48.0004%2C-4.1083%2C48.0024%2C-4.1053%2Curn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A4326).

[Consulta WFS BD TOPO de tramos de vía](https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=BDTOPO_V3%3Atroncon_de_route&OUTPUTFORMAT=application%2Fjson&COUNT=150&BBOX=48.0004%2C-4.1083%2C48.0024%2C-4.1053%2Curn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A4326).

[Documentación oficial del servicio WFS](https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/diffusion/wfs/).

El orden de la BBOX de estas consultas es **latitud,longitud** porque se solicita `urn:ogc:def:crs:EPSG::4326`; las coordenadas devueltas en GeoJSON son **longitud,latitud**. No invertirlas al regenerar.

Las calles proceden de los ejes IGN y del atributo `largeur_de_chaussee`. Se recortaron los segmentos a un cuadrado de 220 × 220 m para que un tramo largo no exceda la escena. Quedaron **27 segmentos**. Senderos sin anchura declarada usan **1,8 m estimados**. Entre las vías están impasse Jean-Baptiste Colbert, Rue Henri de Bournazel, Rue de Verdun y Allée Samuel de Champlain. No se deducen bordillos, plazas de estacionamiento ni acabados de estos ejes.

## Coordenadas para Three.js y el sol

El origen es el punto interior RNB del edificio: **48.00129436934608 N, -4.106788129193569 E**. No es el mismo punto que la dirección BAN. La diferencia es pequeña, pero mantener una referencia explícita evita mover las huellas respecto de su parcela.

- `x`: este verdadero, en metros.
- `z`: sur verdadero, en metros; norte es `-z`.
- `y`: altura, en metros.
- `groundAltitude`: valor de altitud fuente; `groundOffset = groundAltitude - 8.8`.
- `footprint`: anillo abierto `[x,z][]`, sin repetir el último vértice; `holes` conserva patios interiores.
- La proyección es tangente local WGS84 mediante radios de curvatura a la latitud del origen, adecuada para esta extensión corta. No se usa el norte de cuadrícula Lambert, que introduciría una rotación respecto del norte verdadero.
- Escalas locales usadas: **74.623,4868 m/grado de longitud**, **111.190,3478 m/grado de latitud**.

Para un azimut astronómico `A` medido desde el norte hacia el este y una elevación `h`, el vector unitario hacia el sol en la escena es `[sin(A) cos(h), sin(h), -cos(A) cos(h)]`. Las entradas de fecha/hora deben interpretarse en **Europe/Paris**, con cambio CET/CEST según el día, independientemente de la zona horaria del navegador. El objeto de datos expone `BUILDING_SITE.timeZone`.

## Informes públicos y límites de inferencia

La [BDNB](https://api.bdnb.io/v1/bdnb/donnees/batiment_groupe_complet/adresse?cle_interop_adr=eq.29232_2090_00001_ter&limit=5) devuelve varios DPE asociados al grupo. No hay prueba de qué DPE corresponde al departamento del usuario. Por eso no se atribuye al T3 una clase energética, orientación de ventanas o composición del muro a partir de esos registros. El ID BDNB histórico que devuelve RNB (`bdnb-bc-JHL1-J71F-D2CT`, versión 2023_01) ya no resuelve como grupo actual; la consulta por dirección sí devuelve el grupo actual de arriba.

El [portal municipal de PLU y Site Patrimonial Remarquable](https://www.quimper.bzh/1211-plan-local-d-urbanisme.htm) ofrece planos, reglamento y memoria urbanística. Sirve como ruta oficial para ampliar la investigación; en esta entrega no se ha extraído de allí un plano arquitectónico de este edificio ni se afirma una zonificación concreta. No apareció un informe público verificado que localice las ventanas del T3.

**Confirmado por los datos:** emplazamiento, relación dirección–edificio, parcela, contorno cartográfico, alturas fuente, volumen vecino y ejes de calles.

**Reconstrucción visual / estimación:** ventanas y puertas, balcones, color exacto, forma y pendientes del techo, árboles, bordillos y materiales representados. Las capturas aportadas por el usuario ayudan a reconstruir el aspecto, pero no aportan una medición topográfica.

**Pendiente para el interior:** localizar la entrada y el departamento exactos, asociar sus ventanas a fachadas, medir retranqueos y jambas, y alinear el plano interior con el norte verdadero. El modelo solar actual permite una comparación visual de sombras; no es un informe certificado de soleamiento ni una simulación de iluminancia o rendimiento energético. Para precisión en el horizonte y sombras largas haría falta terreno/relieve y obstáculos más allá del recorte.

## Licencias y atribución

Atribución prevista en la vista: **© IGN · BD TOPO / BAN · DGFiP cadastre · RNB — Licence Ouverte 2.0**. Mantener fuente y fecha al redistribuir el extracto y señalar las transformaciones efectuadas.

- [IGN: política de datos abiertos y BD TOPO](https://www.ign.fr/institut/des-donnees-et-logiciels-ouverts-au-service-de-la-nation).
- [RNB: reglas de gobernanza y Licence Ouverte 2.0](https://rnb.beta.gouv.fr/gouvernance-donnee).
- [Portal oficial de datos catastrales abiertos](https://cadastre.data.gouv.fr/).

Google Earth/Maps se utiliza como referencia visual aportada por el usuario. No se descargan, extraen ni redistribuyen sus mallas o texturas en la aplicación.

## Simplificaciones de la vista web

La geometría web comienza en **y = 0** para todos los edificios. El plano receptor
está apenas por debajo, en y = −0,04 m, para evitar conflictos visuales. Las
altitudes IGN y `groundOffset` siguen disponibles como metadatos, pero no se
aplican a una superficie de terreno porque todavía no se dispone de un modelo
continuo del suelo.

La cubierta del edificio principal es una reconstrucción de poca pendiente: alero
**15,5 m** y subida **0,8 m**, hasta **16,3 m** sobre el plano base. Los edificios
vecinos simples reciben una cubierta a dos aguas inferida, alineada con su borde
más largo, con subida limitada a **5 m** aunque el rango altimétrico fuente sea
mayor. Los polígonos complejos de más de 18 vértices y los que contienen patios
mantienen una cubierta plana inferida para no tapar sus huecos. Los rangos de
0,4 m o menos se dibujan como una cubierta fina. Estas decisiones producen una
silueta utilizable sin afirmar que IGN haya proporcionado pendientes o cumbreras.
El Blender conserva una representación volumétrica más sencilla de los vecinos;
no debe asumirse que ambas cubiertas visuales sean idénticas.

El recorte de contexto selecciona huellas con algún vértice dentro de **95 m** del
origen y conserva el polígono completo, por lo que algunos edificios grandes se
extienden más lejos. Los ejes de calle están recortados a ±110 m. La cámara de
sombras se ajusta a las huellas cargadas y al suelo receptor aproximadamente entre
**−165 y +165 m**, para mantener visibles las sombras largas de invierno cerca
del edificio. El plano de suelo que se ve más allá no implica que allí se hayan
cargado nuevos obstáculos. No es una reconstrucción del horizonte completo: las
sombras que dependerían de terreno, árboles o edificios fuera del extracto no se
pueden considerar verificadas, especialmente cerca del amanecer y el atardecer.

## Escena Blender editable

`assets/blender/t3-building-context.blend` contiene la nueva escena **T3 Building Sun**, con 99 edificios, 27 tramos de calle, parcela, norte verdadero, cámara, materiales y aperturas de fachada estimadas en una colección separada. Se creó en Blender 5.2.2 LTS mediante el MCP local y se guardó como copia: la escena previa `Scene` con Cube/Light/Camera y la ruta del archivo de trabajo se conservaron. El archivo incluye un bloque de texto con estas limitaciones y el código generador.

El eje Blender es **X este, Y norte, Z arriba**. El terreno de presentación se mantiene plano; las cotas IGN originales siguen como propiedades editables por edificio. Los vecinos se muestran a su altura de contorno/alero, con una cubierta neutra de 0,16 m. No se eleva toda una huella hasta su máximo puntual de cubierta: por ejemplo, `BATIMENT0000000331968680` tiene `hauteur=10.1` pero un rango de techo de `22.3` m. Ese máximo podría representar un elemento puntual alto y extruirlo sobre toda la huella produciría sombras ficticias. Se conserva el valor como metadato para reconstruirlo posteriormente.

`docs/snapshots/building-site.json` es una instantánea del mismo `building-site.ts` y de las posiciones calculadas por `apps/web/src/lib/solar.ts`. Contiene 96 muestras del **26/09/2026**, cada 15 minutos, en `Europe/Paris`. La línea de tiempo anima posición, orientación y energía del sol: fotograma 1 = 00:00; fotograma 61 = 15:00. La escena abre en ese ejemplo de las 15:00 (13:00 UTC): elevación **39,328°**, azimut **196,982°**. Cambiar de fotograma explora ese día; para otra fecha hay que regenerar las muestras. No hay un formulario de calendario Blender añadido en esta entrega.

Regeneración de la escena desde la instantánea:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/blender/assemble_building.py -- --render
```

El generador crea una escena nueva en cada ejecución, preserva las anteriores y regenera su copia `.blend` y el PNG cuando se pasa `--render`. La instantánea se obtiene importando `BUILDING_SITE`, `SITE_BUILDINGS`, `SITE_ROADS` y `SITE_PARCEL` desde el archivo TypeScript, y `getSolarPosition` / `localDateTimeToDate` desde `solar.ts`, sin volver a consultar APIs externas.

Validación realizada: 99 objetos con identificador de edificio, 639 objetos totales en la escena nueva; alineación del vector de sol Blender con el modelo web ≈1,000000; energía solar nocturna 0; luz diurna activa; escena previa intacta. Se revisaron la captura del viewport y `assets/blender/t3-building-context.png`, renderizado con EEVEE en un proceso separado para no bloquear el Blender abierto del usuario.
