import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

// Seguimiento en tiempo real de un viaje puntual (mismo patrón que useOrder).
export function useViaje(viajeId) {
  const [viaje, setViaje] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setViaje(null)

    const unsubscribe = onSnapshot(
      doc(db, 'viajes', viajeId),
      (snap) => {
        setViaje(snap.exists() ? { id: snap.id, ...snap.data() } : null)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [viajeId])

  return { viaje, loading, error }
}
