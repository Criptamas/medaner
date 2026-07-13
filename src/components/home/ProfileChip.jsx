import { Link } from 'react-router-dom'
import { useClienteAuth } from '../../hooks/useClienteAuth'
import Avatar from '../Avatar'
import './ProfileChip.css'

// Bloque "saludo" del header (Home) cuando HAY sesión de cliente: avatar +
// "Hola, <nombre>", que reemplaza al logo de marca en esa posición (ver
// Header.jsx) — a alguien que ya está logueado no hace falta mostrarle la
// marca ahí, el saludo personalizado aporta más. Sigue siendo un único
// <Link> a /perfil (ver/editar cuenta) con toda el área tappable, igual que
// el viejo chip "Mi perfil" que reemplaza.
export default function ProfileChip() {
  const { nombre, avatarUrl } = useClienteAuth()

  return (
    <Link to="/perfil" className="profile-chip" aria-label="Mi perfil">
      <Avatar nombre={nombre} avatarUrl={avatarUrl} size={48} />
      {/* min-width:0 acá y en el nombre es lo que permite truncar con
          ellipsis en vez de empujar la tasa de cambio fuera de pantalla
          cuando el nombre es largo en mobile angosto. */}
      <span className="profile-chip__texto">
        <span className="profile-chip__saludo">Hola,</span>
        <span className="profile-chip__nombre">{nombre || 'Mi perfil'}</span>
      </span>
    </Link>
  )
}
