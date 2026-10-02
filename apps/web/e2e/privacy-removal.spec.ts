import { expect, test } from '@playwright/test'

test('the original workspaces remain usable without privacy links or analytics UI', async ({ page }) => {
  const analyticsRequests: string[] = []
  await page.route('**/umami/**', route => {
    analyticsRequests.push(route.request().url())
    return route.abort()
  })

  await page.goto('/?project=t3#building')
  await expect(page.locator('.workspace-switcher button')).toHaveCount(3)
  await expect(page.locator('.settings-trigger')).toBeVisible()
  await expect(page.locator('#solar-date')).toBeVisible()
  await page.locator('.settings-trigger').click()
  const settings = page.locator('.settings-dialog')
  await expect(settings).toBeVisible()
  const languageOptions = await settings.getByRole('combobox', { name: /language/i }).locator('option').allTextContents()
  expect(languageOptions.join(' ')).not.toMatch(/French|Français|Langue/)
  await page.keyboard.press('Escape')

  for (const view of ['#apartment', '#building', '#documentation']) {
    await page.locator('.workspace-switcher button').nth(view === '#apartment' ? 0 : view === '#building' ? 1 : 2).click()
    await expect(page).toHaveURL(new RegExp(`${view.slice(1)}$`))
    await expect(page.locator('.workspace-switcher button')).toHaveCount(3)
    await expect(page.getByTestId('privacy-preferences')).toHaveCount(0)
    await expect(page.getByTestId('privacy-policy')).toHaveCount(0)
    await expect(page.getByTestId('analytics-consent-banner')).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Optional analytics' })).toHaveCount(0)
  }

  await page.goto('/privacy')
  await expect(page.locator('.workspace-switcher button')).toHaveCount(3)
  await expect(page.getByTestId('privacy-page')).toHaveCount(0)
  expect(analyticsRequests).toEqual([])
})

test('the default Casa route preserves the T3-style solar, room, fixture, and building workspaces', async ({ page }) => {
  await page.goto('/#apartment')
  await expect(page.locator('.workspace-switcher button')).toHaveCount(3)
  await expect(page.locator('.workspace-switcher button').first()).toHaveText('House')
  await expect(page.locator('.solar-inspector')).toBeVisible()
  await expect(page.locator('.solar-inspector .solar-date-control input')).toBeVisible()
  await expect(page.locator('.solar-inspector .solar-time-slider')).toBeVisible()
  await expect(page.locator('.inspector-tabs button')).toHaveCount(3)

  await page.locator('.inspector-tabs button').nth(1).click()
  await expect(page.locator('.room-navigation button')).toHaveCount(11)
  await expect(page.locator('.room-navigation button').first()).toBeEnabled()
  await page.locator('.room-navigation button').first().click()
  await expect(page.locator('.room-navigation button').first()).toHaveClass(/selected/)

  await page.locator('.inspector-tabs button').nth(2).click()
  await expect(page.locator('.asset-list .asset-row')).toHaveCount(12)
  await page.locator('.workspace-switcher button').nth(1).click()
  await expect(page.locator('.solar-inspector .solar-date-control input')).toBeVisible()
  await expect(page.locator('.building-workspace')).toBeVisible()
  await expect(page.getByTestId('privacy-preferences')).toHaveCount(0)
  await expect(page.getByTestId('privacy-policy')).toHaveCount(0)
  await expect(page.getByTestId('analytics-consent-banner')).toHaveCount(0)
})

test('Casa Documentation keeps the exact original T3 dossier menu and layout, with Casa source data', async ({ page }) => {
  await page.goto('/?project=t3#documentation')
  await expect(page.locator('.dossier')).toBeVisible()
  const t3Menu = await page.locator('.dossier-sidebar nav button').allTextContents()
  expect(t3Menu).toHaveLength(6)

  await page.goto('/?project=casa-2071#documentation')
  await expect(page.locator('.dossier')).toBeVisible()
  await expect(page.locator('.dossier-sidebar nav button')).toHaveCount(6)
  await expect(page.locator('.dossier-sidebar nav button').nth(0)).toHaveText(t3Menu[0]!)
  await expect(page.locator('.dossier-sidebar nav button').nth(1)).toHaveText(t3Menu[1]!)
  await expect(page.locator('.dossier-sidebar nav button').nth(2)).toHaveText(t3Menu[2]!)
  await expect(page.locator('.dossier-sidebar nav button').nth(3)).toHaveText(t3Menu[3]!)
  await expect(page.locator('.dossier-sidebar nav button').nth(4)).toHaveText(t3Menu[4]!)
  await expect(page.locator('.dossier-sidebar nav button').nth(5)).toHaveText(t3Menu[5]!)
  await expect(page.locator('.casa-dossier')).toHaveCount(0)
  await expect(page.locator('.dossier-hero')).toContainText('Casa 2071')
  await expect(page.locator('.dossier-map')).toContainText('Zeballos 2071')
  await expect(page.locator('.dossier-stats')).toContainText('11')

  await page.locator('.dossier-sidebar nav button').nth(1).click()
  await expect(page.locator('.dossier-surfaces tbody tr')).toHaveCount(11)
  await expect(page.locator('.dossier-plan-card img')).toHaveAttribute('src', /planos%20tentativa|planos-tentativa/)
  await expect(page.locator('.dossier-content')).not.toContainText('Carrez')
  await page.locator('.dossier-sidebar nav button').nth(4).click()
  await expect(page.locator('.dossier-source-card')).toHaveCount(8)
  await page.getByRole('button', { name: /Blender 2D trace \(draft\)/ }).click()
  await expect(page.locator('.dossier-dialog')).toContainText('not a 3D house')
  await expect(page.locator('.dossier-dialog a').last()).toHaveAttribute('href', '/models/casa-2071/casa-2071-tentative-trace-review.blend')
  await page.locator('.dossier-dialog').getByRole('button', { name: 'Close source' }).click()
  await expect(page.locator('.dossier-content')).toContainText('Street View panoramas reviewed')
  await expect(page.locator('.dossier-content img[src*="Frente"]')).toHaveCount(0)
})
