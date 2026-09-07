import { test, expect, type BrowserContext, type Locator } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { entries, mockBackend, USER_ID } from './fixtures'

const output = process.env.POPCORN_SCREENSHOT_DIR || 'test-results/review'
const mediaOrigin = 'https://media.example.test'
const animatedGif = fileURLToPath(new URL('./assets/animated-landscape.gif', import.meta.url))
const attachments = [
  { name: 'Portrait', file: 'portrait.svg', width: 900, height: 1600 },
  { name: 'Landscape', file: 'landscape.svg', width: 1600, height: 900 },
  { name: 'Square', file: 'square.svg', width: 900, height: 900 },
  { name: 'Animated GIF', file: 'animated-landscape.gif', width: 320, height: 180 },
]
const coverEntries = attachments.slice(0, 3).map((asset, index) => ({
  ...entries[index],
  title: index === 1 ? 'Black Myth: Wukong' : `${asset.name} artwork`,
  media_type: index === 1 ? 'game' : entries[index].media_type,
  cover_image_url: `${mediaOrigin}/${asset.file}`,
}))

function artwork(width: number, height: number, label: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#254e64"/>
    <rect x="12" y="12" width="${width - 24}" height="${height - 24}" rx="16" fill="#191b1e" stroke="#ff7568" stroke-width="24"/>
    <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 4}" fill="#dfc59f"/>
    <text x="50%" y="10%" text-anchor="middle" fill="#f4f0e8" font-family="sans-serif" font-size="48">TOP EDGE</text>
    <text x="50%" y="52%" text-anchor="middle" fill="#191b1e" font-family="sans-serif" font-size="48">${label}</text>
    <text x="50%" y="94%" text-anchor="middle" fill="#f4f0e8" font-family="sans-serif" font-size="48">BOTTOM EDGE</text>
  </svg>`
}

async function mockMedia(context: BrowserContext) {
  const fixture = await mockBackend(context)
  await context.route(`${mediaOrigin}/**`, async (route) => {
    const asset = attachments.find((item) => route.request().url().endsWith(item.file))!
    if (asset.file.endsWith('.gif'))
      return route.fulfill({ contentType: 'image/gif', path: animatedGif })
    return route.fulfill({
      contentType: 'image/svg+xml',
      body: artwork(asset.width, asset.height, asset.name),
    })
  })
  await context.route('**/rest/v1/media_entries*', (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    return route.fulfill({ json: coverEntries })
  })
  await context.route('**/rest/v1/rpc/get_feed', (route) => route.fulfill({
    json: attachments.map((asset, index) => ({
      id: `media-post-${index}`,
      user_id: USER_ID,
      username: 'alex',
      avatar_url: null,
      content: `${asset.name}: every edge should remain visible.`,
      image_url: `${mediaOrigin}/${asset.file}`,
      media_title: index === 1 ? 'Black Myth: Wukong' : null,
      media_type: index === 1 ? 'game' : null,
      media_rating: null,
      media_cover_url: index === 1 ? `${mediaOrigin}/landscape.svg` : null,
      likes_count: 0,
      comments_count: 0,
      is_liked: false,
      created_at: new Date(Date.now() - index * 60_000).toISOString(),
    })),
  }))
  return fixture
}

async function expectLoaded(image: Locator) {
  await image.scrollIntoViewIfNeeded()
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => (
    element.complete && element.naturalWidth > 0
  ))).toBe(true)
  await expect(image).toHaveCSS('opacity', '1')
}

async function expectCoverFillsFrame(image: Locator, frame: Locator) {
  await expectLoaded(image)
  await expect(image).toHaveCSS('object-fit', 'cover')
  const imageBounds = (await image.boundingBox())!
  const frameBounds = await frame.evaluate((element) => ({
    width: element.clientWidth,
    height: element.clientHeight,
  }))
  expect(Math.abs(imageBounds.width - frameBounds.width)).toBeLessThanOrEqual(1)
  expect(Math.abs(imageBounds.height - frameBounds.height)).toBeLessThanOrEqual(1)
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000, isMobile: false, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
]) {
  test.describe(`${viewport.name} media rendering`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
    })

    test('landscape game, portrait, and square covers fill grid and list cards', async ({ page, context }) => {
      const fixture = await mockMedia(context)
      await page.goto('/library')
      await expect(page.getByRole('heading', { name: 'Your collection.' })).toBeVisible()
      for (const view of ['Poster grid view', 'List view']) {
        await page.getByRole('button', { name: view, exact: true }).click()
        await page.mouse.move(0, 0)
        for (const entry of coverEntries) {
          const card = page.getByRole('button', { name: `View and edit ${entry.title}`, exact: true })
          await expectCoverFillsFrame(card.locator('img'), card.locator(':scope > div').first())
        }
      }
      await page.getByRole('button', { name: 'Poster grid view', exact: true }).click()
      await page.mouse.move(0, 0)
      await mkdir(output, { recursive: true })
      await page.screenshot({ path: `${output}/media-${viewport.name}-library.png`, fullPage: true })
      expect(fixture.writes).toHaveLength(0)
    })

    test('photos and an animated GIF show the complete image at their natural proportions', async ({ page, context }) => {
      const fixture = await mockMedia(context)
      await page.goto('/feed')
      await expect(page.getByRole('heading', { name: 'Your front row.' })).toBeVisible()
      for (const asset of attachments) {
        const image = page.locator(`img[alt="Post attachment"][src="${mediaOrigin}/${asset.file}"]`)
        await expectLoaded(image)
        const dimensions = await image.evaluate((element: HTMLImageElement) => {
          const rect = element.getBoundingClientRect()
          const container = element.parentElement!.getBoundingClientRect()
          return {
            width: rect.width,
            height: rect.height,
            naturalWidth: element.naturalWidth,
            naturalHeight: element.naturalHeight,
            centerOffset: Math.abs(rect.x + rect.width / 2 - container.x - container.width / 2),
            containerWidth: container.width,
            objectFit: getComputedStyle(element).objectFit,
          }
        })
        expect(dimensions.naturalWidth).toBe(asset.width)
        expect(dimensions.naturalHeight).toBe(asset.height)
        expect(dimensions.objectFit).toBe('contain')
        expect(Math.abs(dimensions.width / dimensions.height - asset.width / asset.height)).toBeLessThan(0.01)
        expect(dimensions.width).toBeLessThanOrEqual(dimensions.naturalWidth + 1)
        expect(dimensions.height).toBeLessThanOrEqual(dimensions.naturalHeight + 1)
        expect(dimensions.width).toBeLessThanOrEqual(dimensions.containerWidth + 1)
        expect(dimensions.height).toBeLessThanOrEqual(Math.min(viewport.height * 0.7, 640) + 1)
        expect(dimensions.centerOffset).toBeLessThanOrEqual(1)
      }
      const gameThumbnail = page.getByRole('img', { name: 'Black Myth: Wukong', exact: true })
      await expectCoverFillsFrame(gameThumbnail, gameThumbnail.locator('../..'))
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await mkdir(output, { recursive: true })
      await page.screenshot({ path: `${output}/media-${viewport.name}-feed.png`, fullPage: true })
      expect(fixture.writes).toHaveLength(0)
    })
  })
}
