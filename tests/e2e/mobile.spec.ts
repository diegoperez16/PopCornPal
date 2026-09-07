import { test, expect } from '@playwright/test'
import { mockBackend, navigateWheel } from './fixtures'
import { mkdir } from 'node:fs/promises'
const output = process.env.POPCORN_SCREENSHOT_DIR || 'test-results/review'

test('radial navigation, collection controls, and editor save work on a phone', async ({
  page,
  context,
}) => {
  const fixture = await mockBackend(context)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/feed')
  await expect(
    page.getByRole('heading', { name: 'Your front row.' })
  ).toBeVisible()
  await mkdir(output, { recursive: true })
  await page.screenshot({
    path: `${output}/01-mobile-feed.png`,
    fullPage: true,
  })
  await page
    .getByRole('button', { name: 'Open navigation', exact: true })
    .click()
  const wheel = page.getByRole('dialog', { name: 'Popcorn Pal navigation' })
  await expect(wheel).toBeVisible()
  await page.screenshot({ path: `${output}/02-radial-navigation.png` })
  await page.keyboard.press('Escape')
  await expect(wheel).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Open navigation', exact: true })
  ).toBeFocused()
  await navigateWheel(page, 'Library')
  await expect(
    page.getByRole('heading', { name: 'Your collection.' })
  ).toBeVisible()
  await page.screenshot({
    path: `${output}/03-mobile-library.png`,
    fullPage: true,
  })
  await page
    .getByRole('searchbox', { name: 'Search your library' })
    .fill('Past Lives')
  await expect(page.getByText('1 title', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Past Lives/ }).click()
  const editor = page.getByRole('dialog')
  await expect(editor).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(editor).not.toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    )
    .toBe(true)
  expect(fixture.writes).toHaveLength(0)
  expect(errors).toEqual([])
})

test('search, recoverable errors, draft restore, save and sharing form a complete loop', async ({
  page,
  context,
}) => {
  const fixture = await mockBackend(context)
  await page.goto('/add')
  await page
    .getByRole('searchbox', { name: 'Search titles' })
    .fill('network-error')
  await expect(page.getByRole('alert')).toContainText(
    'catalog is temporarily unavailable'
  )
  await page.getByRole('searchbox', { name: 'Search titles' }).fill('Dune')
  await page
    .getByRole('button', { name: 'Log Dune: Part Two', exact: true })
    .click()
  await page
    .getByLabel('Notes')
    .fill('An enormous screen kind of movie.')
  await page.screenshot({ path: `${output}/04-mobile-log.png` })
  await page.getByRole('button', { name: 'Close log; keep draft' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByLabel('Notes')).toHaveValue(
    'An enormous screen kind of movie.'
  )
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Saved to your library')
  expect(fixture.writes.some((write) => write.table === 'media_entries')).toBe(
    true
  )
  await page.getByRole('link', { name: 'Share your thoughts' }).click()
  await page
    .getByRole('textbox', { name: 'Share a thought with your friends' })
    .fill('Tonight’s pick: Dune. Who wants a movie night?')
  await page.getByRole('button', { name: 'Post', exact: true }).click()
  await expect(
    page.getByText('Tonight’s pick: Dune. Who wants a movie night?', {
      exact: true,
    })
  ).toBeVisible()
  expect(fixture.writes.some((write) => write.table === 'posts')).toBe(true)
})

test('session guard, sign in, account confirmation and password recovery', async ({
  page,
  context,
}) => {
  await mockBackend(context, { signedIn: false })
  await page.goto('/library')
  await expect(page).toHaveURL(/\/auth$/)
  await page.screenshot({
    path: `${output}/05-mobile-auth.png`,
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Forgot password?' }).click()
  await page.getByLabel('Email address').fill('alex@example.com')
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByRole('status')).toContainText('Check your inbox')
  await page.getByRole('button', { name: 'Back to sign in' }).click()
  await page.getByLabel('Password', { exact: true }).fill('Popcorn123')
  await page.getByRole('button', { name: 'Take your seat' }).click()
  await expect(page).toHaveURL(/\/library$/)
})

test('episode ratings persist independently and save without an existing show record', async ({
  page,
  context,
}) => {
  const fixture = await mockBackend(context)
  await page.goto('/add')
  await page.getByRole('button', { name: 'Shows', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Search titles' }).fill('The Bear')
  await page.getByRole('button', { name: 'Log The Bear', exact: true }).click()
  await page.getByRole('button', { name: 'By episode' }).click()
  await page.getByRole('spinbutton', { name: 'Rating for System' }).fill('9')
  await page.getByRole('spinbutton', { name: 'Rating for Hands' }).fill('8.5')
  await page.getByRole('button', { name: 'Save ratings' }).click()
  await expect(page.getByRole('status')).toContainText(
    'Saved 2 episode ratings'
  )
  expect(
    fixture.writes.filter((w) => w.table === 'episode_ratings')
  ).toHaveLength(2)
})

test('offline logging keeps work on the device and syncs after reconnect', async ({
  page,
  context,
}) => {
  const fixture = await mockBackend(context)
  await page.goto('/add')
  await page.getByRole('searchbox', { name: 'Search titles' }).fill('Dune')
  await page
    .getByRole('button', { name: 'Log Dune: Part Two', exact: true })
    .click()
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Saved on this device')
  expect(fixture.writes).toHaveLength(0)
  await context.setOffline(false)
  await expect
    .poll(
      () => fixture.writes.filter((w) => w.table === 'media_entries').length
    )
    .toBeGreaterThan(0)
})

test('desktop uses the same collection and navigation', async ({
  page,
  context,
}) => {
  await mockBackend(context)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/library')
  await expect(
    page.getByRole('heading', { name: 'Your collection.' })
  ).toBeVisible()
  await page.screenshot({
    path: `${output}/06-desktop-library.png`,
    fullPage: true,
  })
  await expect(
    page.getByRole('button', { name: 'Open navigation', exact: true })
  ).not.toBeVisible()
})

test('library edits save, failures stay visible, and removal requires a deliberate choice', async ({
  page,
  context,
}) => {
  const fixture = await mockBackend(context)
  await page.goto('/library')
  await page.getByRole('button', { name: 'View and edit Past Lives' }).click()
  await page.getByLabel('Notes').fill('Quietly unforgettable.')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  expect(
    fixture.getLibrary().find((entry) => entry.title === 'Past Lives')?.notes
  ).toBe('Quietly unforgettable.')
  await page.getByRole('button', { name: 'View and edit Past Lives' }).click()
  await context.route('**/rest/v1/media_entries*', (route) =>
    route.request().method() === 'PATCH'
      ? route.fulfill({
          status: 403,
          json: { message: 'Fixture permission error', code: '42501' },
        })
      : route.fallback()
  )
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('alert')).toContainText('could not be saved')
  await page
    .getByRole('button', { name: 'Remove this entry', exact: true })
    .click()
  await page.getByRole('button', { name: 'Keep entry', exact: true }).click()
  expect(
    fixture.getLibrary().some((entry) => entry.title === 'Past Lives')
  ).toBe(true)
  await page
    .getByRole('button', { name: 'Remove this entry', exact: true })
    .click()
  await page.getByRole('button', { name: 'Remove entry', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  expect(
    fixture.getLibrary().some((entry) => entry.title === 'Past Lives')
  ).toBe(false)
})

test('sign-up confirmation is success feedback and the compact wheel remains usable', async ({
  page,
  context,
}) => {
  await mockBackend(context, { signedIn: false })
  await page.goto('/auth')
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click()
  await page.getByLabel('Username').fill('newfan')
  await page.getByLabel('Email address').fill('newfan@example.com')
  await page.getByLabel('Password', { exact: true }).fill('Popcorn123')
  await page.getByLabel('Confirm password').fill('Popcorn123')
  await page
    .getByRole('button', { name: 'Create your account', exact: true })
    .click()
  await expect(page.getByRole('status')).toContainText(
    'Check your email to confirm'
  )
  await expect(page.getByRole('alert')).not.toBeVisible()
  await page.getByRole('button', { name: 'Continue to sign in' }).click()
  await page.getByRole('button', { name: 'Take your seat' }).click()
  await page.setViewportSize({ width: 320, height: 640 })
  await page
    .getByRole('button', { name: 'Open navigation', exact: true })
    .click()
  const wheel = page.getByRole('dialog', { name: 'Popcorn Pal navigation' })
  await page.keyboard.press('Home')
  await expect(wheel.getByRole('link', { name: 'Log a title' })).toBeFocused()
  for (const link of await wheel.getByRole('link').all()) {
    const bounds = await link.boundingBox()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320)
    expect(bounds!.width).toBeGreaterThanOrEqual(44)
  }
  await page.keyboard.press('Escape')
  await expect(wheel).not.toBeVisible()
})
