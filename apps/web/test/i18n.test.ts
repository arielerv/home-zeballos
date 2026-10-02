import assert from 'node:assert/strict'
import test from 'node:test'
import { compassBearing, dateFormatter, detectLocale, numberFormatter, parsePreference, resolveLocale, supportedLocales } from '../src/i18n/locale.ts'

test('only Spanish and English are available UI locales', () => {
  assert.deepEqual(supportedLocales, ['es', 'en'])
})

test('browser negotiation respects order, regions and scripts', () => {
  for (const [languages, expected] of [
    [['es-AR'], 'es'], [['fr-CA'], 'en'], [['en-US'], 'en'],
    [['de-DE', 'fr-CH', 'es'], 'es'], [['fr-Latn-FR', 'en'], 'en'],
    [['ES-ar'], 'es'], [['invalid_locale', 'es-MX'], 'es'],
    [['de-DE'], 'en'], [[], 'en'],
  ] as const) assert.equal(detectLocale(languages), expected)
})

test('only explicit supported preferences override the browser', () => {
  assert.equal(resolveLocale('es', ['fr-CA']), 'es')
  assert.equal(resolveLocale('auto', ['fr-CA']), 'en')
  for (const value of [null, undefined, '', 'auto', 'de', 'fr-CA', '{}', '__proto__']) {
    assert.equal(parsePreference(value), 'auto')
  }
  for (const value of ['es', 'en'] as const) assert.equal(parsePreference(value), value)
})

test('locale formats measurements and compass bearings without changing geometry', () => {
  assert.equal(numberFormatter('en', 2).format(49.18), '49.18')
  assert.equal(numberFormatter('es', 2).format(49.18), '49,18')
  assert.equal(compassBearing('en', 270), 'W')
  assert.equal(compassBearing('es', 270), 'O')
  assert.equal(compassBearing('en', -90), 'W')
})

test('all display languages retain Quimper civil time and daylight saving', () => {
  for (const locale of ['es', 'en'] as const) {
    const formatter = dateFormatter(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' })
    assert.equal(formatter.format(new Date('2026-06-21T12:00:00Z')), '14:00')
    assert.equal(formatter.format(new Date('2026-12-21T12:00:00Z')), '13:00')
  }
})
