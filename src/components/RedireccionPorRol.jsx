import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useClienteAuth } from '../hooks/useClienteAuth'

// Componente sin UI: apenas hay sesión Supabase y ya sabemos el rol,
// manda a cada quien a su panel si está parado en la Home o en /login
// (entrada "genérica"). No interfiere si el usuario ya navegó a otra
// ruta a propósito (ej. conductor mirando /ser-conductor).
export default function RedireccionPorRol() {
  const { user, tipoUsuario } = useClienteAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user || tipoUsuario == null) return
    if (location.pathname !== '/' && location.pathname !== '/login') return

    if (tipoUsuario === 'conductor') {
      navigate('/conductor', { replace: true })
    } else if (tipoUsuario === 'admin') {
      navigate('/admin', { replace: true })
    }
    // tipoUsuario === 'cliente': se queda en la Home, no hay redirección.
  }, [user, tipoUsuario, location.pathname, navigate])

  return null
}
