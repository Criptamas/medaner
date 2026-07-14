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

  // tipoVehiculo es opcional: si no viene, no es un error de validación, es el
  // modo conteo (usado por VehiculoSeleccionSheet para el badge de ambos
  // vehículos a la vez, antes de que exista un viaje/tipo elegido). Si viene,
  // debe ser uno de los valores válidos como hasta ahora.
  const modoConteo = tipoVehiculo === undefined
  if (!modoConteo && !VEHICULOS_VALIDOS.includes(tipoVehiculo)) {
    res.status(400).json({ error: "tipoVehiculo debe ser 'moto' o 'carro'" })
    return
  }

  try {
    const db = getAdminDb()
    const origen = { lat, lng }

    // Fetch + filtro de distancia compartidos por ambos modos: el modo detalle
    // (identidad) y el modo conteo parten del mismo universo de conductores
    // "candidatos" (activos, con ubicación, dentro del radio), solo difieren
    // en qué hacen con ellos después.
    const candidatos = await obtenerConductoresCandidatos(db, origen)

    if (modoConteo) {
      // Sin identidad ni orden por puntos: es un número por vehículo, no una
      // lista de vitrina, así que no aplica ninguno de los recortes de
      // privacidad/paginación del modo detalle (spec/08 §2 no cubre este modo,
      // se documenta aparte).
      const conteo = { moto: 0, carro: 0 }
      for (const { conductor } of candidatos) {
        if (conductor.vehiculo === 'moto' || conductor.vehiculo === 'carro') {
          conteo[conductor.vehiculo] += 1
        }
      }
      res.status(200).json({ conteo })
      return
    }

    const semanaActual = semanaISOActual()

    const conductores = candidatos
      .filter(({ conductor }) => conductor.vehiculo === tipoVehiculo)
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

// Candidatos = activos + con ubicación + dentro del radio, sin filtrar aún por
// tipo de vehículo (eso lo decide cada modo). Extraído porque tanto el modo
// detalle como el modo conteo parten de exactamente este mismo universo.
async function obtenerConductoresCandidatos(db, origen) {
  const conductoresSnap = await db.collection('conductores').where('activo', '==', true).get()

  return conductoresSnap.docs
    .map((doc) => doc.data())
    // A diferencia de notificar-viaje.js (que prefiere sobre-notificar a
    // conductores sin ubicación), acá SÍ se excluyen: sin coords no hay
    // distancia (ni ETA en modo detalle) que mostrarle al cliente, y esta
    // pantalla es informativa, no un intento de matching (spec/08 §2).
    .filter((conductor) => conductor.ubicacion)
    .map((conductor) => ({
      conductor,
      distanciaKm: haversineKm(conductor.ubicacion, origen),
    }))
    .filter(({ distanciaKm }) => distanciaKm <= RADIO_KM)
}
