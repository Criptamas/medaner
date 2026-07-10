import { Link } from 'react-router-dom'
import { useClienteAuth } from '../../hooks/useClienteAuth'
import Avatar from '../Avatar'
import './ProfileChip.css'

// Chip del header (Home) cuando HAY sesión de cliente: foto de perfil + nombre,
// que lleva a /perfil (ver/editar cuenta). Reemplaza al viejo bloque
// "Hola, X + logout" — el logout ahora vive dentro de la página de perfil.
export default function ProfileChip() {
  const { nombre, avatarUrl } = useClienteAuth()

  return (
    <Link to="/perfil" className="profile-chip" aria-label="Mi perfil">
      <Avatar nombre={nombre} avatarUrl={avatarUrl} size={30} />
      <span className="profile-chip__nombre">{nombre || 'Mi perfil'}</span>
    </Link>
  )
}
