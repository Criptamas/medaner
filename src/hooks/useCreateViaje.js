import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

// Crea un documento en "viajes". total arranca en 0 y conductorId vacío:
// la tarifa se acuerda con el conductor y este se asigna al aceptar el viaje.
export function useCreateViaje() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function createViaje({
    tipoVehiculo,
    origen,
    destino,
    clienteNombre,
    clienteTelefono,
    metodoPago,
  }) {
    setSubmitting(true)
    setError(null)
    try {
      const docRef = await addDoc(collection(db, 'viajes'), {
        clienteNombre,
        clienteTelefono,
        origen: { lat: origen.lat, lng: origen.lng },
        destino: { lat: destino.lat, lng: destino.lng },
        tipoVehiculo,
        metodoPago,
        estado: 'pendiente',
        conductorId: '',
        total: 0,
        fechaCreacion: serverTimestamp(),
      })
      return docRef.id
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  return { createViaje, submitting, error }
}
