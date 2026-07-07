// Geocodificación inversa para que la notificación push muestre una
// dirección legible en vez de coordenadas. Si Mapbox falla o no hay token,
// devolvemos las coordenadas como respaldo en vez de romper el envío.
export async function reverseGeocode(lat, lng) {
  const token = process.env.MAPBOX_TOKEN
  if (!token) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1&language=es`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Mapbox respondió ${response.status}`)

    const data = await response.json()
    return data.features?.[0]?.place_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}
