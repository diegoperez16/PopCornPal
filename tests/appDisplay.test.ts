import test from 'node:test'
import assert from 'node:assert/strict'
import { applyStandaloneChrome, isStandalone } from '../src/lib/appDisplay.ts'

type Stub = { displayMode?: string; iosStandalone?: boolean }

function stubEnvironment({ displayMode, iosStandalone }: Stub) {
  const classes = new Set<string>()
  let viewport = 'width=device-width, initial-scale=1.0, viewport-fit=cover'

  globalThis.window = {
    matchMedia: (query: string) => ({
      matches: displayMode ? query.includes(displayMode) : false,
    }),
  } as unknown as Window & typeof globalThis
  // Node exposes navigator as a getter-only global.
  Object.defineProperty(globalThis, 'navigator', {
    value: { standalone: iosStandalone },
    configurable: true,
    writable: true,
  })
  globalThis.document = {
    documentElement: { classList: { add: (c: string) => classes.add(c) } },
    querySelector: () => ({
      setAttribute: (_: string, value: string) => {
        viewport = value
      },
    }),
  } as unknown as Document

  return { classes, viewport: () => viewport }
}

test('a browser tab keeps pinch zoom available', () => {
  const env = stubEnvironment({})
  assert.equal(isStandalone(), false)
  applyStandaloneChrome()
  assert.ok(!env.viewport().includes('user-scalable=no'))
  assert.equal(env.classes.has('is-standalone'), false)
})

test('an installed app locks scale so pinching cannot break the layout', () => {
  const env = stubEnvironment({ displayMode: 'standalone' })
  assert.equal(isStandalone(), true)
  applyStandaloneChrome()
  assert.ok(env.viewport().includes('user-scalable=no'))
  assert.ok(env.viewport().includes('maximum-scale=1'))
  // The keyboard still has to be able to resize the sheet.
  assert.ok(env.viewport().includes('interactive-widget=resizes-content'))
  assert.ok(env.viewport().includes('viewport-fit=cover'))
  assert.ok(env.classes.has('is-standalone'))
})

test('iOS home-screen apps are detected without display-mode', () => {
  stubEnvironment({ iosStandalone: true })
  assert.equal(isStandalone(), true)
})
