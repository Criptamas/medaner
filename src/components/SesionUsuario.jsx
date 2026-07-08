import { useAuth } from '../hooks/useAuth'
import { resolverNombrePorUid } from '../utils/nombresUsuarios'
import './SesionUsuario.css'

// Chip discreto para headers internos (/conductor, /admin) que muestra
// quién inició sesión. No hay sistema de roles/perfiles todavía, así que el
// nombre a mostrar se resuelve con esta prioridad:
//   1. prop `nombre` — para cuando el caller ya lo tiene a mano (ej. el
//      conductor logueado, cuyo nombre vive en su doc de Firestore).
//   2. mapa estático de personal interno por UID (ver utils/nombresUsuarios).
//   3. email de la cuenta logueada, como último recurso.
export default function SesionUsuario({ nombre }) {
  const { user } = useAuth()

  if (!user) return null

  const nombreMostrado = nombre || resolverNombrePorUid(user.uid) || user.email
  if (!nombreMostrado) return null

  const inicial = nombreMostrado.trim().charAt(0).toUpperCase()

  return (
    <p className="sesion-usuario" title={user.email ?? undefined}>
      <span className="sesion-usuario__avatar" aria-hidden="true">
        {inicial}
      </span>
      <span className="sesion-usuario__texto">
        Sesión: <span className="sesion-usuario__nombre">{nombreMostrado}</span>
      </span>
    </p>
  )
}
