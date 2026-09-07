import { test, expect } from '@playwright/test'

test.use({ serviceWorkers: 'allow' })

test('production manifest, install icons, service worker and offline navigation are ready', async ({
  page,
  context,
}) => {
  await page.goto('/auth')
  await expect(
    page.getByRole('heading', { name: 'Welcome back.' })
  ).toBeVisible()
  const manifestURL = await page
    .locator('link[rel="manifest"]')
    .getAttribute('href')
  expect(manifestURL).toBeTruthy()
  const manifest = await (await page.request.get(manifestURL!)).json()
  expect(manifest.name).toBe('Popcorn Pal')
  expect(manifest.display).toBe('standalone')
  expect(manifest.start_url).toBe('/feed')
  expect(
    manifest.icons.some(
      (icon: { purpose?: string }) => icon.purpose === 'maskable'
    )
  ).toBe(true)
  for (const icon of manifest.icons) {
    const response = await page.request.get(icon.src)
    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).toContain('image/png')
    const dimensions = await page.evaluate(async (url) => {
      const img = new Image()
      img.src = url
      await img.decode()
      return `${img.naturalWidth}x${img.naturalHeight}`
    }, icon.src)
    expect(dimensions).toBe(icon.sizes)
  }
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true)
  const cacheSize = await page.evaluate(
    async () => (await caches.keys()).length
  )
  expect(cacheSize).toBeGreaterThan(0)
  await context.setOffline(true)
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Welcome back.' })
  ).toBeVisible()
  await page.goto('/library')
  await expect(page).toHaveURL(/\/auth$/)
  await expect(
    page.getByRole('button', { name: 'Take your seat' })
  ).toBeVisible()
})

test('small phones retain zoom and the auth form has no horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/auth')
  const viewport = await page
    .locator('meta[name="viewport"]')
    .getAttribute('content')
  expect(viewport).not.toContain('user-scalable=no')
  expect(viewport).toContain('viewport-fit=cover')
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(320)
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click()
  await expect(page.getByLabel('Confirm password')).toBeVisible()
})
