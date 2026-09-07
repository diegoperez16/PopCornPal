import { test, expect } from '@playwright/test'
import { mockBackend } from './fixtures'

// Guards the default "cinema" theme against drift while colour moves behind
// CSS variables. Generated before the tokenisation refactor; every later run
// must match it pixel for pixel.
const screens = ['/feed', '/library', '/add', '/people', '/activity', '/profile']

for (const path of screens) {
  test(`cinema theme is unchanged on ${path}`, async ({ page, context }) => {
    await mockBackend(context)
    // Pin cinema explicitly: the default season is whatever is current, but
    // the house style must keep rendering exactly as it always has.
    await context.addInitScript(() =>
      localStorage.setItem('popcorn_theme', 'cinema')
    )
    await page.goto(path)
    await page.waitForTimeout(1200)
    await expect(page).toHaveScreenshot(`cinema${path.replace('/', '-')}.png`, {
      fullPage: true,
      maxDiffPixels: 0,
      animations: 'disabled',
    })
  })
}
