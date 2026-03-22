/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst, NetworkOnly } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

// ─── LIFECYCLE ────────────────────────────────────────────────────────────
self.skipWaiting()
clientsClaim()

// ─── PRECACHING ───────────────────────────────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ─── NAVIGATION FALLBACK ──────────────────────────────────────────────────
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
  })
)

// ─── RUNTIME CACHING ──────────────────────────────────────────────────────
// Google Fonts
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
)

// Supabase Storage – immutable public assets
registerRoute(
  /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
  new CacheFirst({
    cacheName: 'supabase-storage',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  })
)

// Supabase Auth / REST / Realtime – always network
registerRoute(
  /^https:\/\/[^/]+\.supabase\.co\/(auth|rest|realtime)\/.*/i,
  new NetworkOnly()
)

// ─── PUSH NOTIFICATIONS ───────────────────────────────────────────────────
interface PushPayload {
  title: string
  body: string
  url?: string
  type?: string
}

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  let payload: PushPayload
  try {
    payload = event.data.json() as PushPayload
  } catch {
    payload = { title: 'PopcornPal', body: event.data.text() }
  }

  const notifOptions: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body: payload.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: payload.url ?? '/feed' },
    tag: `popcornpal-${payload.type ?? 'notif'}`,
    renotify: true,
    vibrate: [100, 50, 100],
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, notifOptions)
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const targetUrl = (event.notification.data?.url as string | undefined) ?? '/feed'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const existing = clients.find(
          c => new URL(c.url).origin === self.location.origin
        )
        if (existing) {
          existing.focus()
          return existing.navigate(targetUrl)
        }
        return self.clients.openWindow(targetUrl)
      })
  )
})

// ─── BACKGROUND SYNC ──────────────────────────────────────────────────────
// When the browser fires a sync event (after coming back online), tell every
// open tab to flush its offline write queue.
interface SyncEvent extends ExtendableEvent {
  tag: string
  lastChance: boolean
}

self.addEventListener('sync', ((event: SyncEvent) => {
  if (event.tag === 'popcornpal-offline-queue') {
    event.waitUntil(
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then(clients =>
          clients.forEach(c => c.postMessage({ type: 'FLUSH_OFFLINE_QUEUE' }))
        )
    )
  }
}) as EventListener)
