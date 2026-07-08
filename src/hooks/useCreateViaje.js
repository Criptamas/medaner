import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { agregarPedidoActivo } from '../utils/seguimientoLocal'
import { normalizarTelefono } from '../utils/telefono'

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
        // Clave de búsqueda que usa /api/recuperar-pedidos para encontrar
        // viajes por teléfono sin depender del formato en que lo escribió
        // el cliente. Si no es un teléfono válido guardamos '' en vez de
        // bloquear la creación del viaje (ver src/utils/telefono.js).
        clienteTelefonoNormalizado: normalizarTelefono(clienteTelefono) ?? '',
        origen: { lat: origen.lat, lng: origen.lng },
        destino: { lat: destino.lat, lng: destino.lng },
        tipoVehiculo,
        metodoPago,
        estado: 'pendiente',
        conductorId: '',
        total: 0,
        fechaCreacion: serverTimestamp(),
      })

      // Sin cuentas de cliente: este navegador queda como "dueño" del
      // viaje para poder mostrarlo en "Mis pedidos recientes".
      agregarPedidoActivo({ id: docRef.id, tipo: 'viaje' })

      // Best-effort: si esta llamada falla (conexión inestable justo en ese
      // instante), el viaje ya quedó creado en Firestore y sigue visible
      // para los conductores en la lista de respaldo "Viajes disponibles".
      fetch('/api/notificar-viaje', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viajeId: docRef.id }),
      }).catch(() => {})

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
