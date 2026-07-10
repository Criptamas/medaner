import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

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
        const { data, error: supabaseError } = await supabase
          .from('tiendas')
          .select('*')
          .eq('activa', true)
        if (cancelled) return
        if (supabaseError) throw supabaseError
        // Cada fila ya trae `id` (PK de Supabase) — a diferencia de Firestore
        // no hace falta remapear snap.id + data() por separado.
        setStores(data ?? [])
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
