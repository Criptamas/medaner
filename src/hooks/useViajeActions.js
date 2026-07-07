import { useState } from 'react'
import { doc, runTransaction, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

export const VIAJE_ALREADY_TAKEN = 'VIAJE_ALREADY_TAKEN'

// Mismo patrón que useOrderActions: transacción para aceptar (evita que dos
// conductores queden asignados al mismo viaje) y updateDoc simple para
// avanzar de estado una vez que el viaje ya es suyo.
export function useViajeActions() {
  const [error, setError] = useState(null)

  async function acceptViaje(viajeId, conductorId) {
    setError(null)
    const viajeRef = doc(db, 'viajes', viajeId)
    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(viajeRef)
        if (!snap.exists() || snap.data().estado !== 'pendiente') {
          throw new Error(VIAJE_ALREADY_TAKEN)
        }
        transaction.update(viajeRef, { estado: 'confirmado', conductorId })
      })
    } catch (err) {
      setError(err)
      throw err
    }
  }

  async function advanceViajeStatus(viajeId, nuevoEstado) {
    setError(null)
    try {
      await updateDoc(doc(db, 'viajes', viajeId), { estado: nuevoEstado })
    } catch (err) {
      setError(err)
      throw err
    }
  }

  return { acceptViaje, advanceViajeStatus, error }
}
