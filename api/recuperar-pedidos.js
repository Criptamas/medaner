import { getAdminDb } from './_lib/firebaseAdmin.js'
import { normalizarTelefono } from '../src/utils/telefono.js'

// Ventana de vigencia: mismo criterio que el seguimiento local del cliente
// (src/utils/seguimientoLocal.js) para que este endpoint devuelva exactamente
// lo mismo que ya vería si no hubiera perdido el localStorage.
const VENTANA_MS = 24 * 60 * 60 * 1000

// Estado final por colección: un pedido/viaje en estado final ya no es
// "activo" y no tiene sentido devolverlo acá (igual que en
// ESTADO_FINAL_POR_TIPO de MisPedidosRecientes.jsx). Todavía no existe el
// estado "cancelado" en ninguno de los dos flujos.
const ESTADO_FINAL_POR_COLECCION = {
  pedidos: 'entregado',
  viajes: 'completado',
}

// Tope defensivo de resultados por colección: este endpoint es público (solo
// requiere conocer un teléfono), así que conviene no dejarlo devolver
// cantidades arbitrarias aunque en la práctica un cliente real tenga pocos
// pedidos/viajes activos a la vez.
const MAX_RESULTADOS = 20

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const { telefono } = req.body ?? {}
  const telefonoNormalizado = normalizarTelefono(telefono)
  if (!telefonoNormalizado) {
    res.status(400).json({ error: 'Falta un teléfono válido (10 dígitos, ej: 04121234567)' })
    return
  }

  const db = getAdminDb()
  const ahoraMs = Date.now()

  try {
    // Buscamos solo por igualdad de teléfono (sin combinar con rango de
    // fecha) para no requerir un índice compuesto por colección: Firestore
    // permite igualdad + un filtro de rango en la misma query solo si hay un
    // índice compuesto creado para esa combinación, y queremos evitar
    // depender de administrar índices en este proyecto. El filtro de fecha y
    // de estado final se aplica en código, sobre el resultado ya acotado por
    // teléfono (que en la práctica es un puñado de documentos por cliente).
    const [pedidosSnap, viajesSnap] = await Promise.all([
      db.collection('pedidos').where('clienteTelefonoNormalizado', '==', telefonoNormalizado).get(),
      db.collection('viajes').where('clienteTelefonoNormalizado', '==', telefonoNormalizado).get(),
    ])

    // Nota: documentos creados antes de agregar clienteTelefonoNormalizado al
    // crear pedidos/viajes no tienen este campo y por lo tanto no aparecerán
    // acá. Es aceptable: ese es el corte a partir del cual el teléfono queda
    // disponible como identificador de recuperación.
    const snapsPorColeccion = [
      ['pedidos', pedidosSnap],
      ['viajes', viajesSnap],
    ]

    const resultados = snapsPorColeccion
      .flatMap(([coleccion, snap]) =>
        snap.docs.map((doc) => ({ coleccion, id: doc.id, data: doc.data() })),
      )
      .filter(({ coleccion, data }) => data.estado !== ESTADO_FINAL_POR_COLECCION[coleccion])
      .filter(({ data }) => {
        const fechaCreacionMs = data.fechaCreacion?.toMillis?.()
        return typeof fechaCreacionMs === 'number' && ahoraMs - fechaCreacionMs < VENTANA_MS
      })
      .slice(0, MAX_RESULTADOS)
      // Respuesta mínima a propósito: el endpoint es público (solo requiere
      // conocer un teléfono), así que NO debe devolver nombre, dirección ni
      // ningún otro dato personal que permita usarlo para enumerar
      // información de clientes. Solo lo necesario para que el frontend
      // reconstruya la entrada de seguimiento local.
      .map(({ coleccion, id, data }) => ({
        id,
        tipo: coleccion === 'pedidos' ? 'pedido' : 'viaje',
        estado: data.estado,
      }))

    res.status(200).json({ resultados })
  } catch {
    // No se filtran detalles internos del error (mensaje de Firestore,
    // stack, etc.) en la respuesta pública.
    res.status(500).json({ error: 'No se pudieron recuperar los pedidos/viajes' })
  }
}
