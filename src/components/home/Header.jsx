import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useClienteAuth } from '../../hooks/useClienteAuth'
import TasaCambioWidget from './TasaCambioWidget'
import ProfileChip from './ProfileChip'
import HeaderMenu from './HeaderMenu'
import ClienteAuthSheet from './ClienteAuthSheet'
import './Header.css'

// Header sticky de la Home. Tiene DOS estados según la sesión de cliente
// (Supabase Auth), en vez del viejo cluster de botones amontonados:
//
// - SIN sesión: logo Medaner + menú hamburguesa (Iniciar sesión · Crear
//   cuenta · Tasa de cambio). Nada más — la app se usa registrado, así que el
//   header anónimo es una invitación a entrar, no un panel de acciones.
// - CON sesión: logo + buscador + tasa del día + chip de perfil (foto +
//   nombre → /perfil). El buscador solo aparece logueado: buscar/pedir es
//   "usar la app".
//
// El CTA "Pedir un viaje" se quitó del header a propósito: ya vive como banner
// gigante en el hero (HeroCarousel, slide /pedir-viaje).
export default function Header({ query, onQueryChange }) {
  const { user, loading } = useClienteAuth()
  // null | 'login' | 'signup' — controla el bottom sheet de auth que abre el
  // menú hamburguesa. El sheet es único; el modo decide en qué pestaña abre.
  const [authMode, setAuthMode] = useState(null)

  const logueado = !loading && !!user

  return (
    <header className="home-header">
      <div className="home-header__inner">
        <div className="home-header__bar">
          <Link to="/" className="home-logo" aria-label="Medaner, ir al inicio">
            <span className="home-logo__mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                <path
                  d="M12 2C7.87 2 4.5 5.2 4.5 9.14c0 4.8 5.9 11.35 6.86 12.38a.87.87 0 0 0 1.28 0c.96-1.03 6.86-7.58 6.86-12.38C19.5 5.2 16.13 2 12 2Z"
                  fill="currentColor"
                />
                <circle cx="12" cy="9" r="2.6" fill="#fff" />
              </svg>
            </span>
            <span className="home-logo__text">
              Medaner<span className="home-logo__dot">.</span>
            </span>
          </Link>

          <div className="home-header__actions">
            {/* Mientras se resuelve la sesión no renderizamos ni hamburguesa ni
                perfil: evita el flash hamburguesa -> perfil en cada carga. */}
            {loading ? null : logueado ? (
              <>
                <TasaCambioWidget />
                <ProfileChip />
              </>
            ) : (
              <HeaderMenu
                onIniciarSesion={() => setAuthMode('login')}
                onCrearCuenta={() => setAuthMode('signup')}
              />
            )}
          </div>
        </div>

        {/* Buscador: solo con sesión (buscar es "usar la app"). */}
        {logueado && (
          <form className="home-search" role="search" onSubmit={(e) => e.preventDefault()}>
            <span className="home-search__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="7" strokeWidth="2" />
                <line x1="16.5" y1="16.5" x2="21" y2="21" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              className="home-search__input"
              placeholder="Buscar tiendas o productos..."
              aria-label="Buscar tiendas o productos"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              enterKeyHint="search"
            />
            {query && (
              <button
                type="button"
                className="home-search__clear"
                aria-label="Limpiar búsqueda"
                onClick={() => onQueryChange('')}
              >
                ×
              </button>
            )}
          </form>
        )}
      </div>

      {authMode && (
        <ClienteAuthSheet modoInicial={authMode} onCerrar={() => setAuthMode(null)} />
      )}
    </header>
  )
}
