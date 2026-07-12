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
      includeAssets: ['logoprototipo.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Medaner',
        short_name: 'Medaner',
        description: 'Delivery y viajes en Punto Fijo, estado Falcón.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // Paleta oscura del Bloque 4: la splash de la PWA y la barra del
        // navegador deben coincidir con el fondo de la app, no con los
        // colores viejos (azul/teal) que ya no existen.
        background_color: '#0C141B',
        theme_color: '#0C141B',
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
