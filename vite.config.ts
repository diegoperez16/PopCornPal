import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(Date.now().toString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // injectManifest lets us write a custom SW (src/sw.ts) with push +
      // background-sync handlers while still injecting the Workbox precache manifest.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Popcorn Pal',
        short_name: 'Popcorn Pal',
        description: 'Track and share your movies, shows, games, and books with friends',
        id: '/',
        lang: 'en',
        categories: ['entertainment', 'social'],
        theme_color: '#14181c',
        background_color: '#14181c',
        display: 'standalone',

        scope: '/',
        start_url: '/feed',
        shortcuts: [
          { name: 'Log a title', url: '/add', icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Your library', url: '/library', icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }] },
        ],
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
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      // injectManifest: Workbox only injects __WB_MANIFEST into src/sw.ts.
      // All caching strategy code lives in that file.
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      devOptions: {
        enabled: false, // SW is production-only; dev uses Vite's HMR
        type: 'module',
      },
    })
  ],
  server: {
    host: '0.0.0.0', // Expose to network
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-data': [
            '@supabase/supabase-js',
            '@tanstack/react-query',
            '@tanstack/react-query-persist-client',
            '@tanstack/query-async-storage-persister',
            'idb-keyval',
            'zustand',
          ],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
})
