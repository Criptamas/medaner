import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useClienteAuth } from '../../hooks/useClienteAuth'
import ClienteAuthSheet from './ClienteAuthSheet'
import './ClienteAuthWidget.css'

// Bloque del header (Home) para la sesión de CLIENTES sobre Supabase Auth —
// independiente de SesionUsuario (ese es Firebase, solo admin/conductor).
// Self-contained como TasaCambioWidget: guarda su propio estado de "sheet
// abierto" acá adentro, no toca la firma de props de Header/HomePage.
export default function ClienteAuthWidget() {
  const { user, nombre, loading } = useClienteAuth()
  const [sheetAbierto, setSheetAbierto] = useState(false)

  // Mientras se resuelve la sesión inicial no se renderiza nada: evita el
  // flash "Iniciar sesión" -> "Hola, X" que se vería en cada carga de página.
  if (loading) return null

  function handleLogout() {
    supabase.auth.signOut()
  }

  return (
    <>
      {user ? (
        <div className="cliente-auth-widget">
          <span className="cliente-auth-widget__saludo">Hola, {nombre || 'cliente'}</span>
          <button
            type="button"
            className="cliente-auth-widget__logout"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" aria-hidden="true">
              <path
                d="M15 17l5-5-5-5M20 12H9M12 19H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="cliente-auth-widget__login-btn"
          onClick={() => setSheetAbierto(true)}
        >
          Iniciar sesión
        </button>
      )}

      {sheetAbierto && <ClienteAuthSheet onCerrar={() => setSheetAbierto(false)} />}
    </>
  )
}
