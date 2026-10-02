import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ARCHITECTURE_SNAPSHOT_VERSION,
  ArchitectureSnapshotSchema,
  VersionedProjectSnapshotSchema,
} from '@t3-designer/scene-schema'

const architecture = {
  schemaVersion: 1,
  id: 'synthetic-project',
  name: 'Synthetic architecture snapshot fixture',
  units: 'meters',
  coordinateSystem: { plan: 'local-xz', vertical: 'y-up' },
  evidence: [{ id: 'source', kind: 'manual_note', label: 'Synthetic test source' }],
  assumptions: [],
  site: {
    id: 'site', name: 'Synthetic site', features: [],
    provenance: { kind: 'user_defined', confidence: 1, evidenceIds: ['source'] },
  },
  targetBuildingId: 'building',
  buildings: [{
    id: 'building', name: 'Finished synthetic house',
    levels: [{
      id: 'ground', name: 'Ground level', index: 0, elevation: 0,
      provenance: { kind: 'observed', confidence: 1, evidenceIds: ['source'] },
    }],
    rooms: [], walls: [], openings: [], slabs: [], roofs: [],
    provenance: { kind: 'observed', confidence: 1, evidenceIds: ['source'] },
  }],
  renovations: [],
} as const

test('architecture snapshot v2 stores the canonical project without T3 apartment fields', () => {
  const snapshot = { schemaVersion: ARCHITECTURE_SNAPSHOT_VERSION, architecture }
  assert.deepEqual(ArchitectureSnapshotSchema.parse(JSON.parse(JSON.stringify(snapshot))), snapshot)
  assert.deepEqual(VersionedProjectSnapshotSchema.parse(snapshot), snapshot)
  assert.equal('apartment' in snapshot, false)
})

test('versioned snapshot reader rejects unsupported versions and invalid architecture', () => {
  assert.equal(VersionedProjectSnapshotSchema.safeParse({ schemaVersion: 3, architecture }).success, false)
  assert.equal(VersionedProjectSnapshotSchema.safeParse({ schemaVersion: 2, architecture: { ...architecture, units: 'feet' } }).success, false)
})
