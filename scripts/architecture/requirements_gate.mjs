import { readFile } from 'node:fs/promises'
import { access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const manifestPath = fileURLToPath(new URL('./capabilities.json', import.meta.url))
const rootPath = resolve(new URL('../..', import.meta.url).pathname)
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const validStatuses = new Set(['implemented', 'partial', 'blocked'])
const errors = []
const ids = new Set()

if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.capabilities) || manifest.capabilities.length === 0) {
  errors.push('Capability manifest must use schemaVersion 1 and contain capabilities.')
}

for (const capability of manifest.capabilities ?? []) {
  if (!capability.id || ids.has(capability.id)) errors.push(`Capability id is missing or duplicated: ${capability.id ?? '(empty)'}`)
  ids.add(capability.id)
  if (capability.required !== true) errors.push(`${capability.id}: every capability must remain required: true.`)
  if (!validStatuses.has(capability.status)) errors.push(`${capability.id}: status must be implemented, partial, or blocked.`)
  if (!capability.implementation?.trim()) errors.push(`${capability.id}: describe actual implementation/status.`)
  if (!Array.isArray(capability.dependencies) || capability.dependencies.length === 0) errors.push(`${capability.id}: name its required dependencies/tools.`)
  if (!Array.isArray(capability.gates) || capability.gates.length === 0) errors.push(`${capability.id}: name at least one release gate.`)
  const proof = capability.releaseProof
  if (proof !== undefined && (!Array.isArray(proof.implementationFiles) || !Array.isArray(proof.testFiles) || !Array.isArray(proof.fixtures))) {
    errors.push(`${capability.id}: releaseProof must list implementationFiles, testFiles, and fixtures.`)
  }
  if (capability.status === 'implemented') {
    if (!proof || proof.implementationFiles.length === 0 || proof.testFiles.length === 0 || proof.fixtures.length === 0) {
      errors.push(`${capability.id}: implemented requires source, passing-test, and fixture evidence.`)
    } else {
      for (const evidencePath of [...proof.implementationFiles, ...proof.testFiles, ...proof.fixtures]) {
        try {
          await access(resolve(rootPath, evidencePath))
        } catch {
          errors.push(`${capability.id}: release evidence does not exist: ${evidencePath}`)
        }
      }
    }
  }
}

const releaseMode = process.argv.includes('--release')
if (releaseMode) {
  for (const capability of manifest.capabilities ?? []) {
    if (capability.status !== 'implemented') errors.push(`${capability.id}: release blocked (${capability.status}).`)
  }
}

console.log(`Architecture capability readiness: ${errors.length ? 'INVALID' : releaseMode ? 'PASS' : 'BLOCKED FOR RELEASE'}`)
for (const capability of manifest.capabilities ?? []) {
  console.log(`${capability.required ? '[REQUIRED]' : '[OPTIONAL]'} ${capability.id}: ${capability.status}`)
}
if (errors.length) {
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else if (!releaseMode) {
  console.log('The manifest is valid. Pending capabilities remain hard release blockers; use --release only for release validation.')
}
