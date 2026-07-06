const STORAGE_KEY = 'medaner_pedidos_activos'
const VENTANA_MS = 24 * 60 * 60 * 1000 // 24 horas

// No hay cuentas de cliente: el "ancla" de seguimiento de un pedido/viaje
// es el navegador, no un usuario logueado. Por eso se guarda acá y no en
// Firestore ni en el estado de un componente.

function guardar(entradas) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entradas))
}

// Lee las entradas vigentes (menos de 24h). Si el JSON está corrupto o el
// dato guardado no es el array esperado, se descarta todo en vez de romper
// la lectura. El resultado filtrado se vuelve a persistir para no repetir
// este trabajo con entradas ya vencidas en cada lectura futura.
export function leerPedidosActivos() {
  let entradas
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    entradas = raw ? JSON.parse(raw) : []
    if (!Array.isArray(entradas)) entradas = []
  } catch {
    entradas = []
  }

  const ahora = Date.now()
  const vigentes = entradas.filter(
    (entrada) =>
      entrada &&
      typeof entrada.id === 'string' &&
      (entrada.tipo === 'pedido' || entrada.tipo === 'viaje') &&
      typeof entrada.createdAt === 'number' &&
      ahora - entrada.createdAt < VENTANA_MS,
  )

  if (vigentes.length !== entradas.length) {
    guardar(vigentes)
  }

  return vigentes
}

// Agrega una entrada nueva conservando las vigentes, deduplicando por id
// (por si se reintenta la creación del mismo pedido/viaje).
export function agregarPedidoActivo({ id, tipo }) {
  const vigentes = leerPedidosActivos().filter((entrada) => entrada.id !== id)
  guardar([...vigentes, { id, tipo, createdAt: Date.now() }])
}

// Elimina una entrada puntual (pedido entregado, viaje completado, o el
// documento ya no existe en Firestore).
export function eliminarPedidoActivo(id) {
  const vigentes = leerPedidosActivos().filter((entrada) => entrada.id !== id)
  guardar(vigentes)
}
