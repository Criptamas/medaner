import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'

// Trae productos disponibles de varias tiendas para los carruseles de la Home
// ("Te puede interesar", "Productos en tendencia").
//
// Por qué fan-out (una query por tienda) y no collectionGroup('productos'):
// las reglas actuales permiten leer productos SOLO por la ruta anidada
// tiendas/{id}/productos (allow read). Un collectionGroup necesitaría una
// regla nueva (match /{path=**}/productos) + un índice compuesto. Para el
// piloto (pocas tiendas) el fan-out reutiliza el permiso que ya existe y no
// obliga a abrir reglas ni crear índices. Se acota con `maxTiendas` para no
// disparar lecturas en Firestore (plan Spark).
//
// Escala: cuando haya muchas tiendas, migrar a una colección curada de
// "destacados"/"tendencia" (o collectionGroup con su índice y regla) en vez
// de leer todas las subcolecciones. Ver TODO en la Home.
//
// A cada producto se le adjunta tiendaId y tiendaNombre para poder navegar al
// catálogo correcto desde la card (el carrito es POR tienda, ver HomePage).
export function useHomeProductos(stores, { maxTiendas = 8, maxProductos = 24 } = {}) {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Clave estable de las tiendas a consultar: evita re-fetch si el array
  // `stores` cambia de referencia pero no de contenido relevante.
  const tiendasKey = stores
    .slice(0, maxTiendas)
    .map((t) => t.id)
    .join(',')

  useEffect(() => {
    let cancelled = false

    async function load() {
      const tiendas = stores.slice(0, maxTiendas)
      if (tiendas.length === 0) {
        setProductos([])
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const porTienda = await Promise.all(
          tiendas.map(async (tienda) => {
            try {
              const q = query(
                collection(db, 'tiendas', tienda.id, 'productos'),
                where('disponible', '==', true),
              )
              const snap = await getDocs(q)
              return snap.docs.map((docSnap) => ({
                id: docSnap.id,
                tiendaId: tienda.id,
                tiendaNombre: tienda.nombre ?? '',
                ...docSnap.data(),
              }))
            } catch {
              // Una tienda que falle (permiso puntual, red) no debe tumbar
              // toda la Home: se ignora y seguimos con las demás.
              return []
            }
          }),
        )

        if (cancelled) return

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
    // tiendasKey resume el contenido relevante de `stores`; maxProductos y
    // maxTiendas son estables entre renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiendasKey, maxProductos, maxTiendas])

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
