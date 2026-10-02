import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { buildArchitectureSnapshot } from './lib/architecture-snapshot.ts'

const args = process.argv.slice(2)
if (args[0] === '--') args.shift()

const { values } = parseArgs({ args, options: {
  input: { type: 'string', short: 'i' },
  output: { type: 'string', short: 'o' },
  check: { type: 'boolean', default: false },
  help: { type: 'boolean', short: 'h' },
} })

if (values.help) {
  console.log('Validate canonical architecture JSON and export a deterministic architecture snapshot v2.\n'
    + 'Options: --input project.json --output snapshot.json [--check]')
} else {
  try {
    if (!values.input?.trim()) throw new Error('--input must name a canonical architecture JSON file')
    if (!values.output?.trim()) throw new Error('--output must name the snapshot JSON file')
    const inputPath = resolve(values.input)
    const outputPath = resolve(values.output)
    if (inputPath === outputPath) throw new Error('--input and --output must be different files')
    const input = JSON.parse(readFileSync(inputPath, 'utf8')) as unknown
    const snapshot = buildArchitectureSnapshot(input)
    const expected = JSON.stringify(snapshot, null, 2) + '\n'
    if (values.check) {
      if (!existsSync(outputPath) || readFileSync(outputPath, 'utf8') !== expected) {
        throw new Error(`Snapshot is missing or stale: ${outputPath}. Re-run without --check to export.`)
      }
      console.log(`Verified architecture snapshot v${snapshot.schemaVersion}: ${outputPath}`)
    } else {
      mkdirSync(dirname(outputPath), { recursive: true })
      writeFileSync(outputPath, expected)
      console.log(`Exported architecture snapshot v${snapshot.schemaVersion}: ${outputPath}`)
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
