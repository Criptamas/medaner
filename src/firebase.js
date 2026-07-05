import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { isSupported, getMessaging } from 'firebase/messaging'

// Storage is intentionally not initialized here — product images are
// served as static files from /public, not from Firebase Storage.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

export const db = getFirestore(app)

// getMessaging() throws in browsers/contexts without push support
// (e.g. Safari private mode, non-HTTPS, SSR), so it's resolved lazily.
export const getFcmMessaging = async () => {
  const supported = await isSupported()
  return supported ? getMessaging(app) : null
}
