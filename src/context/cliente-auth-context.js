import { createContext } from 'react'

// Contexto independiente del AuthContext de Firebase (ver src/context/auth-context.js).
// Este es exclusivo del login de clientes sobre Supabase Auth — no comparte
// estado ni provider con el sistema de admin/conductor.
export const ClienteAuthContext = createContext(undefined)
