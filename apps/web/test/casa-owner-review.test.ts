import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const root = new URL('../../../', import.meta.url)
const read = (path: string) => readFileSync(new URL(path, root), 'utf8')
const corrections = JSON.parse(read('assets/reference/casa-owner-corrections-review.json'))
const roofs = JSON.parse(read('assets/reference/casa-roof-review-draft.json'))
const buffer = readFileSync(new URL('apps/web/public/models/casa-2071/casa-2071-maqueta-revision.glb', root))
const gltf = JSON.parse(buffer.toString('utf8', 20, 20 + buffer.readUInt32LE(12)))

test('owner correction supersedes single-storey assumption and authorizes only preview publication without inventing pool angle', () => {
  assert.match(corrections.publication, /OWNER AUTHORIZED/)
  assert.match(corrections.publication, /NOT architectural BIM release/)
  assert.match(corrections.publicationHistory, /no commit, push or deployment/)
  assert.match(corrections.upperFloor.supersedes, /one-storey/)
  assert.equal(corrections.upperFloor.rooms.length, 3)
  assert.match(corrections.upperFloor.status, /3D-placement-blocked/)
  assert.equal(corrections.pool.rotationDegrees, null)
  for (const path of ['constitutions.md', 'docs/workflows/casa-bim.md', 'specs/001-initial-imports/TASKS.md']) {
    assert.ok(read(path).includes('casa-owner-corrections-review.json') || read(path).includes('casa-owner-corrections-review.json'.split('/').pop()!))
  }
})

test('only the small point-1 annex shell is demolished; garage and all parcel walls remain', () => {
  const site = gltf.nodes.filter((node: { extras?: { casaCollection?: string } }) => node.extras?.casaCollection === '01 - Terreno y jardin')
  assert.ok(!site.some((node: { name: string }) => node.name.startsWith('Exterior 11 ')))
  for (const name of ['GARAJE / SALIDA', ...Array.from({ length: 3 }, (_, i) => `Exterior 10 ${i}`), ...corrections.protected]) {
    assert.ok(site.some((node: { name: string }) => node.name === name), name)
  }
})

test('every pitched roof uses corrected side-to-side ridge direction and source stair is traced without made-up storeys', () => {
  assert.ok(roofs.volumes.every((roof: { ridgeAxis: string }) => roof.ridgeAxis === 'x'))
  const roofNodes = gltf.nodes.filter((node: { name?: string }) => node.name?.startsWith('Tejas ·'))
  assert.equal(roofs.volumes.length, 3)
  assert.equal(roofNodes.length, 6)
  assert.ok(roofNodes.every((node: { extras: { ridge_axis_plan: string } }) => node.extras.ridge_axis_plan === 'x'))
  const stairNodes = gltf.nodes.filter((node: { name?: string }) => node.name?.startsWith('Escalera exterior ·'))
  assert.equal(stairNodes.length, 4 + corrections.stair.edgeStationsPixels.length)
  assert.ok(stairNodes.every((node: { extras: { review_status: string } }) => /symbolic/.test(node.extras.review_status)))
})

test('three continuous gables share one red/brown material and left upper mass hides with cutaway', () => {
  const [left, centre, right] = roofs.volumes
  assert.equal(left.storeys, 2)
  for (const level of ['eaveDisplay', 'ridgeDisplay', 'wallTopDisplay']) {
    assert.ok(left[level] > right[level] && right[level] > centre[level], level)
  }
  const roofNodes = gltf.nodes.filter((node: { name?: string }) => node.name?.startsWith('Tejas ·'))
  const materialIds = roofNodes.flatMap((node: { mesh: number }) => gltf.meshes[node.mesh].primitives.map((primitive: { material: number }) => primitive.material))
  assert.equal(new Set(materialIds).size, 1)
  const mat = gltf.materials[materialIds[0]]
  assert.equal(mat.name, roofs.material.name)
  for (const node of roofNodes) {
    assert.deepEqual(JSON.parse(node.extras.continuous_span_source_pixels), [122, 837])
    assert.match(node.extras.height_units, /NOT metres/)
    const position = gltf.accessors[gltf.meshes[node.mesh].primitives[0].attributes.POSITION]
    const body = roofs.volumes.find((volume: { id: string }) => volume.id === node.extras.roof_body_id)
    // Export uses Y-up: inspect actual emitted vertical coordinates, not metadata alone.
    assert.ok(Math.abs(position.max[1] - body.ridgeDisplay) < 1e-5)
    assert.ok(Math.abs(position.min[1] - body.eaveDisplay) < 1e-5)
    const view = gltf.bufferViews[position.bufferView]
    const binaryStart = 20 + buffer.readUInt32LE(12) + 8
    const start = binaryStart + (view.byteOffset ?? 0) + (position.byteOffset ?? 0)
    const crest: number[][] = []
    for (let i = 0; i < position.count; i++) {
      const offset = start + i * (view.byteStride ?? 12)
      const point = [0, 4, 8].map(component => buffer.readFloatLE(offset + component))
      if (Math.abs(point[1] - body.ridgeDisplay) < 1e-5) crest.push(point)
    }
    assert.ok(crest.length >= 2)
    // Ridge runs along source/world X, not along the front/patio Z direction.
    assert.ok(Math.max(...crest.map(p => p[0])) - Math.min(...crest.map(p => p[0])) > 1)
    assert.ok(Math.max(...crest.map(p => p[2])) - Math.min(...crest.map(p => p[2])) < 1e-5)
  }
  const upper = gltf.nodes.filter((node: { extras?: { casaCollection?: string } }) => node.extras?.casaCollection === '08 - Planta alta envolvente de revision')
  assert.equal(upper.length, 1 + left.footprintPixels.length)
  assert.ok(upper.every((node: { extras: { height_units: string } }) => /NOT metres/.test(node.extras.height_units)))
  assert.match(read('apps/web/src/components/CasaModelViewer.tsx'), /08 - Planta alta envolvente de revision'[\s\S]*?object.visible = !cutaway && view !== 'plan'/)
})

test('wall removals and black additions are source registered, not an old hardcoded wall list', () => {
  const generator = read('scripts/blender/create_casa_review_model.py')
  assert.match(generator, /wall_segments = corrections\["wallSegmentsPixels"\]/)
  assert.doesNotMatch(generator, /wall_segments = \[/)
  const segments = corrections.wallSegmentsPixels as number[][][]
  const has = (a: number[], b: number[]) => segments.some(segment => JSON.stringify(segment) === JSON.stringify([a, b]))
  assert.ok(!has([163, 470], [318, 470]))
  assert.ok(!has([369, 741], [489, 741]))
  assert.ok(!has([850, 701], [1140, 701]))
  assert.ok(has([607, 278], [730, 278]))
  assert.ok(has([369, 837], [540, 837]))
  assert.ok(has([850, 837], [1140, 837]))
})

test('every unchanged site object preserves prior review vertex/index bytes and transforms', () => {
  const backup = new URL('artifacts/casa-before-owner-wall-review/casa-2071-maqueta-revision.glb', root)
  if (!existsSync(backup)) return // Local comparison artifact is intentionally not published.
  const originalBuffer = readFileSync(backup)
  const original = JSON.parse(originalBuffer.toString('utf8', 20, 20 + originalBuffer.readUInt32LE(12)))
  const meshBytes = (data: Buffer, model: typeof gltf, meshIndex: number) => {
    const binaryStart = 20 + data.readUInt32LE(12) + 8
    return model.meshes[meshIndex].primitives.map((primitive: { attributes: Record<string, number>; indices?: number }) => {
      // Normals may differ by float rounding when Blender reevaluates curves;
      // POSITION/index bytes are the actual unchanged geometric contract.
      const ids = [primitive.attributes.POSITION, primitive.indices].filter((id): id is number => id !== undefined)
      return ids.map(id => {
        const accessor = model.accessors[id]
        const view = model.bufferViews[accessor.bufferView]
        const components = ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 } as Record<string, number>)[accessor.type]
        const bytes = ({ 5121: 1, 5123: 2, 5125: 4, 5126: 4 } as Record<number, number>)[accessor.componentType]
        const start = binaryStart + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
        return createHash('sha256').update(data.subarray(start, start + accessor.count * components * bytes)).digest('hex')
      })
    })
  }
  for (const oldNode of original.nodes.filter((node: { extras?: { casaCollection?: string }; name: string }) => node.extras?.casaCollection === '01 - Terreno y jardin' && !node.name.startsWith('Exterior 11 '))) {
    const current = gltf.nodes.find((node: { name: string }) => node.name === oldNode.name)
    assert.ok(current, oldNode.name)
    for (const field of ['translation', 'rotation', 'scale']) assert.deepEqual(current[field], oldNode[field], `${oldNode.name}: ${field}`)
    assert.deepEqual(meshBytes(buffer, gltf, current.mesh), meshBytes(originalBuffer, original, oldNode.mesh), oldNode.name)
  }
})