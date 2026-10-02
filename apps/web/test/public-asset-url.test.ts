import assert from 'node:assert/strict'
import test from 'node:test'
import { publicAssetUrl } from '../src/lib/public-asset-url.ts'

test('public assets support root hosting and GitHub project Pages', () => {
  for (const path of ['/models/casa-2071/casa-2071-maqueta-revision.glb', '/dossier/apartment-plan.png']) {
    assert.equal(publicAssetUrl(path), path)
    assert.equal(publicAssetUrl(path, '/home-zeballos/'), `/home-zeballos${path}`)
    assert.equal(publicAssetUrl(path, '/home-zeballos'), `/home-zeballos${path}`)
  }
})

test('external, bundled and hash links are left untouched', () => {
  for (const path of ['https://example.com/plan', '//example.com/plan', './assets/plan.png', '#apartment']) {
    assert.equal(publicAssetUrl(path, '/home-zeballos/'), path)
  }
})