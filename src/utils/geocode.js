// Geocodificación inversa desde el navegador: convierte coordenadas en una
// dirección legible (ej. "Calle Comercio, Punto Fijo") para guardarla junto
// al viaje/pedido en vez de solo lat/lng. Mismo servicio que usa el backend
// en api/_lib/mapbox.js, pero con el token público del cliente.
//
// Nunca lanza: la geocodificación es un "nice to have" (mejora la
// notificación push y lo que ve el conductor), nunca debe bloquear ni
// retrasar la creación del viaje/pedido — el usuario puede estar con
// conexión inestable justo en ese momento (offline-first). Ante cualquier
// falla devolvemos null y quien llama cae de vuelta a mostrar coordenadas.
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN

export async function reverseGeocode(lat, lng) {
  if (!mapboxToken) return null

  try {
    // types= limita el resultado a niveles legibles para el cliente y
    // excluye "postcode" y "country". Sin este filtro, Mapbox no tiene datos
    // de calle/POI/barrio para Falcón y su "best match" termina eligiendo el
    // código postal (ej. "41") en vez del municipio, dando resultados tipo
    // "Carirubana, Falcón, 41, Venezuela". "country" se excluye porque es
    // ruido redundante (la app opera solo en Venezuela). Si Mapbox mejora su
    // cobertura para esta zona más adelante, este mismo filtro empieza a
    // devolver address/poi/neighborhood automáticamente, sin tocar código.
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&limit=1&language=es&types=address,poi,neighborhood,locality,place,region`
    const response = await fetch(url)
    if (!response.ok) return null

    const data = await response.json()
    const placeName = data.features?.[0]?.place_name
    if (!placeName) return null
    // Quita el ", Venezuela" final: ruido redundante en una app que solo
    // opera en Venezuela.
    return placeName.replace(/,\s*Venezuela$/i, '')
  } catch {
    return null
  }
}
