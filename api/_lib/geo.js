const EARTH_RADIUS_KM = 6371

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

// Distancia en línea recta entre dos puntos {lat, lng}, no ruta real —
// suficiente para filtrar conductores cercanos, no para calcular tarifa.
export function haversineKm(a, b) {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)

  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)

  const h =
    sinDLat * sinDLat +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * sinDLng * sinDLng

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}
