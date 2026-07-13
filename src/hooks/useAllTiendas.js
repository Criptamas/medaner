import { useCallback, useEffect, useRef, useState } from 'react'

// Antes usaba onSnapshot (tiempo real) sobre Firestore. Con Supabase, la
// policy de RLS del catálogo solo deja leer tiendas activas con la ANON key
// — para que el admin vea TODAS (activas e inactivas, y pueda reactivarlas)
// hace falta la service_role key, que nunca puede vivir en el navegador. Por
// eso este hook pasa a consumir un endpoint serverless (api/admin-tiendas.js)
// en vez de pegarle directo a Supabase con el cliente público.
//
// Deja de ser tiempo real (pasa a "fetch al montar"): simplificación
// deliberada. Es una lista de admin, de baja frecuencia de cambio — no
// amerita meter Supabase Realtime (que además requeriría habilitar
// replication en la tabla) para esto. Como contrapartida, ya nadie empuja
// los cambios de vuelta solo: se expone `refetch` para que quien escribe
// (ej. AdminPage tras togglear una tienda) pueda refrescar la lista a mano
// y el switch no quede visualmente desincronizado del valor real.
export function useAllTiendas() {
  const [tiendas, setTiendas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const cancelledRef = useRef(false)

  const cargarTiendas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin?action=tiendas')
      if (!response.ok) {
        throw new Error(`GET /api/admin?action=tiendas respondió ${response.status}`)
      }
      const data = await response.json()
      if (cancelledRef.current) return
      setTiendas(data.tiendas ?? [])
    } catch (err) {
      if (!cancelledRef.current) setError(err)
    } finally {
      if (!cancelledRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    cargarTiendas()
    return () => {
      cancelledRef.current = true
    }
  }, [cargarTiendas])

  return { tiendas, loading, error, refetch: cargarTiendas }
}
