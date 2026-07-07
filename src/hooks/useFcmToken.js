import { useState } from 'react'
import { getToken } from 'firebase/messaging'
import { doc, updateDoc } from 'firebase/firestore'
import { db, getFcmMessaging } from '../firebase'

// Pide permiso de notificaciones y guarda el token de este dispositivo en
// conductores/{uid}.fcmToken. Se llama cuando el conductor se pone
// "Disponible" — solo los conductores activos necesitan recibir push.
export function useFcmToken() {
  const [error, setError] = useState(null)

  async function registrarToken(conductorId) {
    setError(null)
    try {
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

      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      })

      if (!token) {
        setError('No pudimos generar el token de notificaciones.')
        return null
      }

      await updateDoc(doc(db, 'conductores', conductorId), { fcmToken: token })
      return token
    } catch (err) {
      setError('No pudimos activar las notificaciones push.')
      throw err
    }
  }

  return { registrarToken, error }
}
