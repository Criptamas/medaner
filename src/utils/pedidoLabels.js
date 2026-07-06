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
