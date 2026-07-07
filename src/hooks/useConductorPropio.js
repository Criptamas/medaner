import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

// Lee en tiempo real el propio documento del conductor logueado (para el
// estado inicial del switch "Disponible" al recargar la página).
export function useConductorPropio(conductorId) {
  const [conductor, setConductor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!conductorId) {
      setLoading(false)
      return undefined
    }

    const unsubscribe = onSnapshot(
      doc(db, 'conductores', conductorId),
      (snap) => {
        setConductor(snap.exists() ? { id: snap.id, ...snap.data() } : null)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [conductorId])

  return { conductor, loading, error }
}
