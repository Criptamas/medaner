import {
  aprobarConductor,
  rechazarConductor,
  solicitudesConductor,
  tiendas,
  toggleTienda,
  editarConductor,
} from './_lib/adminHandlers.js'

// Router único del panel de admin. Consolida lo que antes eran 6 endpoints
// separados (api/admin-*.js) en UNA sola función serverless, para no pasarnos
// del tope de 12 funciones del plan Hobby de Vercel (cada archivo en /api es
// una función; los de /api/_lib no cuentan). Cada operación se elige con
// ?action=; la lógica vive en _lib/adminHandlers.js y no cambió al mover.
//
// El método (GET/POST) lo valida cada handler, igual que antes. La `action`
// se lee del query string (funciona con cualquier método, a diferencia del
// body que solo existe en POST).
const ACCIONES = {
  'aprobar-conductor': aprobarConductor,
  'rechazar-conductor': rechazarConductor,
  'solicitudes-conductor': solicitudesConductor,
  tiendas,
  'toggle-tienda': toggleTienda,
  'editar-conductor': editarConductor,
}

export default async function handler(req, res) {
  const { action } = req.query
  const handlerAccion = ACCIONES[action]

  if (!handlerAccion) {
    res.status(400).json({ error: `action inválida o faltante: "${action ?? ''}"` })
    return
  }

  return handlerAccion(req, res)
}
