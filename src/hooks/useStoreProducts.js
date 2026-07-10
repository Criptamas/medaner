import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useStoreProducts(storeId) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: supabaseError } = await supabase
          .from('productos')
          .select('*')
          .eq('tienda_id', storeId)
          .eq('disponible', true)
        if (cancelled) return
        if (supabaseError) throw supabaseError
        setProducts(data ?? [])
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

  return { products, loading, error }
}
