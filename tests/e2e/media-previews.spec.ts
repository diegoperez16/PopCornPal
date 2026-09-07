import { test, expect, type Locator } from '@playwright/test'
import { mockBackend, USER_ID } from './fixtures'

async function expectProportionalPreview(image: Locator, maxHeight: number) {
  await image.scrollIntoViewIfNeeded()
  await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(1600)
  const size = await image.evaluate((el: HTMLImageElement) => ({
    width: el.clientWidth,
    height: el.clientHeight,
    containerWidth: el.parentElement!.parentElement!.clientWidth,
    objectFit: getComputedStyle(el).objectFit,
  }))
  expect(size.width).toBeLessThanOrEqual(size.containerWidth)
  expect(size.height).toBeLessThanOrEqual(maxHeight)
  expect(size.width).toBeGreaterThan(0)
  expect(size.width / size.height).toBeCloseTo(10, 0)
  expect(size.objectFit).toBe('contain')
}

test('wide photo previews stay proportional in mobile posts and comments', async ({ page, context }) => {
  const fixture = await mockBackend(context)
  const imageUrl = 'https://media.example.test/panorama.svg'
  await context.route(imageUrl, (route) => route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="160"><rect width="1600" height="160" fill="#ff655b"/></svg>',
  }))
  await context.addInitScript(({ userId, imageUrl }) => {
    localStorage.setItem(`popcorn:draft:${userId}:popcorn_post_upload`, imageUrl)
    localStorage.setItem(`popcorn:draft:${userId}:post-1:popcorn_comment_upload`, imageUrl)
  }, { userId: USER_ID, imageUrl })
  await page.goto('/feed')
  await expectProportionalPreview(page.getByAltText('Upload preview'), 240)
  await page.getByRole('button', { name: 'Comments on maria’s post' }).click()
  await expectProportionalPreview(page.getByAltText('Comment attachment'), 80)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  expect(fixture.writes).toHaveLength(0)
})
