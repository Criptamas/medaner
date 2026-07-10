import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Trae productos disponibles de varias tiendas para los carruseles de la Home
// ("Te puede interesar", "Productos en tendencia").
//
// Con Supabase esto se resuelve con UN solo select usando el join embebido
// tiendas -> productos, filtrando el lado embebido con
// `productos.disponible = eq.true` (PostgREST) — a diferencia del fan-out
// manual que hacía falta con Firestore (una query por tienda, porque las
// reglas de seguridad solo permitían leer la subcolección anidada, no un
// collectionGroup). La query pide `tiendas` directo (acotada por
// `maxTiendas` + `activa = true`) en vez de depender del array `stores` que
// recibe el hook. El parámetro `stores` se mantiene solo por compatibilidad
// de firma (HomePage ya lo pasa) — esta implementación no lo necesita para
// construir la query, así que no está en las dependencias del efecto.
//
// A cada producto se le adjunta tiendaId y tiendaNombre para poder navegar al
// catálogo correcto desde la card (el carrito es POR tienda, ver HomePage).
export function useHomeProductos(stores, { maxTiendas = 8, maxProductos = 24 } = {}) {
  const [productos, setProductos] = useState([])
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
          .select('id, nombre, productos(*)')
          .eq('activa', true)
          .eq('productos.disponible', true)
          .limit(maxTiendas)

        if (cancelled) return
        if (supabaseError) throw supabaseError

        const porTienda = (data ?? []).map((tienda) =>
          (tienda.productos ?? []).map((producto) => ({
            ...producto,
            tiendaId: tienda.id,
            tiendaNombre: tienda.nombre ?? '',
          })),
        )

        // Intercala productos de distintas tiendas para que los carruseles no
        // queden dominados por una sola tienda (round-robin sobre las listas).
        const intercalados = intercalar(porTienda).slice(0, maxProductos)
        setProductos(intercalados)
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
  }, [maxProductos, maxTiendas])

  return { productos, loading, error }
}

// Round-robin: [[a1,a2],[b1],[c1,c2,c3]] -> [a1,b1,c1,a2,c2,c3]
function intercalar(listas) {
  const resultado = []
  const maxLen = Math.max(0, ...listas.map((l) => l.length))
  for (let i = 0; i < maxLen; i++) {
    for (const lista of listas) {
      if (i < lista.length) resultado.push(lista[i])
    }
  }
  return resultado
}
