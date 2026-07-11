import { Navigate } from 'react-router-dom'

// Deprecado: el login canónico ya no es este formulario Firebase, sino
// ClienteAuthSheet (Supabase Auth), montado desde la Home. Se deja la ruta
// /login viva (por links viejos) pero redirige directo a "/" en vez de
// dejar un formulario Firebase huérfano y confuso.
export default function LoginPage() {
  return <Navigate to="/" replace />
}
