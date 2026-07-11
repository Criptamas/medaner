import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useClienteAuth } from '../hooks/useClienteAuth'
import StatusMessage from './StatusMessage'

// Gate de rutas de conductor/admin sobre la sesión unificada de Supabase.
// Reemplaza a ProtectedRoute (que solo miraba Firebase) ahora que el login
// canónico es Supabase y Firebase queda como puente interno (useFirebaseBridge).
//
// `admin` puede entrar también a rutas de conductor (conveniencia de
// pruebas), pero para rol="admin" se exige tipoUsuario === 'admin' estricto
// — un conductor no debe poder entrar a /admin.
export default function RutaRolProtegida({ rol, children }) {
  const { user, tipoUsuario, loading } = useClienteAuth()
  const { user: firebaseUser } = useAuth()

  if (loading) {
    return <StatusMessage variant="loading" title="Verificando sesión..." />
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  // El perfil (y con él tipoUsuario) llega async después de `user` — todavía
  // no sabemos el rol, no hay que redirigir en falso a esta altura.
  if (tipoUsuario == null) {
    return <StatusMessage variant="loading" title="Cargando tu perfil..." />
  }

  if (tipoUsuario !== rol && tipoUsuario !== 'admin') {
    return <Navigate to="/" replace />
  }

  // El puente Supabase → Firebase (useFirebaseBridge) todavía no terminó de
  // montar la sesión de Firebase que necesita Firestore para este panel.
  if (!firebaseUser) {
    return <StatusMessage variant="loading" title="Preparando tu panel..." />
  }

  return children
}
