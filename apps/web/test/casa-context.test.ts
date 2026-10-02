import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import draft from '../../../assets/reference/casa-context-trace-draft.json' with { type: 'json' }
import { applyAffine, fitAffine, fitRoofTranslation, clipToLot, signedArea, type Point2 } from '../src/lib/context-trace.ts'
import { CASA_CONTEXT_OUTLINES, CASA_CONTEXT_REPORT, cartoToDisplay } from '../src/data/casa-context.ts'

test('affine fitter recovers a known transform and rejects underdetermined controls', () => {
  const transform = [[2, -.5], [.4, 3], [10, -7]] as [Point2, Point2, Point2]
  const sources: Point2[] = [[100, 100], [300, 100], [200, 450], [420, 520]]
  const fit = fitAffine(sources.map(source => ({ source, target: applyAffine(transform, source) })))
  assert.ok(fit.max < 1e-10)
  const expected = applyAffine(transform, [150, 200])
  assert.ok(Math.hypot(...applyAffine(fit.coefficients, [150, 200]).map((v, i) => v - expected[i])) < 1e-10)
  assert.throws(() => fitAffine([]))
  assert.throws(() => fitAffine([0, 1, 2].map(x => ({ source: [x, x], target: [x, x] }))))
})

test('context uses all seven unchanged GLB boundary corners with reported nonmetric residuals', () => {
  const image = readFileSync(new URL('../../../assets/reference/carto.webp', import.meta.url))
  assert.equal(createHash('sha256').update(image).digest('hex'), draft.cartography.sha256)
  const buffer = readFileSync(new URL('../public/models/casa-2071/casa-2071-maqueta-revision.glb', import.meta.url))
  const length = buffer.readUInt32LE(12)
  const gltf = JSON.parse(buffer.toString('utf8', 20, 20 + length))
  const node = gltf.nodes.find((n: { name: string }) => n.name === draft.siteObject)
  assert.equal(node.translation, undefined)
  const accessor = gltf.accessors[gltf.meshes[node.mesh].primitives[0].attributes.POSITION]
  const view = gltf.bufferViews[accessor.bufferView]
  const offset = 28 + length + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  assert.equal(accessor.count, draft.siteControlPoints.length)
  draft.siteControlPoints.forEach((control, i) => {
    const stride = view.byteStride ?? 12
    assert.ok(Math.abs(control.model[0] - buffer.readFloatLE(offset + i * stride)) < 1e-10)
    assert.ok(Math.abs(control.model[1] - buffer.readFloatLE(offset + i * stride + 8)) < 1e-10)
  })
  assert.equal(CASA_CONTEXT_REPORT.metricCalibrated, false)
  assert.ok(CASA_CONTEXT_REPORT.cartoFit.max < .4)
  assert.ok(CASA_CONTEXT_REPORT.cartoFit.rms > .2)
  assert.ok(CASA_CONTEXT_REPORT.aerialFit.max > 10, 'do not pretend visually inferred aerial anchors are exact')
  assert.ok(CASA_CONTEXT_REPORT.units.includes('NOT calibrated'))
})

test('context renders four separate cadastral lots and observed roof drafts including the confirmed corner neighbor', () => {
  assert.equal(CASA_CONTEXT_OUTLINES.filter(o => o.kind === 'parcel').length, 4)
  assert.equal(CASA_CONTEXT_OUTLINES.filter(o => o.kind === 'roof').length, 4)
  assert.deepEqual(CASA_CONTEXT_OUTLINES.filter(o => o.kind === 'street').map(o => o.label), ['Zeballos', 'Dardo Rocha', 'La Cautiva'])
  assert.ok(CASA_CONTEXT_OUTLINES.some(o => o.id === 'lot-9-roof'))
  assert.ok(CASA_CONTEXT_OUTLINES.every(o => o.points.length >= 3 && o.points.flat().every(Number.isFinite) && Math.abs(signedArea(o.points)) > 1))
  for (const report of CASA_CONTEXT_REPORT.roofs) {
    assert.ok(report.retainedFraction >= .98)
    assert.ok(report.acceptedPreview)
    if (report.id === 'lot-9') {
      assert.ok(report.rawRetainedFraction < .9, 'raw fit issue must remain recorded')
      assert.ok(report.translationLengthPixels > 18)
      assert.ok(report.translationLengthPixels <= CASA_CONTEXT_REPORT.placementEnvelopePixels)
    } else assert.equal(report.translationLengthPixels, 0)
  }
  const shared = draft.neighbors.find(n => n.id === 'lot-11')!.parcel.find(p => p[0] === 922 && p[1] === 907)!
  assert.deepEqual(cartoToDisplay(shared as Point2), cartoToDisplay(draft.siteControlPoints[0].carto as Point2))
})

test('roof containment check rejects a bad registration instead of generating parcel-shaped roofs', () => {
  const lot: Point2[] = [[0, 0], [10, 0], [10, 10], [0, 10]]
  const roof: Point2[] = [[-5, 2], [5, 2], [5, 8], [-5, 8]]
  assert.equal(Math.abs(signedArea(clipToLot(roof, lot)) / signedArea(roof)), .5)
  assert.deepEqual(roof[0], [-5, 2], 'checking must not mutate the traced roof')
})

test('minimum roof translation is rigid, bounded and detects impossible fits', () => {
  const identity = [[1, 0], [0, 1], [0, 0]] as [Point2, Point2, Point2]
  const lot: Point2[] = [[0, 0], [10, 0], [10, 10], [0, 10]]
  const roof: Point2[] = [[-2, 2], [5, 2], [5, 8], [-2, 8]]
  const shift = fitRoofTranslation(roof, lot, identity)!
  assert.ok(Math.abs(shift[0] - 2) < 1e-10 && Math.abs(shift[1]) < 1e-10)
  const moved = roof.map(p => [p[0] + shift[0], p[1] + shift[1]] as Point2)
  assert.equal(signedArea(moved), signedArea(roof), 'no stretching or parcel-shaped replacement')
  assert.equal(fitRoofTranslation([[-2, 0], [12, 0], [12, 8], [-2, 8]], lot, identity), null)
})