import assert from 'node:assert/strict'
import test from 'node:test'
import { getCasaDossier } from '../src/data/casa-dossier.ts'
import plan from '../../../assets/reference/casa-tentative-plan-data.json' with { type: 'json' }

test('Casa dossier uses the tentative plan as the design source and retains all printed areas verbatim', () => {
  assert.match(plan.designAuthority['userCorrection2026-10-02'], /dining and kitchen are one connected room with no dividing wall; the separately labeled Living room remains a distinct room/)
  for (const locale of ['es', 'en'] as const) {
    const dossier = getCasaDossier(locale)
    const roomFacts = dossier.facts.filter(fact => fact.roomId)
    assert.equal(roomFacts.length, 11)
    assert.deepEqual(roomFacts.map(fact => Number(fact.numericValue)), plan.rooms.map(room => room.printedAreaM2))
    assert.ok(roomFacts.every(fact => fact.sourceIds.includes('tentative-plan')))
    assert.ok(dossier.sources.some(source => source.id === 'prior-blender' && source.description.includes(locale === 'es' ? 'anterior' : 'prior')))
    const draftTrace = dossier.sources.find(source => source.id === 'tentative-trace-blender')
    assert.equal(draftTrace?.localUrl, '/models/casa-2071/casa-2071-tentative-trace-review.blend')
    assert.ok(draftTrace?.description.includes(locale === 'es' ? 'no una casa 3D' : 'not a 3D house'))
  }
})

test('Casa dossier records four session-only Street View observations without exposing photos', () => {
  const dossier = getCasaDossier('es')
  const streetViews = dossier.observations.filter(item => item.sourceIds.includes('street-view'))
  assert.equal(streetViews.length, 4)
  assert.ok(streetViews.some(item => item.title.includes('Frente comercial')))
  assert.ok(streetViews.every(item => !/lindero confirmado|medida verificada/i.test(item.description)))
  assert.equal(dossier.sources.find(source => source.id === 'facade-photos')?.localUrl, undefined)
  assert.ok(dossier.sources.find(source => source.id === 'facade-photos')?.description.includes('No se publican'))
  assert.equal(dossier.sources.find(source => source.id === 'street-view')?.localUrl, undefined)
})

test('Casa dossier source references resolve and its menu-preserving section data is bilingual', () => {
  for (const locale of ['es', 'en'] as const) {
    const dossier = getCasaDossier(locale)
    const sourceIds = new Set(dossier.sources.map(source => source.id))
    for (const fact of dossier.facts) for (const sourceId of fact.sourceIds) assert.ok(sourceIds.has(sourceId), `${locale}:${fact.id}:${sourceId}`)
    for (const question of dossier.questions) for (const sourceId of question.sourceIds) assert.ok(sourceIds.has(sourceId), `${locale}:${question.id}:${sourceId}`)
    assert.equal(Object.keys(dossier.presentation.sections).length, 6)
    assert.equal(dossier.presentation.stats.length, 4)
  }
})
