import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'

// Respaldo de la notificación push: si el push no llega (conexión inestable,
// permiso no otorgado, etc.), el conductor igual puede ver acá los viajes
// pendientes. Mismo patrón que usePedidosDisponibles.
function sortByFechaAsc(a, b) {
  const fechaA = a.fechaCreacion?.toMillis?.() ?? 0
  const fechaB = b.fechaCreacion?.toMillis?.() ?? 0
  return fechaA - fechaB
}

export function useViajesDisponibles() {
  const [viajes, setViajes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'viajes'), where('estado', '==', 'pendiente'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        lista.sort(sortByFechaAsc)
        setViajes(lista)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [])

  return { viajes, loading, error }
}
