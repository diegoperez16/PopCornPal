import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CINEMA,
  DEFAULT_THEME_ID,
  THEMES,
  applyTheme,
  getTheme,
} from '../src/themes/themes.ts'

test('an unknown or missing theme falls back to the current season', () => {
  for (const value of [null, undefined, '', 'batman', 'CINEMA']) {
    assert.equal(getTheme(value).id, DEFAULT_THEME_ID)
  }
  assert.equal(getTheme('cinema').id, 'cinema')
  assert.equal(getTheme('wizarding').id, 'wizarding')
})

test('the default season is a real theme, so nobody lands on a missing one', () => {
  assert.ok(THEMES.some((theme) => theme.id === DEFAULT_THEME_ID))
})

test('cinema keeps the exact colours the app shipped with', () => {
  // Pinned so a future season can never quietly edit the default out from
  // under the app. These match :root in src/index.css.
  assert.equal(CINEMA.colors.bg, '20 24 28')
  assert.equal(CINEMA.colors.surface, '27 33 39')
  assert.equal(CINEMA.colors.accent, '255 101 91')
  assert.equal(CINEMA.colors['butter-400'], '246 205 102')
  assert.equal(CINEMA.colors.text, '232 238 243')
  assert.equal(CINEMA.costume, 'none')
})

test('every season defines the full token set, so nothing falls back to a gap', () => {
  const expected = Object.keys(CINEMA.colors)
  for (const theme of THEMES) {
    assert.deepEqual(
      Object.keys(theme.colors).sort(),
      expected.slice().sort(),
      `${theme.id} is missing tokens`
    )
    for (const [token, value] of Object.entries(theme.colors)) {
      assert.match(
        value,
        /^\d{1,3} \d{1,3} \d{1,3}$/,
        `${theme.id}.${token} is not an "R G B" triplet`
      )
    }
  }
})

test('applying a theme writes every channel and tags the document', () => {
  const set = new Map<string, string>()
  const root = {
    style: { setProperty: (k: string, v: string) => set.set(k, v) },
    dataset: {} as Record<string, string>,
  } as unknown as HTMLElement

  applyTheme(getTheme('lantern'), root)

  assert.equal(root.dataset.theme, 'lantern')
  assert.equal(set.size, Object.keys(CINEMA.colors).length)
  assert.equal(set.get('--pp-accent-rgb'), '16 185 90')
  // Switching back must restore every cinema value, not just the ones a
  // season happened to override.
  applyTheme(CINEMA, root)
  assert.equal(set.get('--pp-accent-rgb'), '255 101 91')
  assert.equal(set.get('--pp-bg-rgb'), '20 24 28')
  assert.equal(root.dataset.theme, 'cinema')
})
