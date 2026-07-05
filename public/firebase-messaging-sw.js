// Service worker for Firebase Cloud Messaging background notifications.
// Loaded as a static file, so it can't read Vite env vars — the values
// below are the same public Firebase config used in src/firebase.js.
// (Firebase web config values identify the project; they are not secrets,
// access is controlled by Firebase security rules, not by hiding these.)
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
  })
})
