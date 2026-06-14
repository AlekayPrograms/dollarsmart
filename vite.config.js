import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  test: {
    // functions/** holds Jest (CommonJS) tests run separately via
    // `npm --prefix functions test`; keep vitest out of them and out of the
    // emulator-only rules test.
    exclude: ['tests/firestore-rules.test.js', 'functions/**', 'node_modules/**'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'DollarSmart',
        short_name: 'DollarSmart',
        description: 'Couples budgeting, made simple.',
        theme_color: '#0F172A',
        background_color: '#0F172A',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})
