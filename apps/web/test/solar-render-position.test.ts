import assert from 'node:assert/strict'
import test from 'node:test'
import { getSolarDay, getSolarPosition, localDateTimeToDate } from '../src/lib/solar.ts'
import { solarRenderPosition } from '../src/lib/solar-render-position.ts'

test('sun marker, shadow light and path preserve the computed Castelar sky direction', () => {
  const latitude = -34.65906, longitude = -58.63543, zone = 'America/Argentina/Buenos_Aires'
  for (const date of ['2026-06-21', '2026-12-21']) {
    const samples = getSolarDay(date, latitude, longitude, zone).path
    const selected = [480, 720, 1020].map(minutes => getSolarPosition(localDateTimeToDate(date, minutes, zone), latitude, longitude))
    for (const point of [...samples, ...selected]) {
      for (const distance of [11.2, 23.5, 52]) {
        const position = solarRenderPosition(point.direction, distance)
        assert.ok(Math.abs(Math.hypot(...position) - distance) < 1e-10)
        position.forEach((coordinate, axis) => assert.ok(Math.abs(coordinate / distance - point.direction[axis]) < 1e-12))
        assert.ok(Math.abs(Math.asin(position[1] / distance) * 180 / Math.PI - point.altitude) < 1e-9)
      }
    }
  }
})