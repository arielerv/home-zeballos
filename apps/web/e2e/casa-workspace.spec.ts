import { expect, test } from '@playwright/test'

test.use({ launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--use-gl=angle'] } })

test('Casa keeps the T3-style inspector and solar controls with the Blender model visible', async ({ page }, testInfo) => {
  await page.goto('/#apartment')
  await expect(page.locator('.casa-model-viewer canvas')).toBeVisible()
  await expect(page.locator('.workspace-switcher button')).toHaveCount(3)
  await expect(page.locator('.workspace-switcher button').first()).toHaveText('House')
  await expect(page.getByRole('group', { name: 'Inspector contents' }).getByRole('button')).toHaveCount(3)
  await expect(page.getByRole('button', { name: 'Sun', exact: true })).toHaveAttribute('aria-pressed', 'true')

  const camera = page.locator('.casa-model-views')
  await expect(camera.getByRole('button').nth(0)).toHaveText('Perspective')
  await expect(camera.getByRole('button').nth(1)).toHaveText('Floor plan')
  await expect(camera.getByRole('button', { name: 'Reset view' })).toBeVisible()
  await expect(camera.getByRole('button', { name: 'Floor plan' })).toHaveAttribute('aria-pressed', 'true')
  await expect(camera.getByRole('button', { name: 'Perspective' })).toBeEnabled()
  await expect(page.locator('.casa-model-source')).toContainText('3 roofs: left G+1 high, centre low, right medium')
  await expect(page.locator('.casa-model-source')).toContainText('boundaries intact')
  await expect(page.locator('.casa-model-source')).toContainText('upper interior, dimensions and pool rotation pending')

  await page.getByRole('button', { name: 'Show neighbors', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Hide neighbors', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-casa-context="station"]')).toContainText('approximate placement')
  for (const lot of ['lot-7', 'lot-9', 'lot-11', 'lot-12']) await expect(page.locator(`[data-casa-context="${lot}"]`)).toContainText('approximate')
  for (const street of ['zeballos', 'dardo', 'cautiva']) await expect(page.locator(`[data-casa-context="${street}"]`)).toBeVisible()
  await expect(page.locator('.casa-model-viewer canvas')).toBeVisible()
  let previousPlanPosition: string | undefined
  await expect.poll(async () => {
    const box = await page.locator('[data-casa-context="lot-9"]').boundingBox()
    const position = box ? `${Math.round(box.x)},${Math.round(box.y)}` : undefined
    const settled = position !== undefined && position === previousPlanPosition
    previousPlanPosition = position
    return settled
  }, { timeout: 10000 }).toBe(true)
  await page.locator('.casa-model-viewer').screenshot({ path: testInfo.outputPath('casa-context-sidewalk-plan.png') })
  await page.getByRole('button', { name: 'Hide neighbors', exact: true }).click()
  await expect(page.locator('[data-casa-context="station"]')).toHaveCount(0)
  await expect(page.locator('[data-casa-context="lot-11"]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Show neighbors', exact: true })).toHaveAttribute('aria-pressed', 'false')

  await page.locator('.solar-inspector .season-presets button').nth(1).click()
  await expect(page.locator('.solar-inspector #solar-date')).toHaveValue(/-12-21$/)
  const slider = page.locator('.solar-inspector #solar-time-slider')
  await slider.fill('600')
  await expect(slider).toHaveValue('600')
  await page.locator('.solar-inspector #solar-time').fill('10:00')
  await expect(page.locator('.solar-inspector #solar-time-slider')).toHaveValue('600')
  await expect(page.locator('.solar-time-heading')).toContainText('America/Argentina/Buenos_Aires')
  await expect(page.locator('.solar-inspector')).toContainText('Astronomical daylight at the site')
  await expect(page.locator('.solar-inspector .sunrise-sunset button strong')).toHaveText(/1[12]:\d\d/)

  await page.getByRole('button', { name: 'Rooms 11' }).click()
  const rooms = page.locator('.solar-inspector .room-navigation button')
  await expect(rooms).toHaveCount(11)
  await rooms.nth(8).click()
  await expect(rooms.nth(8)).toHaveClass(/selected/)
  await expect(page.locator('.solar-interior-note')).toContainText('Room focus is blocked')
  await page.getByRole('button', { name: 'Fixtures 12' }).click()
  await expect(page.locator('.solar-inspector .asset-list .asset-row')).toHaveCount(12)

  await expect(page.getByRole('checkbox', { name: 'Cutaway' })).toBeEnabled()
  await expect(page.getByRole('checkbox', { name: 'Fixtures', exact: true })).toBeEnabled()
  await expect(page.getByRole('checkbox', { name: 'Labels', exact: true })).toBeEnabled()
  await page.getByRole('checkbox', { name: 'Cutaway' }).uncheck()
  await page.getByRole('checkbox', { name: 'Fixtures', exact: true }).uncheck()
  await page.getByRole('checkbox', { name: 'Labels', exact: true }).check()

  await page.getByRole('button', { name: 'Building and sun' }).click()
  await expect(page.locator('.building-workspace')).toBeVisible()
  await expect(page.locator('.casa-model-viewer canvas')).toBeVisible()
  await expect(page.locator('.casa-model-views').getByRole('button', { name: 'Perspective' })).toBeEnabled()
  await expect(page.locator('.casa-model-source')).toContainText('3 roofs: left G+1 high, centre low, right medium')
  await expect(page.getByRole('checkbox', { name: 'Site', exact: true })).toBeEnabled()
  await expect(page.getByRole('checkbox', { name: 'Labels', exact: true })).toBeEnabled()
  await expect(page.locator('.building-location')).toContainText('America/Argentina/Buenos_Aires')
  await expect(page.locator('.building-workspace .solar-time-slider')).toHaveValue('600')
  const neighbors = page.getByRole('checkbox', { name: 'Neighbors', exact: true })
  await expect(neighbors).toBeEnabled()
  await neighbors.check()
  await expect(page.locator('.building-workspace')).toContainText('eight roof bodies')
  await expect(page.locator('.building-workspace')).toContainText('continuous sidewalk')
  await expect(page.locator('.building-workspace')).toContainText('rear roof of 9 has no secure attribution')
  await expect(page.locator('[data-casa-context="station"]')).toBeVisible()
  // Wait for the real camera transition via render stability, not a fixed delay.
  let previousContextFrame: Buffer | undefined
  await expect.poll(async () => {
    const frame = await page.locator('.building-workspace .casa-model-viewer canvas').screenshot()
    const settled = previousContextFrame?.equals(frame) ?? false
    previousContextFrame = frame
    return settled
  }, { timeout: 10000 }).toBe(true)
  await page.locator('.building-workspace .viewport').screenshot({ path: testInfo.outputPath('casa-station-context.png') })
  await neighbors.uncheck()
  await expect(page.locator('[data-casa-context="station"]')).toHaveCount(0)
  const showPath = page.getByRole('checkbox', { name: /Show sun path/ })
  await expect(showPath).toBeChecked()
  await expect(page.locator('.building-workspace')).toContainText('rendered sun and shadows are illustrative')
  await expect(page.locator('.casa-sky-study')).toHaveCount(0)
  const morningRender = await page.locator('.building-workspace .casa-model-viewer canvas').screenshot()
  await page.locator('.building-workspace .solar-time-slider').fill('960')
  await expect(page.locator('.building-workspace .solar-time-slider')).toHaveValue('960')
  await expect(page.locator('.building-workspace .building-moment-tag')).toContainText('16:00')
  const afternoonRender = await page.locator('.building-workspace .casa-model-viewer canvas').screenshot()
  expect(afternoonRender.equals(morningRender)).toBe(false)
  await showPath.uncheck()
  await expect(showPath).not.toBeChecked()
})
