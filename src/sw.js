import { precacheAndRoute } from 'workbox-precaching'

// Precacheo de la PWA (lo que antes generaba vite-plugin-pwa automáticamente
// en modo "generateSW"). Se fusiona en este único archivo con el manejo de
// FCM de abajo porque dos service workers separados registrados en la misma
// ruta raíz compiten entre sí — solo uno queda activo de forma confiable.
precacheAndRoute(self.__WB_MANIFEST)

// Firebase Messaging en background. Los valores de config son públicos
// (identifican el proyecto, no son secretos; el acceso lo controlan las
// reglas de Firestore) — hardcodeados porque un service worker estático no
// puede leer variables de entorno de Vite.
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyD32CnkoQx3CdUF8WNb-WkkQ9NMcPp_VBw',
  authDomain: 'medanerr.firebaseapp.com',
  projectId: 'medanerr',
  messagingSenderId: '1067842132174',
  appId: '1:1067842132174:web:ec433305257d847d93989f',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification ?? {}
  self.registration.showNotification(title ?? 'Medaner', {
    body,
    icon: icon ?? '/pwa-192x192.png',
    data: { url: payload.fcmOptions?.link ?? payload.data?.url },
  })
})

// Tocar la notificación abre (o enfoca, si ya hay una pestaña) la pantalla
// de detalle del viaje en vez de solo la raíz del sitio.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url
  if (!url) return

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url === url)
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    }),
  )
})
