import { getAdminDb, getAdminMessaging } from './_lib/firebaseAdmin.js'
import { haversineKm } from './_lib/geo.js'
import { reverseGeocode } from './_lib/mapbox.js'

// Radio de búsqueda de conductores cercanos. Punto Fijo es una ciudad
// mediana; 5 km cubre casco urbano sin notificar a media ciudad. Ajustar
// acá si en la práctica queda corto o largo.
const RADIO_NOTIFICACION_KM = 5

const VEHICULO_LABELS = {
  moto: 'Moto',
  carro: 'Carro',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const { viajeId } = req.body ?? {}
  if (!viajeId) {
    res.status(400).json({ error: 'Falta viajeId' })
    return
  }

  const db = getAdminDb()

  // No confiamos en datos del cliente más allá del ID: releemos el viaje
  // real desde Firestore con Admin SDK para no poder ser usados para
  // spamear notificaciones con contenido arbitrario.
  const viajeSnap = await db.collection('viajes').doc(viajeId).get()
  if (!viajeSnap.exists) {
    res.status(404).json({ error: 'Viaje no encontrado' })
    return
  }

  const viaje = viajeSnap.data()
  if (viaje.estado !== 'pendiente') {
    res.status(409).json({ error: 'El viaje ya no está pendiente' })
    return
  }

  const conductoresSnap = await db.collection('conductores').where('activo', '==', true).get()

  const cercanos = conductoresSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((conductor) => conductor.ubicacion && conductor.fcmToken)
    .map((conductor) => ({
      ...conductor,
      distanciaKm: haversineKm(conductor.ubicacion, viaje.origen),
    }))
    .filter((conductor) => conductor.distanciaKm <= RADIO_NOTIFICACION_KM)

  if (cercanos.length === 0) {
    res.status(200).json({ notificados: 0 })
    return
  }

  // Preferimos el nombre legible que ya trae el viaje (geocoding hecho en
  // el navegador al crearlo, ver src/utils/geocode.js) y solo llamamos a
  // Mapbox acá si vino vacío (viaje viejo sin el campo, o el geocoding del
  // cliente falló) — evita una llamada duplicada y latencia extra en cada
  // notificación push. Promise.all conserva el paralelismo cuando sí hace
  // falta geocodificar ambos puntos.
  const [direccionOrigen, direccionDestino] = await Promise.all([
    viaje.origenNombre?.trim()
      ? viaje.origenNombre
      : reverseGeocode(viaje.origen.lat, viaje.origen.lng),
    viaje.destinoNombre?.trim()
      ? viaje.destinoNombre
      : reverseGeocode(viaje.destino.lat, viaje.destino.lng),
  ])

  const tipoVehiculoLabel = VEHICULO_LABELS[viaje.tipoVehiculo] ?? viaje.tipoVehiculo
  const link = `${process.env.APP_BASE_URL}/conductor/viaje/${viajeId}`

  // distanciaKm solo existe en viajes creados con la cotización de precio
  // (feature reciente); viajes legacy no lo tienen. Si falta, no anteponemos
  // nada al body en vez de arriesgarnos a mostrar "NaN km".
  const distanciaPrefix =
    typeof viaje.distanciaKm === 'number' ? `~${Math.round(viaje.distanciaKm)} km — ` : ''

  const message = {
    notification: {
      title: `Nuevo viaje en ${tipoVehiculoLabel} cerca tuyo`,
      body: `${distanciaPrefix}Desde ${direccionOrigen} hasta ${direccionDestino}`,
    },
    data: {
      viajeId,
      tipoVehiculo: viaje.tipoVehiculo,
      url: link,
    },
    webpush: {
      fcmOptions: { link },
    },
    tokens: cercanos.map((conductor) => conductor.fcmToken),
  }

  const messaging = getAdminMessaging()
  const resultado = await messaging.sendEachForMulticast(message)

  // Limpieza best-effort de tokens muertos (app desinstalada, permiso
  // revocado, etc.) para no seguir intentando enviarles en el futuro.
  const TOKEN_ERRORS_INVALIDOS = [
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
  ]

  const conductoresConTokenInvalido = resultado.responses
    .map((response, index) => ({ response, conductor: cercanos[index] }))
    .filter(({ response }) => !response.success && TOKEN_ERRORS_INVALIDOS.includes(response.error?.code))
    .map(({ conductor }) => conductor)

  await Promise.all(
    conductoresConTokenInvalido.map((conductor) =>
      db.collection('conductores').doc(conductor.id).update({ fcmToken: '' }),
    ),
  )

  res.status(200).json({ notificados: resultado.successCount })
}
