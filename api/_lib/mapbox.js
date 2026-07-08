// Geocodificación inversa para que la notificación push muestre una
// dirección legible en vez de coordenadas. Si Mapbox falla o no hay token,
// devolvemos las coordenadas como respaldo en vez de romper el envío.
export async function reverseGeocode(lat, lng) {
  const token = process.env.MAPBOX_TOKEN
  if (!token) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`

  try {
    // types= limita el resultado a niveles legibles para el cliente y
    // excluye "postcode" y "country". Sin este filtro, Mapbox no tiene datos
    // de calle/POI/barrio para Falcón y su "best match" termina eligiendo el
    // código postal (ej. "41") en vez del municipio, dando resultados tipo
    // "Carirubana, Falcón, 41, Venezuela". "country" se excluye porque es
    // ruido redundante (la app opera solo en Venezuela). Mismo filtro que
    // src/utils/geocode.js — mantener ambas implementaciones en espejo.
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1&language=es&types=address,poi,neighborhood,locality,place,region`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Mapbox respondió ${response.status}`)

    const data = await response.json()
    const placeName = data.features?.[0]?.place_name
    if (!placeName) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    // Quita el ", Venezuela" final: ruido redundante en una app que solo
    // opera en Venezuela.
    return placeName.replace(/,\s*Venezuela$/i, '')
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}
