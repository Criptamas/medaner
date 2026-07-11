import { useEffect } from 'react'
import { signInWithCustomToken, signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './useAuth'
import { useClienteAuth } from './useClienteAuth'

// Puente Supabase → Firebase para conductor/admin.
//
// El login unificado es Supabase Auth, pero Firestore (reglas de conductores/
// admin) sigue exigiendo sesión de Firebase. Este hook mantiene esa sesión
// sincronizada: cuando hay un usuario Supabase con rol conductor/admin, pide
// un custom token de Firebase (uid = uid de Supabase) al endpoint puente y
// hace signInWithCustomToken — así `auth.currentUser.uid` (Firebase) queda
// igual al uid de Supabase, y todo el código que ya lee `conductores/{uid}`
// por `user.uid` sigue funcionando sin cambios.
//
// No se monta por rol: se monta una sola vez en App() y decide solo qué
// hacer según la sesión de Supabase en cada momento (incluye el logout).
export function useFirebaseBridge() {
  const { user, tipoUsuario, loading } = useClienteAuth()
  const { user: firebaseUser } = useAuth()

  useEffect(() => {
    // Mientras el perfil de Supabase todavía está cargando no sabemos si hay
    // sesión ni qué rol tiene — esperar evita puentear con datos a medio resolver.
    if (loading) return

    let cancelado = false

    async function sincronizar() {
      const esConductorOAdmin = user && ['conductor', 'admin'].includes(tipoUsuario)

      if (esConductorOAdmin) {
        // Ya puenteado: la sesión de Firebase actual ya corresponde a este
        // usuario de Supabase, no hay nada que hacer.
        if (firebaseUser?.uid === user.id) {
          // TODO: quitar tras validar
          // eslint-disable-next-line no-console
          console.log('[DIAG auth] puente ya activo, uid coincide', {
            uid: user.id,
            tipoUsuario,
          })
          return
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()
        const accessToken = session?.access_token

        // TODO: quitar tras validar
        // eslint-disable-next-line no-console
        console.log('[DIAG auth] intentando puentear sesión', {
          uid: user.id,
          tipoUsuario,
          teniaSesionFirebase: !!firebaseUser,
          tieneAccessToken: !!accessToken,
        })

        if (!accessToken) {
          console.error('[DIAG auth] no hay access_token de Supabase, no se puede puentear')
          return
        }

        try {
          const response = await fetch('/api/firebase-token', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          const data = await response.json().catch(() => null)

          if (cancelado) return

          if (!response.ok || !data?.token) {
            console.error('[DIAG auth] /api/firebase-token falló', {
              status: response.status,
              // data completo incluye `_diag` (paso, code, detalle) del endpoint
              // instrumentado — muestra la causa real del 500 sin ir a Vercel.
              respuesta: data,
            })
            return
          }

          await signInWithCustomToken(auth, data.token)
          if (cancelado) return

          // TODO: quitar tras validar
          // eslint-disable-next-line no-console
          console.log('[DIAG auth] puente OK, sesión Firebase creada', { uid: user.id })
        } catch (error) {
          if (cancelado) return
          console.error('[DIAG auth] error al puentear sesión Firebase:', error)
        }
        return
      }

      // Sin sesión Supabase pero con sesión Firebase colgada (ej. el usuario
      // cerró sesión): cerrarla también para no dejar un estado inconsistente.
      if (user === null && firebaseUser) {
        // TODO: quitar tras validar
        // eslint-disable-next-line no-console
        console.log('[DIAG auth] sin sesión Supabase, cerrando sesión Firebase colgada')
        try {
          await signOut(auth)
        } catch (error) {
          if (cancelado) return
          console.error('[DIAG auth] error al cerrar sesión Firebase:', error)
        }
      }
    }

    sincronizar()

    return () => {
      cancelado = true
    }
  }, [user, tipoUsuario, loading, firebaseUser])
}
