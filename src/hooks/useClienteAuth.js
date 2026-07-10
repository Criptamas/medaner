import { useContext } from 'react'
import { ClienteAuthContext } from '../context/cliente-auth-context'

// Hook de sesión de cliente (Supabase Auth). Independiente de useAuth.js
// (Firebase, exclusivo de admin/conductor) — no mezclar ambos sistemas.
export function useClienteAuth() {
  const context = useContext(ClienteAuthContext)
  if (context === undefined) {
    throw new Error('useClienteAuth must be used within a ClienteAuthProvider')
  }
  return context
}
