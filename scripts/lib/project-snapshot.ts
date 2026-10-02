import { segmentWall, wallLength, wallRotation } from '@t3-designer/geometry'
import { ProjectSnapshotSchema, PROJECT_SNAPSHOT_VERSION, SolarSnapshotSchema, type ProjectSnapshot } from '@t3-designer/scene-schema'
import { t3Apartment } from '../../apps/web/src/data/t3.ts'
import { assetCatalog, currentFixtures } from '../../apps/web/src/data/current-state.ts'
import { BUILDING_SITE, SITE_BUILDINGS, SITE_PARCEL, SITE_ROADS } from '../../apps/web/src/data/building-site.ts'
import { APARTMENT_PLACEMENT, splitTargetBuildingFootprint } from '../../apps/web/src/data/apartment-placement.ts'
import { getLocalDate, getLocalMinutes, getSolarDay, getSolarPosition, localDateTimeToDate } from '../../apps/web/src/lib/solar.ts'

export type SnapshotOptions = {
  date?: string
  minutes?: number
  disambiguation?: 'reject' | 'earlier' | 'later'
}
export const DEFAULT_SNAPSHOT_DATE = '2026-09-26'
export const DEFAULT_SNAPSHOT_MINUTES = 15 * 60

/** No wall-clock time, filesystem, browser state or Blender connection is read.
 * The same inputs always produce the same serialized payload. */
export function buildSolarSnapshot({ date = DEFAULT_SNAPSHOT_DATE, minutes = DEFAULT_SNAPSHOT_MINUTES, disambiguation = 'reject' }: SnapshotOptions = {}) {
  const { latitude, longitude, timeZone } = BUILDING_SITE
  const selected = localDateTimeToDate(date, minutes, timeZone, disambiguation)
  const day = getSolarDay(date, latitude, longitude, timeZone)
  const first = day.path[0].date.getTime()
  const samples = []
  // Walk real instants, preserving a missing/repeated civil hour. Do not assume
  // 96 frames or obtain instants by converting each local clock quarter-hour.
  for (let timestamp = first; getLocalDate(new Date(timestamp), timeZone) === date; timestamp += 15 * 60_000) {
    const instant = new Date(timestamp)
    const clockMinutes = getLocalMinutes(instant, timeZone)
    samples.push({
      frame: samples.length + 1,
      minutes: clockMinutes,
      localTime: `${String(Math.floor(clockMinutes / 60)).padStart(2, '0')}:${String(clockMinutes % 60).padStart(2, '0')}`,
      utc: instant.toISOString(),
      elapsedMinutes: (timestamp - first) / 60_000,
      ...getSolarPosition(instant, latitude, longitude),
    })
  }
  const nearest = samples.reduce((best, sample) =>
    Math.abs(Date.parse(sample.utc) - selected.getTime()) < Math.abs(Date.parse(best.utc) - selected.getTime()) ? sample : best)
  return SolarSnapshotSchema.parse({
    date, timeZone, source: 'apps/web/src/lib/solar.ts NOAA/Meeus',
    selected: { minutes, disambiguation, utc: selected.toISOString(), ...getSolarPosition(selected, latitude, longitude) },
    sampleIntervalMinutes: 15,
    // Compatibility for timeline adapters. Exact non-quarter-hour selection is
    // retained above; the default timeline frame is the closest existing sample.
    defaultFrame: nearest.frame,
    samples,
    sunrise: day.sunrise?.toISOString() ?? null,
    sunset: day.sunset?.toISOString() ?? null,
    solarNoon: day.solarNoon.toISOString(),
    daylightMinutes: day.daylightMinutes,
  })
}

/** Compatibility snapshot for the existing exterior Blender adapter. */
export function buildBuildingSnapshot(options: SnapshotOptions = {}) {
  return structuredClone({
    generatedAt: BUILDING_SITE.retrievedAt,
    coordinateSystem: 'x east / y up / z south, metres',
    site: BUILDING_SITE,
    buildings: SITE_BUILDINGS,
    roads: SITE_ROADS,
    parcel: SITE_PARCEL,
    solar: buildSolarSnapshot(options),
  })
}

export function buildProjectSnapshot(options: SnapshotOptions = {}): ProjectSnapshot {
  const walls = t3Apartment.walls.map(wall => {
    const length = wallLength(wall)
    const ux = (wall.to[0] - wall.from[0]) / length
    const uz = (wall.to[1] - wall.from[1]) / length
    const apertures = [...t3Apartment.doors, ...t3Apartment.windows].filter(opening => opening.wallId === wall.id)
    return {
      wallId: wall.id,
      solids: segmentWall(wall, apertures).map(segment => ({
        position: [
          wall.from[0] + ux * (segment.offset + segment.length / 2),
          segment.bottom + segment.height / 2,
          wall.from[1] + uz * (segment.offset + segment.length / 2),
        ],
        scale: [segment.length, segment.height, wall.thickness],
        // JSON has no distinct negative zero; keep the in-memory contract equal
        // to its persisted representation for axis-aligned walls as well.
        rotationY: wallRotation(wall) || 0,
      })),
    }
  })
  return ProjectSnapshotSchema.parse({
    schemaVersion: PROJECT_SNAPSHOT_VERSION,
    project: { id: 't3-designer', name: 'Quimper T3 · apartment and building solar study' },
    units: 'meters',
    coordinates: {
      apartment: 'local plan X/right,Y/up,Z/down', site: 'X/east,Y/up,Z/south', blender: 'X/east,Y/north,Z/up',
      siteToBlender: [['x', 1], ['z', -1], ['y', 1]],
    },
    apartment: t3Apartment,
    assets: assetCatalog.map(asset => ({ ...asset, repoPath: `apps/web/public${asset.url}` })),
    fixtures: currentFixtures,
    placement: APARTMENT_PLACEMENT,
    geometry: {
      walls,
      floor: { polygon: t3Apartment.perimeter, elevation: 0, thickness: .14 },
      ceiling: { polygon: t3Apartment.perimeter, elevation: APARTMENT_PLACEMENT.wallHeight, thickness: .18 },
      contextSections: {
        ...splitTargetBuildingFootprint(),
        belowTop: APARTMENT_PLACEMENT.floorElevation - .14,
        ceilingBase: APARTMENT_PLACEMENT.floorElevation + APARTMENT_PLACEMENT.wallHeight,
      },
    },
    site: BUILDING_SITE,
    buildings: SITE_BUILDINGS,
    roads: SITE_ROADS,
    parcel: SITE_PARCEL,
    solar: buildSolarSnapshot(options),
  })
}
