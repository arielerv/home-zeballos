import type { SolarPosition } from './solar.ts'

/** Same east/up/south convention as BuildingScene; distance is display-only. */
export function solarRenderPosition(direction: SolarPosition['direction'], distance: number): [number, number, number] {
  return [direction[0] * distance, direction[1] * distance, direction[2] * distance]
}