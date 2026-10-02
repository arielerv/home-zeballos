import assert from 'node:assert/strict'
import test from 'node:test'
import { ArchitecturalProjectSchema } from '@t3-designer/architecture-model'
import { validateArchitectureProject } from '../src/index.ts'

test('invalid architecture data returns deterministic structured error findings', () => {
  const first = validateArchitectureProject({ schemaVersion: 1, buildings: [] })
  const second = validateArchitectureProject({ schemaVersion: 1, buildings: [] })
  assert.equal(first.valid, false)
  assert.ok(first.findings.length > 0)
  assert.ok(first.findings.every(finding => finding.severity === 'error' && finding.code.startsWith('schema.')))
  assert.deepEqual(first.findings, second.findings)
})

test('valid projects report crossed polygons, overlapping openings, and missing evidence separately', () => {
  const evidence = { id: 'source', kind: 'manual_note', label: 'Synthetic test source' }
  const provenance = { kind: 'user_defined', confidence: 1, evidenceIds: ['source'] }
  const project = {
    schemaVersion: 1,
    id: 'project', name: 'Synthetic validation fixture', units: 'meters',
    coordinateSystem: { plan: 'local-xz', vertical: 'y-up' },
    evidence: [evidence, { id: 'plan', kind: 'image', label: 'Uncalibrated image' }], assumptions: [],
    site: {
      id: 'site', name: 'Synthetic site',
      propertyBoundary: [[0, 0], [10, 0], [10, 10], [0, 10]],
      features: [], provenance,
    },
    targetBuildingId: 'building',
    buildings: [{
      id: 'building', name: 'Synthetic building',
      levels: [{ id: 'ground', name: 'Ground', index: 0, elevation: 0, provenance }],
      rooms: [{
        id: 'crossed-room', levelId: 'ground', name: 'Crossed polygon',
        polygon: [[0, 0], [4, 4], [0, 4], [3, 0]],
        designState: 'retained',
        provenance: { ...provenance, evidenceIds: [] },
      }],
      walls: [{
        id: 'wall', levelId: 'ground', from: [0, 0], to: [10, 0],
        thickness: 0.2, height: 2.8, kind: 'exterior', designState: 'retained', provenance,
      }],
      openings: [
        { id: 'opening-a', levelId: 'ground', wallId: 'wall', kind: 'door', offset: 1, width: 2, height: 2, designState: 'retained', provenance },
        { id: 'opening-b', levelId: 'ground', wallId: 'wall', kind: 'window', offset: 2, width: 2, height: 1, sillHeight: 0.8, designState: 'retained', provenance },
        { id: 'opening-c', levelId: 'ground', wallId: 'wall', kind: 'window', offset: 1.5, width: 2, height: 0.5, sillHeight: 2.1, designState: 'retained', provenance },
      ],
      slabs: [], roofs: [], provenance,
    }],
    renovations: [{
      id: 'renovation', name: 'Tentative scope', status: 'tentative', finishedBuildingId: 'building',
      scopeImageRegion: { evidenceId: 'plan', imageWidth: 100, imageHeight: 100, polygonPixels: [[1, 1], [90, 1], [90, 90], [1, 90]] },
      affectedElementIds: [], preservedSiteFeatureIds: [], provenance,
    }],
  }

  const result = validateArchitectureProject(project)
  assert.equal(result.valid, false)
  assert.ok(result.findings.some(item => item.code === 'geometry.polygon_self_intersection' && item.category === 'geometry'))
  assert.ok(result.findings.some(item => item.code === 'geometry.openings_overlap' && item.category === 'geometry'))
  assert.ok(result.findings.filter(item => item.code === 'geometry.openings_overlap').every(item => !item.elementIds.includes('opening-c')))
  assert.ok(result.findings.some(item => item.code === 'evidence.missing_reference' && item.category === 'evidence'))
  assert.ok(result.findings.some(item => item.code === 'evidence.image_uncalibrated' && item.category === 'evidence'))

  const missingLevel = structuredClone(project)
  missingLevel.buildings[0].rooms[0].levelId = 'missing-level'
  assert.equal(ArchitecturalProjectSchema.safeParse(missingLevel).success, false)
  const openingOutsideWall = structuredClone(project)
  openingOutsideWall.buildings[0].openings[0].offset = 9
  assert.equal(ArchitecturalProjectSchema.safeParse(openingOutsideWall).success, false)
  const backtrackingPolygon = structuredClone(project)
  backtrackingPolygon.buildings[0].rooms[0].polygon = [[0, 0], [4, 0], [2, 0], [2, 3]]
  const backtrackingResult = validateArchitectureProject(backtrackingPolygon)
  assert.ok(backtrackingResult.findings.some(item => item.code === 'geometry.polygon_self_intersection'))
})

test('every room must connect through modeled doors to an exterior exit', () => {
  const project = connectedRoomsFixture()
  const valid = validateArchitectureProject(project)
  assert.equal(valid.valid, true)
  assert.ok(!valid.findings.some(item => item.code === 'room.door_access_missing' || item.code === 'room.egress_path_missing'))

  project.buildings[0].openings = []
  const blocked = validateArchitectureProject(project)
  assert.equal(blocked.valid, false)
  assert.equal(blocked.findings.filter(item => item.code === 'room.door_access_missing').length, 2)
  assert.ok(blocked.findings.some(item => item.code === 'room.egress_path_missing'))
})

test('same-level room overlap blocks geometry while reported-area differences remain explicit findings', () => {
  const project = connectedRoomsFixture()
  project.buildings[0].rooms[0].reportedAreaM2 = 15
  project.buildings[0].rooms[1].polygon = [[3, 1], [7, 1], [7, 5], [3, 5]]
  const result = validateArchitectureProject(project)
  assert.equal(result.valid, false)
  assert.ok(result.findings.some(item => item.code === 'geometry.rooms_overlap'))
  assert.ok(result.findings.some(item => item.code === 'room.area_source_mismatch' && item.elementIds.includes('room-a')))
})

function connectedRoomsFixture() {
  const provenance = { kind: 'user_defined', confidence: 1, evidenceIds: ['source'] }
  return {
    schemaVersion: 1,
    id: 'project', name: 'Synthetic access fixture', units: 'meters',
    coordinateSystem: { plan: 'local-xz', vertical: 'y-up' },
    evidence: [{ id: 'source', kind: 'manual_note', label: 'Synthetic reviewed fixture' }],
    assumptions: [],
    site: { id: 'site', name: 'Site', features: [], provenance },
    targetBuildingId: 'building',
    buildings: [{
      id: 'building', name: 'Building',
      levels: [{ id: 'ground', name: 'Ground', index: 0, elevation: 0, provenance }],
      rooms: [
        { id: 'room-a', levelId: 'ground', name: 'Room A', polygon: [[0, 0], [4, 0], [4, 4], [0, 4]], reportedAreaM2: 16, designState: 'retained', provenance },
        { id: 'room-b', levelId: 'ground', name: 'Room B', polygon: [[4, 0], [8, 0], [8, 4], [4, 4]], designState: 'retained', provenance },
      ],
      walls: [
        { id: 'exterior-west', levelId: 'ground', from: [0, 4], to: [0, 0], thickness: 0.2, height: 2.8, kind: 'exterior', designState: 'retained', provenance },
        { id: 'shared', levelId: 'ground', from: [4, 0], to: [4, 4], thickness: 0.2, height: 2.8, kind: 'interior', designState: 'retained', provenance },
      ],
      openings: [
        { id: 'exit', levelId: 'ground', wallId: 'exterior-west', kind: 'door', offset: 1, width: 1, height: 2, designState: 'retained', provenance },
        { id: 'between-rooms', levelId: 'ground', wallId: 'shared', kind: 'door', offset: 1, width: 1, height: 2, designState: 'retained', provenance },
      ],
      slabs: [], roofs: [], provenance,
    }],
    renovations: [],
  }
}
