import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'

function sortByFechaAsc(a, b) {
  const fechaA = a.fechaCreacion?.toMillis?.() ?? 0
  const fechaB = b.fechaCreacion?.toMillis?.() ?? 0
  return fechaA - fechaB
}

export function useMisPedidosActivos(conductorId) {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!conductorId) {
      setPedidos([])
      setLoading(false)
      return undefined
    }

    setLoading(true)
    // El filtro "no entregado" se aplica en el cliente para no necesitar
    // un índice compuesto (conductorId + estado) en Firestore.
    const q = query(collection(db, 'pedidos'), where('conductorId', '==', conductorId))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((pedido) => pedido.estado !== 'entregado')
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
  }, [conductorId])

  return { pedidos, loading, error }
}
