// Distancia y duración reales de manejo (no línea recta) entre dos puntos,
// vía Mapbox Directions API. Mismo patrón que reverseGeocode en geocode.js
// (fetch simple con el token público del cliente, try/catch), pero con una
// diferencia importante: reverseGeocode es "nice to have" y nunca bloquea,
// mientras que acá el resultado SÍ es crítico porque el precio del viaje
// depende de la distancia real. Quien llama a getRouteDistance debe tratar
// un `null` como error visible con opción de reintentar — nunca asumir
// distancia 0 (inventaría un precio incorrecto) ni crear el viaje en silencio.
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN

export async function getRouteDistance(origen, destino) {
  if (!mapboxToken || !origen || !destino) return null

  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origen.lng},${origen.lat};${destino.lng},${destino.lat}?geometries=geojson&access_token=${mapboxToken}`
    const response = await fetch(url)
    if (!response.ok) return null

    const data = await response.json()
    const ruta = data.routes?.[0]
    if (!ruta) return null

    return {
      distanceKm: ruta.distance / 1000,
      durationMin: ruta.duration / 60,
    }
  } catch {
    return null
  }
}
