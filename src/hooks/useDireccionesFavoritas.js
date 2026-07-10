import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useClienteAuth } from './useClienteAuth'

// Orden fijo para las direcciones "de sistema": si existen, siempre en este
// orden antes que cualquier Personalizada (que van después, más reciente primero).
const ORDEN_TITULOS_FIJOS = ['Hogar', 'Trabajo', 'Universidad']

function ordenar(lista) {
  const fijas = ORDEN_TITULOS_FIJOS.map((titulo) => lista.find((f) => f.titulo === titulo)).filter(
    Boolean,
  )
  const personalizadas = lista
    .filter((f) => f.titulo === 'Personalizado')
    .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
  return [...fijas, ...personalizadas]
}

// CRUD de direcciones favoritas del cliente (public.direcciones_favoritas,
// Supabase). Scopeado a la sesión activa de useClienteAuth — sin cuenta no
// hay favoritas que leer, así que ni se dispara la query (evita un error de
// RLS predecible y mantiene loading=false en vez de colgado).
export function useDireccionesFavoritas() {
  const { user } = useClienteAuth()
  const [favoritasRaw, setFavoritasRaw] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    if (!user) {
      setFavoritasRaw([])
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data, error: supabaseError } = await supabase
        .from('direcciones_favoritas')
        .select('*')
        .eq('usuario_id', user.id)
      if (supabaseError) throw supabaseError
      setFavoritasRaw(data ?? [])
    } catch (err) {
      console.error('No se pudieron cargar las direcciones favoritas:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Crea una favorita nueva. Para Hogar/Trabajo/Universidad valida PRIMERO
  // contra la lista ya cargada en memoria (evita un roundtrip solo para
  // enterarse del duplicado) y lanza un error con code: 'DUPLICADO' +
  // favoritaExistente adjunta, para que el formulario pueda ofrecer "editar
  // esa" en vez de un mensaje genérico. El unique index parcial de la tabla
  // (usuario_id, titulo) where titulo <> 'Personalizado' es el respaldo ante
  // una carrera real (dos pestañas guardando "Hogar" al mismo tiempo) — por
  // eso también se traduce el 23505 de Postgres al mismo shape de error acá.
  const crear = useCallback(
    async ({ titulo, etiquetaPersonalizada, descripcion, direccionTexto, lat, lng }) => {
      if (!user) {
        throw new Error('Necesitás iniciar sesión para guardar direcciones favoritas.')
      }

      if (titulo !== 'Personalizado') {
        const existente = favoritasRaw.find((f) => f.titulo === titulo)
        if (existente) {
          const errorDuplicado = new Error(`Ya tenés una dirección de tipo "${titulo}" guardada.`)
          errorDuplicado.code = 'DUPLICADO'
          errorDuplicado.favoritaExistente = existente
          throw errorDuplicado
        }
      }

      const { data, error: supabaseError } = await supabase
        .from('direcciones_favoritas')
        .insert({
          usuario_id: user.id,
          titulo,
          etiqueta_personalizada: titulo === 'Personalizado' ? (etiquetaPersonalizada ?? '').trim() : null,
          descripcion: descripcion.trim(),
          direccion_texto: (direccionTexto ?? '').trim(),
          lat,
          lng,
        })
        .select()
        .single()

      if (supabaseError) {
        if (supabaseError.code === '23505') {
          const errorDuplicado = new Error(`Ya tenés una dirección de tipo "${titulo}" guardada.`)
          errorDuplicado.code = 'DUPLICADO'
          throw errorDuplicado
        }
        throw supabaseError
      }

      // Actualización optimista: evita un refetch completo solo para reflejar
      // la fila que ya tenemos de vuelta en la respuesta del insert.
      setFavoritasRaw((actual) => [...actual, data])
      return data
    },
    [user, favoritasRaw],
  )

  const actualizar = useCallback(async (id, cambios) => {
    const payload = {}
    if (cambios.titulo !== undefined) payload.titulo = cambios.titulo
    if (cambios.etiquetaPersonalizada !== undefined) {
      payload.etiqueta_personalizada = cambios.etiquetaPersonalizada
    }
    if (cambios.descripcion !== undefined) payload.descripcion = cambios.descripcion
    if (cambios.direccionTexto !== undefined) payload.direccion_texto = cambios.direccionTexto
    if (cambios.lat !== undefined) payload.lat = cambios.lat
    if (cambios.lng !== undefined) payload.lng = cambios.lng

    const { data, error: supabaseError } = await supabase
      .from('direcciones_favoritas')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (supabaseError) throw supabaseError

    setFavoritasRaw((actual) => actual.map((f) => (f.id === id ? data : f)))
    return data
  }, [])

  const eliminar = useCallback(async (id) => {
    const { error: supabaseError } = await supabase.from('direcciones_favoritas').delete().eq('id', id)
    if (supabaseError) throw supabaseError

    setFavoritasRaw((actual) => actual.filter((f) => f.id !== id))
  }, [])

  return {
    favoritas: ordenar(favoritasRaw),
    loading,
    error,
    crear,
    actualizar,
    eliminar,
    refetch: cargar,
  }
}
