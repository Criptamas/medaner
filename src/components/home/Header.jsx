import { Link } from 'react-router-dom'
import SesionUsuario from '../SesionUsuario'
import TasaCambioWidget from './TasaCambioWidget'
import ClienteAuthWidget from './ClienteAuthWidget'
import './Header.css'

// Header sticky de la Home.
// - Logo Medaner (marca).
// - Buscador funcional: es controlado desde HomePage (levanta el estado
//   `query`) para poder filtrar tiendas/productos en la misma pantalla.
// - TasaCambioWidget: bloque tappable con la tasa de cambio del BCV + sheet
//   con conversor USD<->Bs. Self-contained (como SesionUsuario): maneja su
//   propio fetch y su propio estado de sheet abierto/cerrado internamente.
// - ClienteAuthWidget: sesión de CLIENTES sobre Supabase Auth, paralela e
//   independiente de SesionUsuario (Firebase, solo admin/conductor).
//   Self-contained igual que TasaCambioWidget.
// - CTA "Pedir un viaje" -> /pedir-viaje (esa ruta y su hook useCreateViaje
//   ya existen; acá SOLO se enlaza, no se recrea lógica). Reemplaza al clásico
//   saludo "Hola, Juan".
// - SesionUsuario: chip existente que muestra quién está logueado. Se auto-
//   oculta si no hay sesión (return null), así el cliente anónimo no ve nada
//   y el personal interno (admin/conductor) sí. No se duplica su lógica.
export default function Header({ query, onQueryChange }) {
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
            <SesionUsuario />
            <TasaCambioWidget />
            <ClienteAuthWidget />
            <Link to="/pedir-viaje" className="home-header__viaje-btn">
              <span aria-hidden="true">🚕</span>
              <span>Pedir un viaje</span>
            </Link>
          </div>
        </div>

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
      </div>
    </header>
  )
}
