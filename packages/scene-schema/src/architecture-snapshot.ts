import { z } from 'zod'
import { ArchitecturalProjectSchema } from '@t3-designer/architecture-model'
import { ProjectSnapshotSchema } from './project.ts'

/** Version 2 stores the canonical architectural project without T3-only apartment fields. */
export const ARCHITECTURE_SNAPSHOT_VERSION = 2

export const ArchitectureSnapshotSchema = z.object({
  schemaVersion: z.literal(ARCHITECTURE_SNAPSHOT_VERSION),
  architecture: ArchitecturalProjectSchema,
})

/** Read contract for persisted project snapshots; v1 remains unchanged. */
export const VersionedProjectSnapshotSchema = z.discriminatedUnion('schemaVersion', [
  ProjectSnapshotSchema,
  ArchitectureSnapshotSchema,
])

export type ArchitectureSnapshot = z.infer<typeof ArchitectureSnapshotSchema>
export type VersionedProjectSnapshot = z.infer<typeof VersionedProjectSnapshotSchema>
