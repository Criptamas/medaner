import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'

// Mismo patrón que useMisPedidosActivos: filtra "no completado" en el
// cliente para no necesitar un índice compuesto (conductorId + estado).
function sortByFechaAsc(a, b) {
  const fechaA = a.fechaCreacion?.toMillis?.() ?? 0
  const fechaB = b.fechaCreacion?.toMillis?.() ?? 0
  return fechaA - fechaB
}

export function useMisViajesActivos(conductorId) {
  const [viajes, setViajes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!conductorId) {
      setViajes([])
      setLoading(false)
      return undefined
    }

    setLoading(true)
    const q = query(collection(db, 'viajes'), where('conductorId', '==', conductorId))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((viaje) => viaje.estado !== 'completado')
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
  }, [conductorId])

  return { viajes, loading, error }
}
