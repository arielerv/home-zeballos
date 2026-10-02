import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import draft from '../../../assets/reference/casa-context-trace-draft.json' with { type: 'json' }
import { applyAffine, fitAffine, fitRoofTranslation, clipToLot, frontageStrip, isSimplePolygon, offsetFrontage, signedArea, type Point2 } from '../src/lib/context-trace.ts'
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

test('context separates cadastral lots from eight source-reviewed roof bodies including the corner neighbor', () => {
  assert.equal(CASA_CONTEXT_OUTLINES.filter(o => o.kind === 'parcel').length, 4)
  assert.equal(CASA_CONTEXT_OUTLINES.filter(o => o.kind === 'roof').length, 8)
  assert.deepEqual(CASA_CONTEXT_OUTLINES.filter(o => o.kind === 'street').map(o => o.label), ['Zeballos', 'Dardo Rocha', 'La Cautiva'])
  assert.ok(CASA_CONTEXT_OUTLINES.some(o => o.id === 'lot-9-roof-front'))
  assert.ok(!CASA_CONTEXT_OUTLINES.some(o => o.id === 'lot-9-roof-rear'), 'uncertain rear attribution is not silently filled')
  assert.ok(CASA_CONTEXT_OUTLINES.every(o => o.points.length >= 3 && o.points.flat().every(Number.isFinite) && Math.abs(signedArea(o.points)) > 1))
  for (const report of CASA_CONTEXT_REPORT.roofs) {
    assert.ok(report.retainedFraction >= .98)
    assert.ok(report.acceptedPreview)
    if (report.id === 'lot-9') {
      assert.ok(report.rawRetainedFraction < .9, 'raw fit issue must remain recorded')
      assert.ok(report.translationLengthPixels > 18)
      assert.ok(report.translationLengthPixels <= CASA_CONTEXT_REPORT.placementEnvelopePixels)
    } else if (report.id === 'lot-7') {
      assert.ok(report.rawRetainedFraction < .98, 'notched roof has a reported registration discrepancy')
      assert.ok(report.translationLengthPixels > 5 && report.translationLengthPixels < 6)
    } else assert.equal(report.translationLengthPixels, 0)
    assert.equal(report.translationUnits, 'original aerial pixels')
    assert.equal(report.footprintVerified, false)
  }
  const shared = draft.neighbors.find(n => n.id === 'lot-11')!.parcel.find(p => p[0] === 922 && p[1] === 907)!
  assert.deepEqual(cartoToDisplay(shared as Point2), cartoToDisplay(draft.siteControlPoints[0].carto as Point2))
})

test('shared source-frontage offsets produce constant-width strips without corner gaps or spikes', () => {
  const path: Point2[] = [[0, 0], [100, 0], [100, 100]]
  const curb = offsetFrontage(path, 10), outer = offsetFrontage(path, 30)
  assert.deepEqual(curb, [[0, 10], [90, 10], [90, 100]])
  assert.deepEqual(outer, [[0, 30], [70, 30], [70, 100]])
  assert.ok(isSimplePolygon(frontageStrip(path, curb)))
  const a = frontageStrip(curb, outer, 0, 1), b = frontageStrip(curb, outer, 1, 2)
  assert.deepEqual(a[1], b[0])
  assert.deepEqual(a[2], b[3])
  assert.throws(() => offsetFrontage([[0, 0], [0, 0]], 10))
  assert.throws(() => offsetFrontage([[0, 0], [100, 0], [0, 0]], 10))
  assert.throws(() => frontageStrip(path, curb, 1, 1))
  assert.equal(isSimplePolygon([[0, 0], [10, 10], [0, 10], [10, 0]]), false)
})

test('calzadas, continuous sidewalk and median are distinct simple contours outside cadastral parcels', () => {
  const roads = CASA_CONTEXT_OUTLINES.filter(o => ['street', 'avenue-lane', 'sidewalk', 'median'].includes(o.kind))
  assert.equal(roads.length, 6)
  assert.equal(roads.filter(o => o.kind === 'sidewalk').length, 1)
  assert.ok(roads.every(o => isSimplePolygon(o.points)))
  const sidewalk = roads.find(o => o.kind === 'sidewalk')!
  draft.roadReview.blockFrontage.forEach((p, i) => assert.deepEqual(sidewalk.points[i], cartoToDisplay(p as Point2)))
  for (const outline of roads) {
    for (const parcel of CASA_CONTEXT_OUTLINES.filter(o => o.kind === 'parcel')) {
      assert.ok(Math.abs(signedArea(clipToLot(outline.points, parcel.points))) < 1e-7, `${outline.id} must not paint asphalt/sidewalk over ${parcel.id}`)
    }
  }
  assert.ok(CASA_CONTEXT_REPORT.roads.sidewalkWidth > 30 && CASA_CONTEXT_REPORT.roads.sidewalkWidth < 45)
  assert.ok(CASA_CONTEXT_REPORT.roads.roadWidth > 110 && CASA_CONTEXT_REPORT.roads.roadWidth < 140)
  assert.ok(CASA_CONTEXT_REPORT.roads.units.includes('NOT metres'))
  // Old cadastral public-space polygons must no longer be used as asphalt.
  for (const street of draft.streets) {
    const legacy = Math.abs(signedArea(street.polygon as Point2[]))
    const actual = CASA_CONTEXT_OUTLINES.find(o => o.id === street.id)!
    const sourceArea = Math.abs(signedArea(actual.points)) / Math.abs(CASA_CONTEXT_REPORT.cartoFit.coefficients[0][0] * CASA_CONTEXT_REPORT.cartoFit.coefficients[1][1] - CASA_CONTEXT_REPORT.cartoFit.coefficients[0][1] * CASA_CONTEXT_REPORT.cartoFit.coefficients[1][0])
    assert.ok(sourceArea < legacy * .7, `${street.id}: full public corridor was not a carriageway`)
  }
})

test('neighbor roof groups retain observed shapes, relative body positions and source-pixel displacement units', () => {
  for (const neighbor of draft.neighbors) {
    const report = CASA_CONTEXT_REPORT.roofs.find(r => r.id === neighbor.id)!
    assert.equal(report.bodyCount, neighbor.roofBodies.length)
    for (const body of neighbor.roofBodies) {
      const outline = CASA_CONTEXT_OUTLINES.find(o => o.id === `${neighbor.id}-roof-${body.id}`)!
      assert.ok(isSimplePolygon(outline.points))
      body.polygon.forEach(([x, y], i) => {
        const carto = applyAffine(CASA_CONTEXT_REPORT.aerialFit.coefficients, [x + report.sourcePixelTranslation[0], y + report.sourcePixelTranslation[1]])
        assert.deepEqual(outline.points[i], cartoToDisplay(carto), 'composition and whole-cluster shift must agree at every source vertex')
      })
    }
  }
  // A nontrivial affine proves the solver shift is in SOURCE units, not Carto.
  const scale: [Point2, Point2, Point2] = [[3, 0], [0, 2], [0, 0]]
  const shift = fitRoofTranslation([[-1, 1], [2, 1], [2, 3], [-1, 3]], [[0, 0], [12, 0], [12, 8], [0, 8]], scale)!
  assert.ok(Math.abs(shift[0] - 1) < 1e-8 && Math.abs(shift[1]) < 1e-8)
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