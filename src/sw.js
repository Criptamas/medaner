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

// Los push de este proyecto son data-only (ver api/notificar-viaje.js y
// api/notificar-cambio-estado.js): el título y el cuerpo viajan en payload.data,
// no en payload.notification. Es a propósito — con un payload "notification",
// el SDK de FCM muestra la notificación por su cuenta y ADEMÁS invoca este
// handler, con lo que el usuario la vería duplicada. Al ser data-only, esta es
// la única notificación que se muestra.
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, url } = payload.data ?? {}
  self.registration.showNotification(title || 'Medaner', {
    body,
    icon: icon || '/logoprototipo.png',
    data: { url },
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
