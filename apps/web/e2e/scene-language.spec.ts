import { expect, test } from '@playwright/test'
import { setLanguage } from './settings-helpers'

test.use({
  locale: 'en-GB',
  launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--use-gl=angle'] },
})

test('rendered room labels and asset details update without replacing the canvas', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/?project=t3#apartment')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 })
  await page.getByRole('checkbox', { name: 'Labels', exact: true }).check()
  await expect(page.locator('.labels-overlay .room-label').filter({ hasText: 'Bedroom 1' })).toBeVisible()
  await page.locator('canvas').evaluate(element => element.setAttribute('data-original-canvas', 'true'))
  await setLanguage(page, 'es')
  await expect(page.locator('.labels-overlay .room-label').filter({ hasText: 'Habitación 1' })).toBeVisible()
  await expect(page.locator('canvas')).toHaveAttribute('data-original-canvas', 'true')
  await page.locator('.inspector-tabs button').nth(2).click()
  await page.locator('.asset-row').first().click()
  await expect(page.locator('.asset-details')).toContainText('P06 / P11')
  await setLanguage(page, 'en')
  await expect(page.locator('.asset-details h2')).toHaveText('Fridge-freezer')
  await expect(page.locator('.asset-details')).toContainText('Estimated dimensions')
  await expect(page.locator('.asset-details a')).toHaveAttribute('href', '/models/current/fridge-freezer.glb')
})
