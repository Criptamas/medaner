import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'

export function useActiveStores() {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const q = query(collection(db, 'tiendas'), where('activa', '==', true))
        const snapshot = await getDocs(q)
        if (cancelled) return
        setStores(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { stores, loading, error }
}
