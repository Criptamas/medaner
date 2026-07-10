import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // injectManifest en vez de generateSW: necesitamos un service worker
      // propio (src/sw.js) que además de precachear la PWA maneje FCM en
      // background — dos service workers separados en la misma ruta raíz
      // (uno de Workbox, otro de Firebase) compiten entre sí.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      includeAssets: ['logoprototipo.png', 'logoprototipo.png'],
      manifest: {
        name: 'Medaner',
        short_name: 'Medaner',
        description: 'Medaner',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0F172A',
        theme_color: '#0EA5A5',
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
          {
            src: 'logoprototipo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
