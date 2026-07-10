import { useEffect, useState } from 'react'
import TasaCambioWidget from './TasaCambioWidget'
import './HeaderMenu.css'

// Menú hamburguesa del header cuando NO hay sesión de cliente. Despliega las
// tres acciones que antes vivían sueltas y amontonadas en la barra: iniciar
// sesión, crear cuenta y la tasa de cambio del día. Panel-dropdown liviano
// sin librerías (mismo espíritu que el carrusel/sheets): botón + panel
// absoluto + backdrop para cerrar, sin dependencias extra.
//
// La tasa se resuelve reusando TasaCambioWidget tal cual (self-contained:
// trae su propio fetch y su propio bottom sheet con el conversor), así el
// menú no duplica lógica de tasa — solo lo ubica como una fila más.
export default function HeaderMenu({ onIniciarSesion, onCrearCuenta }) {
  const [abierto, setAbierto] = useState(false)

  // Cerrar con Escape (accesibilidad + salida rápida en desktop).
  useEffect(() => {
    if (!abierto) return
    const onKey = (e) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [abierto])

  function elegir(accion) {
    setAbierto(false)
    accion()
  }

  return (
    <div className="header-menu">
      <button
        type="button"
        className="header-menu__toggle"
        aria-label="Abrir menú"
        aria-haspopup="true"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" aria-hidden="true">
          <line x1="4" y1="7" x2="20" y2="7" strokeWidth="2" strokeLinecap="round" />
          <line x1="4" y1="12" x2="20" y2="12" strokeWidth="2" strokeLinecap="round" />
          <line x1="4" y1="17" x2="20" y2="17" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {abierto && (
        <>
          <button
            type="button"
            className="header-menu__backdrop"
            aria-label="Cerrar menú"
            onClick={() => setAbierto(false)}
          />
          <div className="header-menu__panel" role="menu">
            <button
              type="button"
              role="menuitem"
              className="header-menu__item"
              onClick={() => elegir(onIniciarSesion)}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              role="menuitem"
              className="header-menu__item header-menu__item--primary"
              onClick={() => elegir(onCrearCuenta)}
            >
              Crear cuenta
            </button>

            <div className="header-menu__sep" role="separator" />

            <div className="header-menu__tasa">
              <TasaCambioWidget />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
