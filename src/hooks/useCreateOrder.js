import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export const LAST_ORDER_STORAGE_KEY = 'medaner:lastOrderId'

export function useCreateOrder() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function createOrder({
    storeId,
    items,
    totalPrice,
    clienteNombre,
    clienteTelefono,
    direccion,
    metodoPago,
  }) {
    setSubmitting(true)
    setError(null)
    try {
      const docRef = await addDoc(collection(db, 'pedidos'), {
        tiendaId: storeId,
        clienteNombre,
        clienteTelefono,
        direccion,
        metodoPago,
        estado: 'pendiente',
        conductorId: '',
        total: totalPrice,
        fechaCreacion: serverTimestamp(),
        productos: items.map((item) => ({
          nombre: item.product.nombre,
          cantidad: item.quantity,
          precio: item.product.precio,
        })),
      })
      localStorage.setItem(LAST_ORDER_STORAGE_KEY, docRef.id)
      return docRef.id
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  return { createOrder, submitting, error }
}
