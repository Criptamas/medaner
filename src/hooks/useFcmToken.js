import { useState } from 'react'
import { getToken } from 'firebase/messaging'
import { doc, updateDoc } from 'firebase/firestore'
import { db, getFcmMessaging } from '../firebase'

// Cuánto esperamos a que el service worker quede activo antes de rendirnos.
// Solo se agota cuando NO hay ningún SW registrado (ver abajo); con uno
// registrado, `ready` resuelve en milisegundos.
const SW_TIMEOUT_MS = 5000

// getToken() necesita saber qué service worker va a recibir los push. Si no se
// lo pasamos, Firebase intenta registrar uno propio en /firebase-messaging-sw.js
// — archivo que NO existe en este proyecto a propósito: el handler de FCM en
// background vive dentro de src/sw.js, fusionado con el precacheo de la PWA
// para no tener dos SW compitiendo en la ruta raíz (ver vite.config.js).
// Sin este registro explícito, getToken revienta con
// messaging/failed-service-worker-registration y nunca se genera un token,
// aunque el permiso del navegador esté concedido.
//
// navigator.serviceWorker.ready espera a que el SW esté activo (evita la
// carrera con el registerSW() de main.jsx si el usuario toca el switch apenas
// carga la página), pero NUNCA resuelve si no hay ninguno registrado — que es
// justo lo que pasa con `npm run dev`, donde vite-plugin-pwa no sirve el SW.
// De ahí el timeout: preferimos fallar con un mensaje claro antes que dejar
// colgado al flujo que nos llama (el switch "Disponible", el crear viaje).
async function obtenerRegistroServiceWorker() {
  if (!('serviceWorker' in navigator)) return null

  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), SW_TIMEOUT_MS))
  return Promise.race([navigator.serviceWorker.ready, timeout])
}

// Pide permiso de notificaciones y guarda el token de este dispositivo en
// conductores/{uid}.fcmToken. Se llama cuando el conductor se pone
// "Disponible" — solo los conductores activos necesitan recibir push.
export function useFcmToken() {
  const [error, setError] = useState(null)

  // Parte reusable de "pedir permiso + obtener token", sin el updateDoc: el
  // cliente (que no tiene doc en Firestore hasta crear el viaje) también la
  // necesita para adjuntar el token al crear su viaje (ver useCreateViaje).
  async function pedirPermisoYToken() {
    const messaging = await getFcmMessaging()
    if (!messaging) {
      setError('Este navegador no soporta notificaciones push.')
      return null
    }

    const permiso = await Notification.requestPermission()
    if (permiso !== 'granted') {
      setError('No diste permiso de notificaciones — no vas a recibir avisos de viajes nuevos.')
      return null
    }

    const serviceWorkerRegistration = await obtenerRegistroServiceWorker()
    if (!serviceWorkerRegistration) {
      setError('Las notificaciones push necesitan la app compilada (no funcionan en modo desarrollo).')
      return null
    }

    // Todo el manejo de errores de este hook degrada a null en vez de romper
    // el flujo que lo llama, así que sin este log el motivo real (VAPID key
    // inválida, SW mal registrado, proyecto de Firebase equivocado) queda
    // invisible en la consola. No quitarlo: es la única pista al depurar.
    let token
    try {
      token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration,
      })
    } catch (err) {
      console.error('[FCM] getToken falló:', err)
      setError('No pudimos generar el token de notificaciones.')
      return null
    }

    if (!token) {
      setError('No pudimos generar el token de notificaciones.')
      return null
    }

    return token
  }

  async function registrarToken(conductorId) {
    setError(null)
    try {
      const token = await pedirPermisoYToken()
      if (!token) return null

      await updateDoc(doc(db, 'conductores', conductorId), { fcmToken: token })
      return token
    } catch (err) {
      console.error('[FCM] registrarToken falló:', err)
      setError('No pudimos activar las notificaciones push.')
      throw err
    }
  }

  return { registrarToken, obtenerToken: pedirPermisoYToken, error }
}
