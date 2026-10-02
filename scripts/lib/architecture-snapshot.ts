import {
  ARCHITECTURE_SNAPSHOT_VERSION,
  ArchitectureSnapshotSchema,
  type ArchitectureSnapshot,
} from '@t3-designer/scene-schema'
import { ArchitecturalProjectSchema } from '@t3-designer/architecture-model'

/** Deterministically wrap validated canonical architecture data in snapshot v2. */
export function buildArchitectureSnapshot(input: unknown): ArchitectureSnapshot {
  const architecture = ArchitecturalProjectSchema.parse(input)
  return ArchitectureSnapshotSchema.parse({
    schemaVersion: ARCHITECTURE_SNAPSHOT_VERSION,
    architecture,
  })
}
