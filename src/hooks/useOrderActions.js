import { useState } from 'react'
import { doc, runTransaction, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

export const ORDER_ALREADY_TAKEN = 'ORDER_ALREADY_TAKEN'

export function useOrderActions() {
  const [error, setError] = useState(null)

  // Transacción en vez de updateDoc directo: si dos conductores presionan
  // "Aceptar" casi al mismo tiempo, sin esto ambos podrían quedar asignados
  // al mismo pedido (el segundo updateDoc simplemente pisa al primero).
  async function acceptOrder(pedidoId, conductorId) {
    setError(null)
    const pedidoRef = doc(db, 'pedidos', pedidoId)
    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(pedidoRef)
        if (!snap.exists() || snap.data().estado !== 'pendiente') {
          throw new Error(ORDER_ALREADY_TAKEN)
        }
        transaction.update(pedidoRef, { estado: 'confirmado', conductorId })
      })
    } catch (err) {
      setError(err)
      throw err
    }
  }

  async function advanceOrderStatus(pedidoId, nuevoEstado) {
    setError(null)
    try {
      await updateDoc(doc(db, 'pedidos', pedidoId), { estado: nuevoEstado })
    } catch (err) {
      setError(err)
      throw err
    }
  }

  return { acceptOrder, advanceOrderStatus, error }
}
