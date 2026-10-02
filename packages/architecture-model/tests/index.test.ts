import assert from 'node:assert/strict'
import test from 'node:test'
import { ArchitecturalProjectSchema, EvidenceSchema, type ArchitecturalProject } from '@t3-designer/architecture-model'

function fixture(): ArchitecturalProject {
  const provenance: ArchitecturalProject['site']['provenance'] = {
    kind: 'user_defined', confidence: 1, evidenceIds: ['evidence-user'],
  }
  return {
    schemaVersion: 1,
    id: 'project-fixture',
    name: 'Finished-house fixture (synthetic)',
    units: 'meters',
    coordinateSystem: { plan: 'local-xz', vertical: 'y-up' },
    evidence: [
      { id: 'evidence-user', kind: 'manual_note', label: 'Synthetic test evidence' },
      { id: 'evidence-plan', kind: 'image', label: 'Uncalibrated tentative plan', uri: 'fixture/plan.png' },
    ],
    site: {
      id: 'site-fixture',
      name: 'Synthetic property; dimensions are test-only',
      propertyBoundary: [[0, 0], [20, 0], [20, 30], [0, 30]],
      cadastralReference: 'synthetic-test-only',
      features: [
        { id: 'site-patio', kind: 'patio', name: 'Patio', designState: 'retained', provenance },
        { id: 'site-yard', kind: 'yard', name: 'Yard', designState: 'retained', provenance },
        { id: 'site-pool', kind: 'pool', name: 'Pool', designState: 'retained', provenance },
      ],
      provenance,
    },
    assumptions: [],
    targetBuildingId: 'finished-house',
    buildings: [{
      id: 'finished-house',
      name: 'Single finished house model',
      footprint: [[2, 2], [18, 2], [18, 18], [2, 18]],
      levels: [{ id: 'ground', name: 'Ground level', index: 0, elevation: 0, provenance }],
      rooms: [
        { id: 'room-retained', levelId: 'ground', name: 'Retained room', polygon: [[2, 2], [8, 2], [8, 8], [2, 8]], designState: 'retained', provenance },
        { id: 'room-remodeled', levelId: 'ground', name: 'Remodeled room', polygon: [[8, 2], [12, 2], [12, 6], [8, 6]], designState: 'modified', provenance },
        { id: 'room-new', levelId: 'ground', name: 'New room', polygon: [[12, 2], [16, 2], [16, 6], [12, 6]], designState: 'new', provenance },
      ],
      walls: [
        { id: 'wall-retained', levelId: 'ground', from: [2, 2], to: [8, 2], thickness: 0.15, height: 2.8, kind: 'exterior', designState: 'retained', provenance },
        { id: 'wall-modified', levelId: 'ground', from: [8, 2], to: [8, 6], thickness: 0.1, height: 2.8, kind: 'interior', designState: 'modified', provenance },
      ],
      openings: [],
      slabs: [],
      roofs: [],
      provenance,
    }],
    renovations: [{
      id: 'renovation-scope',
      name: 'Tentative change scope',
      status: 'tentative',
      finishedBuildingId: 'finished-house',
      scopeImageRegion: {
        evidenceId: 'evidence-plan', imageWidth: 1200, imageHeight: 900,
        polygonPixels: [[100, 100], [800, 100], [800, 700], [100, 700]],
      },
      affectedElementIds: ['room-remodeled', 'room-new', 'wall-modified'],
      preservedSiteFeatureIds: ['site-patio', 'site-yard', 'site-pool'],
      provenance: { kind: 'user_defined', confidence: 1, evidenceIds: ['evidence-user', 'evidence-plan'] },
    }],
  }
}

test('project represents one finished house with retained and changed elements plus unchanged site', () => {
  const project = fixture()
  const parsed = ArchitecturalProjectSchema.parse(JSON.parse(JSON.stringify(project)))
  assert.deepEqual(parsed, project)
  assert.equal(parsed.buildings.length, 1)
  assert.deepEqual(parsed.buildings[0].rooms.map(room => room.designState), ['retained', 'modified', 'new'])
  assert.deepEqual(parsed.renovations[0].preservedSiteFeatureIds, ['site-patio', 'site-yard', 'site-pool'])
})

test('tentative plan region stays in source-image pixels and invalid references are rejected', () => {
  const project = fixture()
  project.renovations[0].scopeImageRegion!.polygonPixels[1][0] = 1201
  project.renovations[0].affectedElementIds.push('missing-room')
  assert.equal(ArchitecturalProjectSchema.safeParse(project).success, false)
})

test('image calibration binds pixel controls to metric house-plan controls', () => {
  const evidence = {
    id: 'evidence-calibration', kind: 'image', label: 'Calibrated test image',
    calibration: {
      knownLengthMeters: 2,
      fromImage: [10, 20], toImage: [30, 20],
      fromWorld: [4, 5], toWorld: [6, 5],
    },
  }
  assert.equal(EvidenceSchema.safeParse(evidence).success, true)
  assert.equal(EvidenceSchema.safeParse({
    ...evidence,
    calibration: { ...evidence.calibration, toWorld: [7, 5] },
  }).success, false)
})
