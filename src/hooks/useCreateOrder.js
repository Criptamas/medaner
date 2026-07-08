import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { agregarPedidoActivo } from '../utils/seguimientoLocal'
import { normalizarTelefono } from '../utils/telefono'

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
        // Clave de búsqueda que usa /api/recuperar-pedidos para encontrar
        // pedidos por teléfono sin depender del formato en que lo escribió
        // el cliente. Si no es un teléfono válido guardamos '' en vez de
        // bloquear la creación del pedido (ver src/utils/telefono.js).
        clienteTelefonoNormalizado: normalizarTelefono(clienteTelefono) ?? '',
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
      // Sin cuentas de cliente: este navegador queda como "dueño" del
      // pedido para poder mostrarlo en "Mis pedidos recientes".
      agregarPedidoActivo({ id: docRef.id, tipo: 'pedido' })
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
