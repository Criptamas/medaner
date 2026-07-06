import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'

// Sin orderBy en la query: combinar where('estado', '==', ...) con orderBy
// en un campo distinto exige un índice compuesto en Firestore. Para el
// volumen de pedidos de esta etapa alcanza con ordenar en el cliente.
function sortByFechaAsc(a, b) {
  const fechaA = a.fechaCreacion?.toMillis?.() ?? 0
  const fechaB = b.fechaCreacion?.toMillis?.() ?? 0
  return fechaA - fechaB
}

export function usePedidosDisponibles() {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'pedidos'), where('estado', '==', 'pendiente'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        lista.sort(sortByFechaAsc)
        setPedidos(lista)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [])

  return { pedidos, loading, error }
}
