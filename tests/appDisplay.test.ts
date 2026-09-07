import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyAppChrome,
  isStandalone,
  lockPinchZoom,
} from '../src/lib/appDisplay.ts'

type Stub = { displayMode?: string; iosStandalone?: boolean }

function stubEnvironment({ displayMode, iosStandalone }: Stub = {}) {
  const classes = new Set<string>()
  const listeners = new Map<string, EventListener>()

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
    addEventListener: (type: string, fn: EventListener) =>
      listeners.set(type, fn),
    removeEventListener: (type: string) => listeners.delete(type),
  } as unknown as Document

  return { classes, listeners }
}

test('pinch gestures are cancelled so the layout keeps its scale', () => {
  const env = stubEnvironment()
  applyAppChrome()
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    assert.ok(env.listeners.has(type), `${type} is not intercepted`)
  }
  let prevented = false
  env.listeners.get('gesturestart')?.({
    preventDefault: () => {
      prevented = true
    },
  } as unknown as Event)
  assert.equal(prevented, true)
})

test('the zoom lock releases every listener it added', () => {
  const env = stubEnvironment()
  const release = lockPinchZoom()
  assert.equal(env.listeners.size, 3)
  release()
  assert.equal(env.listeners.size, 0)
})

test('an installed app is flagged for standalone-only styling', () => {
  const env = stubEnvironment({ displayMode: 'standalone' })
  assert.equal(isStandalone(), true)
  applyAppChrome()
  assert.ok(env.classes.has('is-standalone'))
})

test('a browser tab is not flagged as standalone', () => {
  const env = stubEnvironment()
  assert.equal(isStandalone(), false)
  applyAppChrome()
  assert.equal(env.classes.has('is-standalone'), false)
})

test('iOS home-screen apps are detected without display-mode', () => {
  stubEnvironment({ iosStandalone: true })
  assert.equal(isStandalone(), true)
})
