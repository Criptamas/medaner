import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useClienteAuth } from '../hooks/useClienteAuth'

// Componente sin UI: manda a conductor/admin a su panel UNA sola vez tras
// iniciar sesión (o al abrir la app ya logueado), si están parados en una
// entrada genérica (home o /login).
//
// Clave: NO redirige en cada visita a "/". Antes lo hacía, y eso ATRAPABA al
// conductor/admin en su panel — cada vez que iban al home rebotaban de vuelta,
// sin poder ver la home ni cerrar sesión para entrar como otro rol. Con el
// ref `yaRedirigio`, redirige una vez por sesión y después deja navegar libre
// (el ref se resetea al cerrar sesión, así el próximo login vuelve a llevar al
// panel). En cada recarga/apertura de la PWA el componente se remonta y el ref
// arranca en false, así que abrir la PWA sigue llevando al dashboard.
export default function RedireccionPorRol() {
  const { user, tipoUsuario } = useClienteAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const yaRedirigio = useRef(false)

  useEffect(() => {
    // Sin sesión: resetear para que el próximo login vuelva a redirigir.
    if (!user) {
      yaRedirigio.current = false
      return
    }
    // El rol llega async después de `user`: esperar a conocerlo.
    if (tipoUsuario == null) return
    // Ya redirigimos una vez en esta sesión: no volver a atrapar al usuario si
    // navega a propósito al home (ver tiendas, cerrar sesión, etc.).
    if (yaRedirigio.current) return

    // Si el usuario ya está en una ruta específica (no home/login), no lo
    // movemos — llegó ahí a propósito. Marcamos que no hay que redirigir
    // después dentro de esta sesión.
    if (location.pathname !== '/' && location.pathname !== '/login') {
      yaRedirigio.current = true
      return
    }

    if (tipoUsuario === 'conductor') {
      yaRedirigio.current = true
      navigate('/conductor', { replace: true })
    } else if (tipoUsuario === 'admin') {
      yaRedirigio.current = true
      navigate('/admin', { replace: true })
    }
    // tipoUsuario === 'cliente': se queda en la home, no hay redirección.
  }, [user, tipoUsuario, location.pathname, navigate])

  return null
}
