// Helpers de fecha para el sistema de puntos (ver spec/09-puntos-conductores.md).
// Sin dependencias nuevas a propósito (limitación de hardware local, ver
// CLAUDE.md): todo con el Date nativo.
//
// Nota de huso horario: se usa la hora del servidor (Vercel corre en UTC),
// no America/Caracas (UTC-4). Para el reset SEMANAL el desfase es
// irrelevante casi siempre (una semana ISO dura 7 días; el único borde es el
// domingo 20:00-23:59 VET, que para el servidor ya es lunes UTC — un
// conductor podría ver su contador reiniciarse ~4h antes de la medianoche
// local un domingo). Para el tope DIARIO (`fechaPuntosHoy`) el mismo desfase
// significa que el "día" del servidor no calza exacto con el día en Punto
// Fijo. Ninguno de los dos es crítico (topeDiario es una salvaguarda
// anti-abuso, no un cálculo financiero exacto) — anotado como posible ajuste
// futuro en spec/07-pendientes.md si en la práctica genera confusión visible.

// Semana ISO-8601 actual como 'AAAA-Www' (ej. '2026-W29'). El año que se usa
// es el del JUEVES de esa semana (regla ISO-8601: la semana 1 es la que
// contiene el primer jueves del año) — por eso no alcanza con
// `fecha.getFullYear()` directo cerca de fin/inicio de año.
export function semanaISOActual() {
  const ahora = new Date()

  // Normalizamos a medianoche UTC para no arrastrar horas/minutos al hacer
  // aritmética de días más abajo.
  const fecha = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()))

  // getUTCDay(): 0=domingo..6=sábado. ISO quiere 1=lunes..7=domingo.
  const diaISO = fecha.getUTCDay() || 7

  // Mueve la fecha al jueves de ESTA semana (lunes + 3 días = jueves).
  fecha.setUTCDate(fecha.getUTCDate() + 4 - diaISO)

  const anioISO = fecha.getUTCFullYear()
  const primerDiaDelAnio = new Date(Date.UTC(anioISO, 0, 1))
  const numeroSemana = Math.ceil(((fecha - primerDiaDelAnio) / 86400000 + 1) / 7)

  return `${anioISO}-W${String(numeroSemana).padStart(2, '0')}`
}

// Fecha de hoy como 'AAAA-MM-DD', usada para el tope diario de puntos
// (`fechaPuntosHoy`). Con hora del servidor (ver nota de huso horario arriba).
export function fechaHoyISO() {
  const ahora = new Date()
  const anio = ahora.getUTCFullYear()
  const mes = String(ahora.getUTCMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getUTCDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}
