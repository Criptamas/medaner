import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ClienteAuthContext } from './cliente-auth-context'

// Provider de sesión de cliente (Supabase Auth), independiente del
// AuthProvider de Firebase (ese sigue siendo exclusivo de admin/conductor).
//
// Además de `user`, expone `nombre`/`telefono` leídos de `public.usuarios`
// para que los consumidores (ej. "Hola, {nombre}" en el header) no tengan
// que hacer su propia query. Esa lectura es best-effort: si falla, la sesión
// de Supabase Auth sigue siendo válida igual — el perfil es un complemento,
// nunca debe tumbar el login.
export function ClienteAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState({ nombre: null, telefono: null })
  const [loading, setLoading] = useState(true)

  const cargarPerfil = useCallback(async (usuarioId) => {
    if (!usuarioId) {
      setPerfil({ nombre: null, telefono: null })
      return
    }
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('nombre, telefono')
        .eq('id', usuarioId)
        .single()
      if (error) throw error
      setPerfil({ nombre: data?.nombre ?? null, telefono: data?.telefono ?? null })
    } catch (error) {
      // No relanzar: el usuario ya está autenticado igual, esto es solo el
      // complemento de perfil (nombre/telefono) para mostrar en la UI.
      console.error('No se pudo cargar el perfil del cliente:', error)
      setPerfil({ nombre: null, telefono: null })
    }
  }, [])

  const refetchPerfil = useCallback(() => {
    if (user?.id) return cargarPerfil(user.id)
    return Promise.resolve()
  }, [cargarPerfil, user?.id])

  useEffect(() => {
    let activo = true

    // getSession() de entrada para no esperar el primer evento del listener
    // (onAuthStateChange puede tardar un tick en disparar "INITIAL_SESSION").
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!activo) return
      const usuarioActual = session?.user ?? null
      setUser(usuarioActual)
      if (usuarioActual) cargarPerfil(usuarioActual.id)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!activo) return
      const usuarioActual = session?.user ?? null
      setUser(usuarioActual)
      setLoading(false)
      if (usuarioActual) {
        cargarPerfil(usuarioActual.id)
      } else {
        setPerfil({ nombre: null, telefono: null })
      }
    })

    return () => {
      activo = false
      subscription.unsubscribe()
    }
  }, [cargarPerfil])

  return (
    <ClienteAuthContext.Provider
      value={{ user, nombre: perfil.nombre, telefono: perfil.telefono, loading, refetchPerfil }}
    >
      {children}
    </ClienteAuthContext.Provider>
  )
}
