import { useEffect, useRef } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

// Cuota de escritura mínima entre actualizaciones de ubicación. watchPosition
// puede disparar varias veces por segundo; sin este límite, un solo
// conductor activo todo el día podría agotar buena parte de la cuota
// gratuita de Firestore (20K escrituras/día en el plan Spark).
const INTERVALO_MINIMO_MS = 20_000

// Activo solo mientras el conductor está "Disponible" (activo === true).
export function useTrackDriverLocation(conductorId, activo) {
  const ultimaEscrituraRef = useRef(0)

  useEffect(() => {
    if (!activo || !conductorId || !navigator.geolocation) return undefined

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const ahora = Date.now()
        if (ahora - ultimaEscrituraRef.current < INTERVALO_MINIMO_MS) return
        ultimaEscrituraRef.current = ahora

        const { latitude, longitude } = position.coords
        updateDoc(doc(db, 'conductores', conductorId), {
          ubicacion: { lat: latitude, lng: longitude },
        }).catch(() => {
          // Best-effort: si falla una escritura de ubicación no interrumpimos
          // al conductor, la próxima posición lo va a intentar de nuevo.
        })
      },
      () => {
        // Sin permiso o sin señal de GPS: no hay nada accionable acá, el
        // conductor sigue "Disponible" pero no va a recibir viajes cercanos
        // hasta que su ubicación se pueda leer de nuevo.
      },
      { enableHighAccuracy: true },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [conductorId, activo])
}
