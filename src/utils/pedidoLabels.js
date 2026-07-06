export const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

export const PAYMENT_LABELS = {
  efectivo: 'Efectivo',
  pago_movil: 'Pago móvil',
  zelle: 'Zelle',
}

export const ESTADO_BADGE_LABELS = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_camino: 'En camino',
  entregado: 'Entregado',
}
