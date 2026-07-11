import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { supabase } from '../lib/supabaseClient'
import './LogoutButton.css'

export default function LogoutButton() {
  const navigate = useNavigate()

  async function handleLogout() {
    // Supabase es la FUENTE DE VERDAD de la sesión (el login unificado). Al
    // cerrarla, useFirebaseBridge detecta que ya no hay usuario Supabase y
    // cierra también la sesión de Firebase del puente. Cerramos Firebase acá
    // igual, explícito, para no depender del timing del puente y evitar que
    // quede una sesión residual que vuelva a "colar" al usuario.
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('No se pudo cerrar la sesión de Supabase:', error)
    }
    try {
      await signOut(auth)
    } catch {
      // Best-effort: si no había sesión de Firebase o falla, no bloquea.
    }
    // Navegar al home: si nos quedamos en una ruta protegida (/conductor,
    // /admin) sin sesión, el gate volvería a rebotar. Desde el home el
    // usuario puede volver a iniciar sesión (ej. como admin).
    navigate('/', { replace: true })
  }

  return (
    <button type="button" className="logout-button" onClick={handleLogout}>
      Cerrar sesión
    </button>
  )
}
