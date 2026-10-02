import assert from 'node:assert/strict'
import test from 'node:test'
import { workspaceFromHash } from '../src/lib/workspace-view.ts'

test('workspace links support the three existing views and default to apartment', () => {
  assert.equal(workspaceFromHash('#proposal'), 'apartment')
  assert.equal(workspaceFromHash('#documentation'), 'documentation')
  assert.equal(workspaceFromHash('#apartment'), 'apartment')
  assert.equal(workspaceFromHash('#building'), 'building')
  assert.equal(workspaceFromHash(''), 'apartment')
  assert.equal(workspaceFromHash('#unknown'), 'apartment')
})
