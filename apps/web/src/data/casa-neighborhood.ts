export type GeoreferencedFootprint = {
  id: string
  osmId: number
  label: string
  kind: 'commercial' | 'canopy'
  heightEstimate: number
  coordinates: Array<[latitude: number, longitude: number]>
}

/**
 * Nearby mapped building outlines from OpenStreetMap. Casa itself is not
 * georeferenced; the local placement below is an explicitly approximate fit
 * between its Zeballos label and OSM's interpolated 2071 address point.
 */
export const CASA_SITE_ORIGIN = {
  latitude: -34.6590594,
  longitude: -58.6354292,
  blenderX: 7.1505733,
  blenderZ: 0.9397896,
  streetAngleDegrees: 12,
  addressSource: 'https://www.openstreetmap.org/way/909042837',
} as const

/** Building footprints are copied from OSM ways and remain outline-only context. */
export const CASA_NEIGHBOR_FOOTPRINTS: GeoreferencedFootprint[] = [
  {
    id: 'osm-472802801',
    osmId: 472802801,
    label: 'Minimercado',
    kind: 'commercial',
    heightEstimate: 3.2,
    coordinates: [
      [-34.6592701, -58.6355048],
      [-34.6593319, -58.6355229],
      [-34.6594216, -58.6355488],
      [-34.6594647, -58.6355626],
      [-34.659475, -58.6355132],
      [-34.6593649, -58.6351337],
      [-34.6593381, -58.635154],
      [-34.6592701, -58.6355048],
    ],
  },
  {
    id: 'osm-472802802',
    osmId: 472802802,
    label: 'Estación de servicio · cubierta',
    kind: 'canopy',
    heightEstimate: 5.2,
    coordinates: [
      [-34.6593319, -58.6355229],
      [-34.6594216, -58.6355488],
      [-34.6594035, -58.6356415],
      [-34.6593237, -58.6360497],
      [-34.659234, -58.6360238],
      [-34.6593127, -58.6356213],
      [-34.6593319, -58.6355229],
    ],
  },
]

export function toCasaLocal(latitude: number, longitude: number): [number, number] {
  const earthRadius = 6_371_000
  const meanLatitude = (latitude + CASA_SITE_ORIGIN.latitude) * Math.PI / 360
  const east = (longitude - CASA_SITE_ORIGIN.longitude) * Math.PI / 180 * earthRadius * Math.cos(meanLatitude)
  const south = (CASA_SITE_ORIGIN.latitude - latitude) * Math.PI / 180 * earthRadius
  const angle = CASA_SITE_ORIGIN.streetAngleDegrees * Math.PI / 180
  const x = CASA_SITE_ORIGIN.blenderX + east * Math.cos(angle) + south * Math.sin(angle)
  const z = CASA_SITE_ORIGIN.blenderZ - east * Math.sin(angle) + south * Math.cos(angle)
  return [x, z]
}

/** Owner requested the station across the street, not a substitute for adjoining homes.
 * OSM way 472802802 v5 checked 2026-10-02. Local fit is historical/unreviewed;
 * display a ground contour only, never the unsupported heightEstimate.
 */
export const CASA_FRONTAGE_FOOTPRINTS = CASA_NEIGHBOR_FOOTPRINTS.filter(footprint => footprint.osmId === 472802802)
export const CASA_CONTEXT_EXTENT = Math.max(...CASA_FRONTAGE_FOOTPRINTS.flatMap(footprint =>
  footprint.coordinates.map(([latitude, longitude]) => Math.hypot(...toCasaLocal(latitude, longitude))),
))
