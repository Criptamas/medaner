import { getAdminDb, getAdminMessaging } from './_lib/firebaseAdmin.js'
import { construirUrlApp } from './_lib/appUrl.js'

// Códigos de error de FCM que indican que el token ya no sirve (app
// desinstalada, permiso revocado, etc.) — mismos que usa notificar-viaje.js.
const TOKEN_ERRORS_INVALIDOS = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]

// Texto del push según el estado nuevo del viaje. No hay caso para
// "pendiente" (todavía no hay conductor asignado que lo dispare) ni para
// valores desconocidos: en esos casos el handler no envía nada.
// "confirmado" y "en_curso" están redactados a propósito para no sonar
// redundantes vistos en secuencia: confirmado avisa que un conductor va en
// camino a buscarte, en_curso avisa que el viaje ya arrancó hacia el destino.
function construirNotificacion(nuevoEstado, viaje) {
  switch (nuevoEstado) {
    case 'confirmado': {
      const nombreConductor = viaje.conductorNombre?.trim()
      return {
        title: 'Un conductor aceptó tu viaje',
        body: nombreConductor
          ? `${nombreConductor} va en camino a buscarte`
          : 'Un conductor va en camino a buscarte',
      }
    }
    case 'en_curso':
      return {
        title: 'Tu viaje ha comenzado',
        body: 'Ya vas en camino a tu destino',
      }
    case 'completado':
      return {
        title: 'Tu viaje ha finalizado',
        body: 'Gracias por viajar con Medaner',
      }
    default:
      return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const { viajeId, nuevoEstado } = req.body ?? {}
  if (!viajeId || !nuevoEstado) {
    res.status(400).json({ error: 'Falta viajeId o nuevoEstado' })
    return
  }

  const db = getAdminDb()

  // No confiamos en más datos del cliente que el ID y el estado a notificar:
  // releemos el viaje real desde Firestore con Admin SDK, mismo motivo que
  // notificar-viaje.js (evitar que alguien spamee notificaciones con
  // contenido arbitrario, ej. un conductorNombre falso).
  const viajeSnap = await db.collection('viajes').doc(viajeId).get()
  if (!viajeSnap.exists) {
    res.status(404).json({ error: 'Viaje no encontrado' })
    return
  }

  const viaje = viajeSnap.data()

  // Sin token no hay a quién notificar: es el caso normal de un cliente que
  // no dio permiso de notificaciones (no tiene cuenta ni login, así que no
  // hay otra forma de avisarle) — no es un error, falla en silencio.
  const fcmTokenCliente = viaje.fcmTokenCliente
  if (!fcmTokenCliente) {
    res.status(200).json({ enviado: false })
    return
  }

  const notificacion = construirNotificacion(nuevoEstado, viaje)
  if (!notificacion) {
    // nuevoEstado no reconocido (no debería pasar): no hay texto que enviar.
    res.status(200).json({ enviado: false })
    return
  }

  const url = construirUrlApp(`/viaje/${viajeId}`)

  const message = {
    // Payload data-only a propósito (sin la clave "notification"). Si mandamos
    // "notification", el SDK de FCM muestra la notificación por su cuenta Y
    // ADEMÁS llama a onBackgroundMessage() en src/sw.js, que la vuelve a
    // mostrar: el usuario la ve duplicada (ver onPush en @firebase/messaging).
    // Con data-only, el único que la muestra es nuestro service worker, y de
    // paso controlamos el ícono y la URL de destino.
    data: {
      title: notificacion.title,
      body: notificacion.body,
      viajeId,
      estado: nuevoEstado,
      // Los valores de "data" deben ser strings; si no pudimos armar la URL,
      // omitimos la clave en vez de mandar null (FCM rechaza el mensaje).
      ...(url ? { url } : {}),
    },
    token: fcmTokenCliente,
  }

  const messaging = getAdminMessaging()

  try {
    // A diferencia de sendEachForMulticast (usado en notificar-viaje.js para
    // varios conductores), send() es 1:1 y rechaza la promesa si el token es
    // inválido — por eso acá sí hace falta el try/catch, para poder leer el
    // código de error y limpiar el token muerto.
    await messaging.send(message)
    res.status(200).json({ enviado: true })
  } catch (err) {
    // El envío es best-effort y el cliente ignora la respuesta, así que sin
    // este log el motivo real del fallo no queda registrado en ningún lado.
    console.error('[FCM] send() falló para el viaje', viajeId, err.code, err.message)

    if (TOKEN_ERRORS_INVALIDOS.includes(err.code)) {
      // Limpieza best-effort: si falla, no bloquea la respuesta al cliente.
      await db.collection('viajes').doc(viajeId).update({ fcmTokenCliente: '' }).catch(() => {})
    }
    // Cualquier otro motivo de falla (Messaging caído, red, etc.): no
    // tumbamos el endpoint con un 500 sin sentido ni reintentamos, solo
    // avisamos que no se pudo enviar.
    res.status(200).json({ enviado: false })
  }
}
