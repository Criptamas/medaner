import './Avatar.css'

// Avatar reutilizable: muestra la foto de perfil (usuarios.avatar_url) si
// existe, o un círculo con la inicial del nombre como fallback. Compartido
// entre el chip del header (ProfileChip) y la página de perfil (PerfilPage)
// para no duplicar el manejo del fallback ni el onError de la imagen.
export default function Avatar({ nombre, avatarUrl, size = 32 }) {
  const inicial = (nombre || '?').trim().charAt(0).toUpperCase()
  const estilo = { width: size, height: size, fontSize: Math.round(size * 0.44) }

  if (avatarUrl) {
    return (
      <img
        className="avatar avatar--img"
        style={estilo}
        src={avatarUrl}
        alt={nombre ? `Foto de ${nombre}` : 'Foto de perfil'}
        // Si la URL guardada está rota (foto borrada del bucket, etc.), ocultamos
        // la imagen y dejamos el fondo del círculo — nunca un ícono roto.
        onError={(e) => {
          e.currentTarget.style.visibility = 'hidden'
        }}
      />
    )
  }

  return (
    <span className="avatar avatar--inicial" style={estilo} aria-hidden="true">
      {inicial}
    </span>
  )
}
