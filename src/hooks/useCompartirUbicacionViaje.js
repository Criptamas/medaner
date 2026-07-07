import { useEffect, useRef, useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

// Throttle de escrituras: watchPosition puede disparar varias veces por
// segundo. Escribimos como mucho una vez cada INTERVALO_MINIMO_MS, salvo que
// el conductor se haya desplazado más de DISTANCIA_MINIMA_M (así un movimiento
// rápido se refleja sin esperar el intervalo). Sin esto, un solo viaje podría
// consumir buena parte de la cuota gratuita de Firestore (Spark: 20K
// escrituras/día) y drenar batería.
const INTERVALO_MINIMO_MS = 8_000
const DISTANCIA_MINIMA_M = 20

// Estados que la UI del conductor puede mostrar sobre el permiso de GPS.
export const UBICACION_ESTADO = {
  INACTIVO: 'inactivo',
  COMPARTIENDO: 'compartiendo',
  PERMISO_DENEGADO: 'permiso_denegado',
  SIN_SOPORTE: 'sin_soporte',
  ERROR: 'error',
}

// Distancia en metros entre dos puntos {lat,lng} (Haversine). Se usa solo para
// decidir si vale la pena escribir, no necesita precisión milimétrica.
function distanciaMetros(a, b) {
  const R = 6_371_000
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// El conductor asignado transmite su posición al DOCUMENTO DEL VIAJE mientras el
// viaje está en confirmado/en_curso. Va al viaje y no a conductores/{uid}
// porque el cliente no tiene login y las reglas le impiden leer conductores;
// el viaje sí es legible por cualquiera (allow get: if true). Fuente de verdad:
// viajes/{viajeId}.ubicacionConductor = { lat, lng, timestamp }.
export function useCompartirUbicacionViaje(viajeId, activo) {
  const [estado, setEstado] = useState(UBICACION_ESTADO.INACTIVO)
  // Última escritura efectiva (no cada lectura del GPS): base del throttle.
  const ultimaRef = useRef({ ts: 0, lat: null, lng: null })

  useEffect(() => {
    if (!activo || !viajeId) {
      setEstado(UBICACION_ESTADO.INACTIVO)
      return undefined
    }

    if (!navigator.geolocation) {
      setEstado(UBICACION_ESTADO.SIN_SOPORTE)
      return undefined
    }

    setEstado(UBICACION_ESTADO.COMPARTIENDO)

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords
        const ahora = Date.now()
        const ultima = ultimaRef.current

        const esPrimera = ultima.lat == null
        const pasoTiempo = ahora - ultima.ts >= INTERVALO_MINIMO_MS
        const seMovio =
          !esPrimera && distanciaMetros(ultima, { lat, lng }) >= DISTANCIA_MINIMA_M

        if (!esPrimera && !pasoTiempo && !seMovio) return

        ultimaRef.current = { ts: ahora, lat, lng }

        // updateDoc solo toca ubicacionConductor: no pisa el resto del viaje.
        // timestamp numérico (double), consistente con lat/lng.
        updateDoc(doc(db, 'viajes', viajeId), {
          ubicacionConductor: { lat, lng, timestamp: ahora },
        }).catch(() => {
          // Best-effort: si una escritura falla no interrumpimos el viaje; la
          // próxima posición reintenta.
        })

        setEstado(UBICACION_ESTADO.COMPARTIENDO)
      },
      (error) => {
        // code 1 = PERMISSION_DENIED. Sin permiso el viaje sigue su curso
        // normal, solo que el cliente no verá el punto moverse en el mapa.
        setEstado(
          error.code === 1 ? UBICACION_ESTADO.PERMISO_DENEGADO : UBICACION_ESTADO.ERROR,
        )
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    )

    // Cleanup: al desmontar la pantalla o cuando el viaje deja de estar en
    // confirmado/en_curso (activo === false), se corta el watch.
    return () => navigator.geolocation.clearWatch(watchId)
  }, [viajeId, activo])

  return estado
}
