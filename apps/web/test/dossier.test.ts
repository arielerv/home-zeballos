import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { dossierFacts, dossierObservations, dossierQuestions, dossierRoomAreas, dossierSources } from '../src/data/dossier.ts'
import { t3Apartment } from '../src/data/t3.ts'

const facts = new Map(dossierFacts.map(fact => [fact.id, fact]))
const sources = new Map(dossierSources.map(source => [source.id, source]))

test('dossier evidence and open questions resolve to identifiable sources', () => {
  for (const collection of [dossierFacts, dossierSources, dossierQuestions, dossierObservations]) {
    assert.equal(new Set(collection.map(item => item.id)).size, collection.length, 'IDs must be unique within each collection')
  }
  for (const item of [...dossierFacts, ...dossierQuestions, ...dossierObservations]) {
    assert.ok(item.sourceIds.length > 0, `${item.id}: source required`)
    for (const id of item.sourceIds) assert.ok(sources.has(id), `${item.id}: missing source ${id}`)
  }
  for (const fact of dossierFacts) {
    assert.deepEqual(fact.sourceIds, [...new Set(fact.evidence.map(citation => citation.sourceId))])
    assert.ok(fact.evidence.every(citation => citation.locator.trim()), `${fact.id}: precise evidence locator required`)
    if (fact.status === 'official') {
      assert.ok(fact.sourceIds.every(id => sources.get(id)?.kind === 'public-record'), `${fact.id}: a guide or model cannot establish an official property record`)
      assert.notEqual(fact.scope, 'Departamento', `${fact.id}: public records have not identified the apartment`)
    }
  }
  for (const source of dossierSources) {
    if (source.localUrl) assert.ok(existsSync(new URL(`../public${source.localUrl}`, import.meta.url)), `${source.id}: local evidence must remain accessible`)
  }
})

test('reported apartment areas use the shared source values and retain the original-document gap', () => {
  assert.equal(dossierRoomAreas.length, t3Apartment.rooms.length)
  for (const room of t3Apartment.rooms) {
    const area = dossierRoomAreas.find(fact => fact.roomId === room.id)!
    assert.equal(area.numericValue, room.reportedArea)
    assert.equal(area.status, 'reported')
    assert.equal(area.review, 'original-pending')
    assert.equal(area.unit, 'm²')
  }
  const sum = dossierRoomAreas.reduce((total, fact) => total + fact.numericValue!, 0)
  assert.ok(Math.abs(sum - 49.18) < 1e-9)
  assert.equal(facts.get('apartment-carrez')?.numericValue, t3Apartment.metadata.reportedCarrezArea)
  assert.equal(facts.get('apartment-carrez')?.review, 'original-pending')
  assert.equal(facts.get('apartment-area-sum')?.status, 'derived')
  assert.equal(facts.get('apartment-area-sum')?.numericValue, sum)
  assert.equal(facts.get('balcony-area')?.numericValue, t3Apartment.balcony?.reportedArea)
  assert.equal(facts.get('basement-area')?.numericValue, t3Apartment.metadata.reportedBasementArea)
  for (const id of ['balcony-area', 'basement-area']) assert.match(facts.get(id)!.note, /Fuera de Carrez/)
})

test('the fourth-floor report and third-floor assumption remain a visible unresolved disagreement', () => {
  assert.equal(facts.get('floor-plan')?.value, '4e étage')
  assert.equal(facts.get('floor-plan')?.status, 'reported')
  assert.equal(facts.get('floor-model')?.value, '3.er piso estimado')
  assert.equal(facts.get('floor-model')?.status, 'estimated')
  for (const id of ['floor-plan', 'floor-model']) assert.equal(facts.get(id)?.review, 'disputed')
  const question = dossierQuestions.find(question => question.id === 'floor-discrepancy')!
  assert.ok(question.sourceIds.includes('plan') && question.sourceIds.includes('model'))
  assert.match(question.needed, /lote/)
  for (const id of ['floor-model', 'living-orientation', 'ceiling-height']) assert.equal(facts.get(id)?.status, 'estimated')
})

test('energy and parcel-context gaps do not invent an apartment diagnosis, consumption or risk conclusion', () => {
  const energy = dossierFacts.filter(fact => fact.section === 'energy')
  assert.ok(energy.length > 0)
  for (const fact of energy) {
    assert.equal(fact.status, 'pending')
    assert.equal(fact.review, 'pending')
    assert.equal(fact.numericValue, undefined)
    assert.equal(fact.scope, 'Departamento')
  }
  for (const id of ['risks', 'planning', 'legal-lots']) assert.equal(facts.get(id)?.status, 'pending')
  assert.match(facts.get('apartment-dpe')!.note, /Ninguna clase energética/)
  assert.match(facts.get('actual-energy-use')!.note, /convencional del DPE/)
})

test('key public facts match the archived response fields without mixing parcel, group and apartment', () => {
  const snapshot = JSON.parse(readFileSync(new URL('../public/dossier/official-sources-2026-09-27.json', import.meta.url), 'utf8'))
  const raw = (id: string) => snapshot.sources.find((source: { id: string }) => source.id === id).data
  assert.equal(facts.get('parcel-area')?.numericValue, raw('cadastre')[0].properties.contenance)
  assert.equal(facts.get('parcel-area')?.scope, 'Parcela')
  assert.equal(facts.get('building-footprint')?.numericValue, raw('bdnb')[0].surface_emprise_sol)
  assert.equal(facts.get('building-footprint')?.scope, 'Grupo BDNB')
  assert.equal(facts.get('construction-year')?.numericValue, raw('bdnb')[0].annee_construction)
  assert.equal(facts.get('dwelling-count')?.numericValue, raw('bdnb')[0].nb_log)
  assert.equal(facts.get('building-height')?.numericValue, raw('ign')[0].properties.hauteur)
  assert.equal(facts.get('building-storeys')?.numericValue, raw('ign')[0].properties.nombre_d_etages)
  assert.equal(facts.get('rnb-id')?.value, raw('rnb').rnb_id)
  assert.equal(facts.get('bdnb-group')?.value, raw('bdnb')[0].batiment_groupe_id)
  assert.equal(facts.get('wall-material')?.value, raw('bdnb')[0].mat_mur_txt)
  assert.equal(facts.get('roof-material')?.value, raw('bdnb')[0].mat_toit_txt)
  assert.equal(facts.get('ban-address-id')?.value, raw('ban')[0].properties.id)
  assert.ok(Math.abs(facts.get('roof-range')!.numericValue! - (raw('ign')[0].properties.altitude_maximale_toit - raw('ign')[0].properties.altitude_minimale_toit)) < 1e-9)
  assert.equal(facts.get('roof-range')?.status, 'derived')
})
