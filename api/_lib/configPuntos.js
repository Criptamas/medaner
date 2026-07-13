// Lectura de configuracion/puntos (spec/09 §1) con defaults, compartida por
// otorgar-puntos.js y notificar-viaje.js. El doc se crea A MANO en la
// consola de Firebase (igual que configuracion/tarifas, ver spec/07) — hasta
// que eso pase, o si alguien lo crea incompleto, cada campo cae a su default
// individual en vez de tumbar el endpoint con datos faltantes.
const DEFAULTS = {
  tramos: [
    { hasta: 1, puntos: 20 },
    { hasta: 2, puntos: 10 },
    { hasta: 3, puntos: 5 },
  ],
  topeDiario: 60,
  umbralPrioridad: 2,
  ventanaPrioridadSegundos: 8,
  topPrioridad: 3,
}

export async function getConfigPuntos(db) {
  const snap = await db.collection('configuracion').doc('puntos').get()
  const data = snap.exists ? snap.data() : {}

  return {
    tramos: Array.isArray(data.tramos) ? data.tramos : DEFAULTS.tramos,
    topeDiario: typeof data.topeDiario === 'number' ? data.topeDiario : DEFAULTS.topeDiario,
    umbralPrioridad:
      typeof data.umbralPrioridad === 'number' ? data.umbralPrioridad : DEFAULTS.umbralPrioridad,
    ventanaPrioridadSegundos:
      typeof data.ventanaPrioridadSegundos === 'number'
        ? data.ventanaPrioridadSegundos
        : DEFAULTS.ventanaPrioridadSegundos,
    topPrioridad: typeof data.topPrioridad === 'number' ? data.topPrioridad : DEFAULTS.topPrioridad,
  }
}

// Puntos ganados = primer tramo cuyo "hasta" cubre el precio; si el precio
// supera todos los tramos, no gana puntos (carrera cara, no la necesita).
export function puntosSegunTramos(precioFinal, tramos) {
  const tramo = tramos.find((t) => t.hasta >= precioFinal)
  return tramo ? tramo.puntos : 0
}
