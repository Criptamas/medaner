import { getAdminDb, getAdminMessaging } from './_lib/firebaseAdmin.js'
import { construirUrlApp } from './_lib/appUrl.js'
import { getConfigPuntos } from './_lib/configPuntos.js'
import { haversineKm } from './_lib/geo.js'
import { reverseGeocode } from './_lib/mapbox.js'
import { semanaISOActual } from './_lib/semana.js'

// Radio de búsqueda de conductores cercanos. Punto Fijo es una ciudad
// mediana; 5 km cubre casco urbano sin notificar a media ciudad. Ajustar
// acá si en la práctica queda corto o largo.
const RADIO_NOTIFICACION_KM = 5

const VEHICULO_LABELS = {
  moto: 'Moto',
  carro: 'Carro',
}

// Códigos de error de FCM que indican que el token ya no sirve (app
// desinstalada, permiso revocado, etc.) — mismos que usa
// notificar-cambio-estado.js. A nivel de módulo (antes solo vivía dentro del
// handler) porque ahora enviarPushYLimpiarTokens() la usa desde dos
// llamadas distintas (tanda prioritaria + resto) en la rama de viaje caro.
const TOKEN_ERRORES_INVALIDOS = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Envía el push a un subconjunto de destinatarios y limpia tokens muertos.
// Extraído del handler porque el push escalonado (spec/09 §4) llama esto dos
// veces (tanda prioritaria, luego el resto) y el push normal una sola vez —
// misma lógica de envío + limpieza en los tres casos, no hay motivo para
// duplicarla.
async function enviarPushYLimpiarTokens(db, messaging, destinatarios, data, viajeId) {
  // sendEachForMulticast exige al menos 1 token; con la lista vacía (ej. la
  // tanda prioritaria agotó a todos los destinatarios y no queda "resto")
  // no hay nada que enviar.
  if (destinatarios.length === 0) return 0

  const resultado = await messaging.sendEachForMulticast({
    data,
    tokens: destinatarios.map((conductor) => conductor.fcmToken),
  })

  // sendEachForMulticast no lanza: los fallos vienen dentro de responses. Sin
  // este log, un mensaje mal formado (o credenciales malas) se veía como
  // "notificados: 0" y nada más, sin pista del motivo.
  if (resultado.failureCount > 0) {
    const motivos = resultado.responses
      .filter((response) => !response.success)
      .map((response) => response.error?.code ?? 'desconocido')
    console.error('[FCM] fallos al notificar el viaje', viajeId, motivos)
  }

  // Limpieza best-effort de tokens muertos (app desinstalada, permiso
  // revocado, etc.) para no seguir intentando enviarles en el futuro.
  const conductoresConTokenInvalido = resultado.responses
    .map((response, index) => ({ response, conductor: destinatarios[index] }))
    .filter(
      ({ response }) => !response.success && TOKEN_ERRORES_INVALIDOS.includes(response.error?.code),
    )
    .map(({ conductor }) => conductor)

  await Promise.all(
    conductoresConTokenInvalido.map((conductor) =>
      db.collection('conductores').doc(conductor.id).update({ fcmToken: '' }),
    ),
  )

  return resultado.successCount
}

// El push escalonado agrega un sleep de hasta `ventanaPrioridadSegundos`
// dentro de la misma invocación (spec/09 §4) — el maxDuration por defecto de
// Vercel (10s en Hobby) no alcanza. Solo aplica a viajes caros (baja
// frecuencia), así que no es un costo por viaje típico.
export const config = { maxDuration: 15 }

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

  // Un conductor solo puede recibir push si tiene token; sin eso no hay a
  // dónde mandar nada.
  const activosConToken = conductoresSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((conductor) => conductor.fcmToken)

  // Destinatarios:
  //  - Con ubicación conocida → filtramos por distancia real (radio).
  //  - SIN ubicación (el GPS no se escribió todavía: permiso recién dado,
  //    useTrackDriverLocation aún sin primer fix, etc.) → NO podemos medir la
  //    distancia, pero preferimos notificar igual. Excluirlos en silencio era
  //    la causa de conductores "activos y con permiso de push" que no recibían
  //    NADA. Mejor sobre-notificar que perder un viaje. (Revisable a escala:
  //    cuando haya muchos conductores, restringir este fallback por ciudad.)
  const destinatarios = activosConToken.filter((conductor) => {
    if (!conductor.ubicacion) return true
    return haversineKm(conductor.ubicacion, viaje.origen) <= RADIO_NOTIFICACION_KM
  })

  if (destinatarios.length === 0) {
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
  const url = construirUrlApp(`/conductor/viaje/${viajeId}`)

  // distanciaKm solo existe en viajes creados con la cotización de precio
  // (feature reciente); viajes legacy no lo tienen. Si falta, no anteponemos
  // nada al body en vez de arriesgarnos a mostrar "NaN km".
  const distanciaPrefix =
    typeof viaje.distanciaKm === 'number' ? `~${Math.round(viaje.distanciaKm)} km — ` : ''

  // Payload data-only a propósito (sin la clave "notification"), mismo
  // motivo que en notificar-cambio-estado.js: con "notification" el SDK de
  // FCM muestra la notificación por su cuenta y ADEMÁS llama a
  // onBackgroundMessage() en src/sw.js, que la vuelve a mostrar → duplicada.
  // El texto es el mismo sin importar la rama (prioritaria o no) — lo único
  // que cambia entre viaje barato/caro es QUIÉN y CUÁNDO lo recibe.
  const data = {
    title: `Nuevo viaje en ${tipoVehiculoLabel} cerca tuyo`,
    body: `${distanciaPrefix}Desde ${direccionOrigen} hasta ${direccionDestino}`,
    viajeId,
    tipoVehiculo: viaje.tipoVehiculo,
    // Los valores de "data" deben ser strings; si no pudimos armar la URL,
    // omitimos la clave en vez de mandar null (FCM rechaza el mensaje).
    ...(url ? { url } : {}),
  }

  const messaging = getAdminMessaging()
  const { umbralPrioridad, ventanaPrioridadSegundos, topPrioridad } = await getConfigPuntos(db)

  // Viaje barato (o config sin crear todavía, ver default en
  // configPuntos.js): comportamiento actual sin cambios, a todos de una.
  if ((viaje.precioFinal ?? 0) <= umbralPrioridad) {
    const notificados = await enviarPushYLimpiarTokens(db, messaging, destinatarios, data, viajeId)
    res.status(200).json({ notificados })
    return
  }

  // Viaje caro: primer derecho a aceptar para los conductores con más
  // puntos efectivos (spec/09 §4) — push escalonado en dos tandas dentro de
  // la misma invocación.
  const semanaActual = semanaISOActual()
  const destinatariosOrdenados = [...destinatarios].sort((a, b) => {
    const puntosA = a.semanaPuntos === semanaActual ? (a.puntos ?? 0) : 0
    const puntosB = b.semanaPuntos === semanaActual ? (b.puntos ?? 0) : 0
    return puntosB - puntosA
  })

  const tandaPrioritaria = destinatariosOrdenados.slice(0, topPrioridad)
  const resto = destinatariosOrdenados.slice(topPrioridad)

  const notificadosPrioritarios = await enviarPushYLimpiarTokens(
    db,
    messaging,
    tandaPrioritaria,
    data,
    viajeId,
  )

  // Clamp defensivo: ventanaPrioridadSegundos es un valor de
  // configuracion/puntos editable a mano en consola, sin validación de
  // rango. Sin este tope, un valor mal cargado (ej. 60) se comería el
  // maxDuration de 15s de esta función — Vercel mataría la invocación a la
  // mitad del sleep y la tanda "resto" nunca se enviaría, sin ningún log ni
  // aviso. 10s deja margen para el resto del trabajo (FCM, Mapbox arriba).
  const ventanaMs = Math.min(Math.max(ventanaPrioridadSegundos, 0), 10) * 1000
  await sleep(ventanaMs)

  // Si para cuando termina la ventana ya hay un conductor asignado (o el
  // viaje se canceló), no tiene sentido despertar al resto: perdería la
  // ventaja el conductor que ya lo aceptó y solo generaría ruido/carreras
  // rechazadas.
  const viajeReleido = await db.collection('viajes').doc(viajeId).get()
  if (!viajeReleido.exists || viajeReleido.data().estado !== 'pendiente') {
    res.status(200).json({ notificados: notificadosPrioritarios })
    return
  }

  const notificadosResto = await enviarPushYLimpiarTokens(db, messaging, resto, data, viajeId)
  res.status(200).json({ notificados: notificadosPrioritarios + notificadosResto })
}
