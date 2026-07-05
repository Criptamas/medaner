import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

export function useOrder(orderId) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setOrder(null)

    const unsubscribe = onSnapshot(
      doc(db, 'pedidos', orderId),
      (snap) => {
        console.log('[useOrder debug] pedidoId:', orderId, '-> estado recibido:', snap.data()?.estado)
        setOrder(snap.exists() ? { id: snap.id, ...snap.data() } : null)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [orderId])

  return { order, loading, error }
}
