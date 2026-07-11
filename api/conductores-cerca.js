import { getAdminDb } from './_lib/firebaseAdmin.js'
import { haversineKm } from './_lib/geo.js'

// Mismo radio que notificar-viaje.js (RADIO_NOTIFICACION_KM): Punto Fijo es
// una ciudad mediana, 5 km cubre casco urbano sin pintar medio mapa de íconos.
const RADIO_KM = 5

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const lat = Number(req.query.lat)
  const lng = Number(req.query.lng)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: 'Faltan coordenadas válidas' })
    return
  }

  try {
    const db = getAdminDb()
    const conductoresSnap = await db.collection('conductores').where('activo', '==', true).get()

    // Sin ubicación no hay nada que pintar (el conductor todavía no escribió
    // su primer fix de GPS vía useTrackDriverLocation), y "cerca" se mide
    // sobre la posición aproximada, no sobre el punto exacto del pedido.
    const conductores = conductoresSnap.docs
      .map((doc) => doc.data())
      .filter((conductor) => conductor.ubicacion)
      .filter((conductor) => haversineKm(conductor.ubicacion, { lat, lng }) <= RADIO_KM)
      // Endpoint público (el cliente no tiene sesión): solo devolvemos lo
      // mínimo para pintar un ícono en el mapa. Nunca id/nombre/teléfono/
      // placa/fcmToken — esos datos solo se revelan al cliente cuando un
      // conductor específico acepta su viaje (ver conductorNombre/
      // conductorTelefono en el doc del viaje), nunca en un listado abierto.
      .map((conductor) => ({
        lat: conductor.ubicacion.lat,
        lng: conductor.ubicacion.lng,
        // Puede no existir todavía en algunos docs de prueba.
        vehiculo: conductor.vehiculo ?? null,
      }))

    // Posiciones aproximadas y efímeras: se actualizan mientras el conductor
    // está activo (useTrackDriverLocation), no hace falta cachear esta
    // respuesta ni versionarla.
    res.status(200).json({ conductores })
  } catch (err) {
    console.error('[conductores-cerca] error al listar conductores cercanos', err)
    res.status(500).json({ error: 'No se pudieron cargar los conductores' })
  }
}
