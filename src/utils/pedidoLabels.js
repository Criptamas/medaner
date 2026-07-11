export const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

export const PAYMENT_LABELS = {
  efectivo: 'Efectivo',
  pago_movil: 'Pago móvil',
  zelle: 'Zelle',
}

// Forma de lista para poblar <select> de método de pago, derivada de
// PAYMENT_LABELS para que no puedan divergir las opciones y sus etiquetas.
export const PAYMENT_METHODS = Object.entries(PAYMENT_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export const ESTADO_BADGE_LABELS = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_camino: 'En camino',
  entregado: 'Entregado',
}

// Labels descriptivos del estado de un viaje (distinto flujo al de pedidos:
// pendiente → confirmado → en_curso → completado). Los usan tanto el
// seguimiento de viaje como "Mis pedidos recientes".
export const VIAJE_ESTADO_LABELS = {
  pendiente: 'Buscando un conductor',
  confirmado: 'Tu conductor va en camino',
  en_curso: 'Viaje en curso',
  completado: 'Viaje completado',
}

// Etiqueta del estado terminal "cancelado" del viaje. Se deja APARTE de
// VIAJE_ESTADO_LABELS a propósito: ese objeto alimenta los pasos de un
// progreso lineal (pendiente → confirmado → en_curso → completado) y
// "cancelado" no es un paso de ese avance, sino una rama terminal alternativa.
// Meterlo ahí agregaría un "paso" fantasma al indicador de progreso.
export const VIAJE_ESTADO_CANCELADO_LABEL = 'Viaje cancelado'

// Mismas etiquetas que VIAJE_ESTADO_LABELS pero en primera persona del
// conductor (no del cliente), para el detalle de viaje y "Mis viajes activos".
export const VIAJE_ESTADO_BADGE_LABELS = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_curso: 'En curso',
  completado: 'Completado',
}
