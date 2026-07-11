// Combina la referencia manual (calle/punto conocido, la escribe el cliente)
// con el nombre geocodificado (municipio/estado que resuelve Mapbox) en un
// único texto corto para mostrar en inputs/pills. Misma idea que
// combinarDireccion() de useCreateViaje.js, pero esa vive privada ahí (arma
// el string que se GUARDA en el viaje) — esta es la versión de UI, reusada acá
// por SolicitudViajeView (texto del input) y MapaConductoresView (texto de
// las pills), para no duplicar la misma concatenación en dos componentes.
export function formatUbicacionCorta(ubicacion) {
  if (!ubicacion) return null

  const referencia = (ubicacion.referencia ?? '').trim()
  const nombre = (ubicacion.nombre ?? '').trim()

  if (referencia && nombre) return `${referencia} — ${nombre}`
  return referencia || nombre || null
}
