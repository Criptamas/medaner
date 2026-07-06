import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

// Genérico para togglear un solo campo booleano en cualquier colección
// (tiendas.activa, conductores.cuotaSemanalPagada) sin duplicar la
// misma llamada a updateDoc en cada lugar que necesite un switch.
export function useDocToggle() {
  const [error, setError] = useState(null)

  async function toggle(collectionName, docId, field, nextValue) {
    setError(null)
    try {
      await updateDoc(doc(db, collectionName, docId), { [field]: nextValue })
    } catch (err) {
      setError(err)
      throw err
    }
  }

  return { toggle, error }
}
