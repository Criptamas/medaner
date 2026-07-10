import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useStore(storeId) {
  const [store, setStore] = useState(null)
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
          .eq('id', storeId)
          .single()
        if (cancelled) return
        // PGRST116 = .single() no encontró ninguna fila — equivalente a
        // snap.exists() === false en Firestore (tienda inexistente, no un
        // error real). Cualquier otro código (ej. storeId con formato
        // inválido, red) sí se trata como error genuino, igual que antes.
        if (supabaseError && supabaseError.code !== 'PGRST116') throw supabaseError
        setStore(supabaseError ? null : data)
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
  }, [storeId])

  return { store, loading, error }
}
