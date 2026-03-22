import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'PopcornPal',
        short_name: 'PopcornPal',
        description: 'Track and share your movies, shows, games, and books with friends',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        // Take over all tabs immediately when a new SW version is installed
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Supabase Storage public assets (post images, avatars, cover art).
            // These are immutable once uploaded so CacheFirst is safe.
            urlPattern: /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Supabase Auth, REST, and Realtime APIs must always go to the network.
            // Caching auth responses would cause stale tokens; caching data responses
            // would serve outdated feed content.
            urlPattern: /^https:\/\/[^/]+\.supabase\.co\/(auth|rest|realtime)\/.*/i,
            handler: 'NetworkOnly',
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0', // Expose to network
    port: 5173,
  }
})
