import { CASA_SITE_ORIGIN } from './casa-neighborhood.ts'

/**
 * Astronomical study location only. The address point is interpolated from OSM,
 * not a surveyed parcel coordinate; do not use it to place the Blender model,
 * orient windows, or cast shadows onto the house.
 */
export const CASA_SOLAR_SITE = {
  latitude: CASA_SITE_ORIGIN.latitude,
  longitude: CASA_SITE_ORIGIN.longitude,
  timeZone: 'America/Argentina/Buenos_Aires',
  label: 'Av. Estanislao Zeballos 2071 · Castelar',
  coordinateSource: CASA_SITE_ORIGIN.addressSource,
  coordinateAccuracy: 'interpolated address point; not a survey',
  northOrientationVerified: false,
} as const
