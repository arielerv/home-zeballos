import assert from 'node:assert/strict'
import test from 'node:test'
import { planToBlender, planToSite, roomPlanGeometry, siteToPlan, wallPlanGeometry } from '../src/index.ts'

test('architectural room and wall metrics reuse the shared plan-geometry operations', () => {
  const room = roomPlanGeometry({ polygon: [[0, 0], [4, 0], [4, 3], [0, 3]] })
  assert.equal(room.areaM2, 12)
  assert.deepEqual(room.centroid, [2, 1.5])
  assert.deepEqual(room.bounds.center, [2, 1.5])

  const wall = wallPlanGeometry({ from: [0, 0], to: [3, 4] })
  assert.equal(wall.lengthM, 5)
  assert.deepEqual(wall.center, [1.5, 2])
})

test('plan placement transforms are reversible and map site south to Blender negative Z', () => {
  const placement = { origin: [12, 30] as const, rotationRadians: Math.PI / 2 }
  const local = [2, 3] as const
  const site = planToSite(local, placement)
  assert.deepEqual(site.map(value => Math.round(value * 1e9) / 1e9), [15, 28])
  const restored = siteToPlan(site, placement)
  restored.forEach((value, index) => assert.ok(Math.abs(value - local[index]) < 1e-9))
  assert.deepEqual(planToBlender(local, 1.4, placement), [15, 1.4, -28])
  assert.throws(() => planToSite([Number.NaN, 0], placement), /finite/)
})
