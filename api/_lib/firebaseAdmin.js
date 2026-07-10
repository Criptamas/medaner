import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { getAuth } from 'firebase-admin/auth'

// Vercel puede reutilizar la misma instancia de función entre invocaciones
// ("warm start"); sin este guard, cada invocación intentaría reinicializar
// la app de Admin SDK y fallaría.
function getAdminApp() {
  if (getApps().length > 0) return getApps()[0]

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      // Vercel guarda \n como texto literal en variables de entorno multilínea.
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export function getAdminDb() {
  return getFirestore(getAdminApp())
}

export function getAdminMessaging() {
  return getMessaging(getAdminApp())
}

export function getAdminAuth() {
  return getAuth(getAdminApp())
}
