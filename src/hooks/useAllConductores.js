import { useEffect, useState } from 'react'
import { collection, onSnapshot, query } from 'firebase/firestore'
import { db } from '../firebase'

export function useAllConductores() {
  const [conductores, setConductores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'conductores'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Ordenamos en el cliente (no con orderBy('nombre') en la query):
        // Firestore excluye del resultado cualquier documento sin ese campo,
        // y hoy los conductores se cargan a mano en la consola, sin garantía
        // de que todos tengan "nombre".
        const docs = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => (a.nombre ?? a.id).localeCompare(b.nombre ?? b.id))
        setConductores(docs)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [])

  return { conductores, loading, error }
}
