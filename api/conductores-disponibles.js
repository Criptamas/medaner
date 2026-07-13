import { getAdminDb } from './_lib/firebaseAdmin.js'
import { haversineKm } from './_lib/geo.js'
import { semanaISOActual } from './_lib/semana.js'

// Mismo radio que conductores-cerca.js/notificar-viaje.js: Punto Fijo es una
// ciudad mediana, 5 km cubre casco urbano.
const RADIO_KM = 5

// Estimación de ETA por velocidad urbana promedio, no Mapbox Directions por
// conductor (caro y lento en cada tick de polling, ver spec/08 §3).
const FACTOR_DETOUR = 1.3
const VELOCIDAD_KMH = { moto: 25, carro: 20 }

const MAX_ITEMS = 20
const VEHICULOS_VALIDOS = ['moto', 'carro']

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const lat = Number(req.query.lat)
  const lng = Number(req.query.lng)
  const tipoVehiculo = req.query.tipoVehiculo

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: 'Faltan coordenadas válidas' })
    return
  }
  if (!VEHICULOS_VALIDOS.includes(tipoVehiculo)) {
    res.status(400).json({ error: "tipoVehiculo debe ser 'moto' o 'carro'" })
    return
  }

  try {
    const db = getAdminDb()
    const semanaActual = semanaISOActual()
    const origen = { lat, lng }

    const conductoresSnap = await db.collection('conductores').where('activo', '==', true).get()

    const conductores = conductoresSnap.docs
      .map((doc) => doc.data())
      // A diferencia de notificar-viaje.js (que prefiere sobre-notificar a
      // conductores sin ubicación), acá SÍ se excluyen: sin coords no hay
      // distancia ni ETA que mostrarle al cliente, y esta pantalla es una
      // lista visual, no un intento de matching (spec/08 §2).
      .filter((conductor) => conductor.ubicacion)
      .filter((conductor) => conductor.vehiculo === tipoVehiculo)
      .map((conductor) => ({
        conductor,
        distanciaKm: haversineKm(conductor.ubicacion, origen),
      }))
      .filter(({ distanciaKm }) => distanciaKm <= RADIO_KM)
      .map(({ conductor, distanciaKm }) => {
        // Reset perezoso de puntos (spec/09 §3): si el conductor no sumó
        // puntos ESTA semana ISO, su contador visible es 0 aunque el campo
        // "puntos" en Firestore todavía tenga el valor de una semana previa
        // (el reset "de verdad" recién ocurre cuando el conductor completa
        // un viaje, en otorgar-puntos.js).
        const puntosEfectivos = conductor.semanaPuntos === semanaActual ? (conductor.puntos ?? 0) : 0
        const etaMin = Math.max(
          1,
          Math.round(((distanciaKm * FACTOR_DETOUR) / VELOCIDAD_KMH[tipoVehiculo]) * 60),
        )

        // Endpoint público (cliente sin login): solo identidad "de vitrina".
        // NUNCA id/coords/telefono/fcmToken/cedula/cuotaSemanalPagada — esos
        // se filtrarían a cualquiera que abra la pantalla de espera sin
        // haber pedido un viaje siquiera.
        return {
          fotoPerfilUrl: conductor.fotoPerfilUrl ?? '',
          nombre: conductor.nombre ?? '',
          puntos: puntosEfectivos,
          distanciaKm: Math.round(distanciaKm * 10) / 10,
          etaMin,
        }
      })
      .sort((a, b) => b.puntos - a.puntos || a.distanciaKm - b.distanciaKm)
      .slice(0, MAX_ITEMS)

    // Posiciones y puntos cambian mientras el conductor está activo — no
    // cachear esta respuesta (mismo criterio que conductores-cerca.js).
    res.status(200).json({ conductores })
  } catch (err) {
    console.error('[conductores-disponibles] error al listar conductores disponibles', err)
    res.status(500).json({ error: 'No se pudieron cargar los conductores' })
  }
}
