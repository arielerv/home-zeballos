import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { CASA_FRONTAGE_FOOTPRINTS, CASA_CONTEXT_EXTENT, toCasaLocal } from '../src/data/casa-neighborhood.ts'

test('requested station retains the checked OSM contour without inventing adjoining homes', () => {
  const source = JSON.parse(readFileSync(new URL('../../../assets/reference/casa-frontage-context-source.json', import.meta.url), 'utf8'))
  assert.equal(CASA_FRONTAGE_FOOTPRINTS.length, 1)
  const station = CASA_FRONTAGE_FOOTPRINTS[0]
  assert.equal(station.osmId, 472802802)
  assert.equal(station.kind, 'canopy')
  assert.deepEqual(station.coordinates, source.coordinates)
  assert.deepEqual(station.coordinates[0], station.coordinates.at(-1))
  assert.equal(source.residentialNeighbor, false)
  assert.equal(source.localFit.calibrated, false)
  assert.equal(source.height, null)
  const points = station.coordinates.map(([lat, lon]) => toCasaLocal(lat, lon))
  assert.ok(points.flat().every(Number.isFinite))
  assert.ok(points.every(point => Math.hypot(...point) <= CASA_CONTEXT_EXTENT))
})