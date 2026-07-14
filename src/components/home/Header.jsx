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
// - CON sesión: el logo se reemplaza por el saludo (avatar + "Hola, <nombre>",
//   ver ProfileChip) — a alguien que ya está adentro no hace falta mostrarle
//   la marca ahí — y a la derecha queda solo la tasa del día, en verde.
//   Debajo, el buscador (solo aparece logueado: buscar/pedir es "usar la
//   app"). La marca Medaner sigue viva en el estado sin sesión y en el resto
//   del sitio, así que sacarla de acá no la borra de la app.
//
// El CTA "Pedir un viaje" se quitó del header a propósito: ya vive como banner
// en el hero (Hero.jsx, banner "Pedir viaje" → /pedir-viaje).
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
          {/* Logueado: el saludo (avatar + nombre) ocupa el lugar del logo.
              Sin sesión (incluido mientras `loading` resuelve): logo de marca
              como siempre — el PNG "m." + wordmark, único lugar donde hace
              falta reforzar la marca ante alguien que todavía no entró. */}
          {logueado ? (
            <ProfileChip />
          ) : (
            <Link to="/" className="home-logo" aria-label="Medaner, ir al inicio">
              <img src="/logoprototipo.png" alt="Medaner" className="home-logo__img" />
              <span className="home-logo__text">
                Medaner<span className="home-logo__dot">.</span>
              </span>
            </Link>
          )}

          <div className="home-header__actions">
            {/* Mientras se resuelve la sesión no renderizamos ni hamburguesa ni
                tasa: evita el flash hamburguesa -> tasa en cada carga. */}
            {loading ? null : logueado ? (
              <TasaCambioWidget />
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
