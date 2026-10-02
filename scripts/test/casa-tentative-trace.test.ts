import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const trace = JSON.parse(readFileSync(`${root}/assets/reference/casa-tentative-trace-draft.json`, 'utf8')) as {
  source: { path: string; sha256: string; widthPixels: number; heightPixels: number }
  status: string
  coordinateSystem: string
  metricCalibration: string
  proposedCalibrationBaseline: { pixelDistance: number; measuredLengthMetres: number | null; modelUse: string }
  'scaleResearch2026-10-02': { cartography: { visibleLot10ZeballosFrontageMetres: number; correspondingEndpointsOnCleanHouseImage: null }; status: string }
  rooms: Array<{ id: string; printedAreaM2: number; polygonPixels: number[][] }>
  limitations: string[]
}

test('Casa Blender trace remains an editable pixel-space draft until reviewed and calibrated', () => {
  assert.equal(trace.status, 'draft-unreviewed')
  assert.equal(trace.coordinateSystem, 'source-image-pixels-origin-top-left')
  assert.equal(trace.metricCalibration, 'blocked-no-reviewed-control-points-or-reliable-length')
  assert.equal(trace.proposedCalibrationBaseline.pixelDistance, 887)
  assert.equal(trace.proposedCalibrationBaseline.measuredLengthMetres, null)
  assert.equal(trace.proposedCalibrationBaseline.modelUse, 'blocked')
  assert.equal(trace['scaleResearch2026-10-02'].cartography.visibleLot10ZeballosFrontageMetres, 15)
  assert.equal(trace['scaleResearch2026-10-02'].cartography.correspondingEndpointsOnCleanHouseImage, null)
  assert.match(trace['scaleResearch2026-10-02'].status, /hypothesis-only/)
  assert.equal(trace.source.widthPixels, 1158)
  assert.equal(trace.source.heightPixels, 852)
  assert.equal(trace.rooms.length, 11)
  assert.equal(new Set(trace.rooms.map(room => room.id)).size, 11)
  for (const room of trace.rooms) {
    assert.ok(room.polygonPixels.length >= 3, `${room.id} should be a polygon trace`)
    assert.ok(room.printedAreaM2 > 0)
    assert.ok(room.polygonPixels.every(([x, y]) => x >= 0 && x <= trace.source.widthPixels && y >= 0 && y <= trace.source.heightPixels), `${room.id} stays on the source image`)
    const twiceArea = room.polygonPixels.reduce((sum, point, index) => {
      const next = room.polygonPixels[(index + 1) % room.polygonPixels.length]
      return sum + point[0] * next[1] - next[0] * point[1]
    }, 0)
    assert.ok(Math.abs(twiceArea) > 1, `${room.id} encloses a visible area`)
  }
  assert.ok(trace.limitations.some(item => item.includes('approximate visual traces')))
})

test('Casa Blender trace and render artifacts are generated separately from the prior source model', () => {
  assert.ok(existsSync(`${root}/assets/blender/casa-2071-tentative-trace-review.blend`))
  assert.ok(existsSync(`${root}/assets/blender/casa-2071-tentative-trace-review.png`))
  assert.ok(existsSync(`${root}/${trace.source.path}`))
  assert.equal(trace.source.path, 'assets/reference/casa-2071-planta-limpia.png')
  assert.equal(trace.source.sha256, '5c75336ffeb97e040d19bd99febce18909814563bb51bd4feb5ce993770c7aac')
})

test('the clean plan replaces the marked raster in both published plan views', () => {
  const source = JSON.parse(readFileSync(`${root}/assets/reference/casa-tentative-plan-data.json`, 'utf8')) as {
    source: { path: string; supersedes: { path: string; status: string }; sha256: string }
  }
  assert.equal(source.source.path, trace.source.path)
  assert.equal(source.source.sha256, trace.source.sha256)
  assert.equal(source.source.supersedes.status, 'archived-only-not-design-authority')
  assert.ok(existsSync(`${root}/${source.source.supersedes.path}`), 'keep old raster as historical evidence')
  for (const component of ['CasaTentativePlanViewer.tsx', 'DossierExplorer.tsx']) {
    const code = readFileSync(`${root}/apps/web/src/components/${component}`, 'utf8')
    assert.ok(code.includes('casa-2071-planta-limpia.png'), `${component} uses the clean image`)
    assert.ok(!code.includes('planos tentativa.jpeg'), `${component} must not display the marked image`)
  }
})
