import { useState } from 'react'
import { useTasaCambio } from '../../hooks/useTasaCambio'
import TasaCambioSheet from './TasaCambioSheet'
import './TasaCambioWidget.css'

// Formateador propio y simple para bolívares (no existía ninguno en el repo
// todavía — formatUSD en utils/tarifas.js es solo para dólares). Defensivo
// igual que formatUSD: nunca renderiza "Bs. NaN" ni "Bs. undefined".
function formatBs(valor) {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return '—'
  return `Bs. ${numero.toFixed(2)}`
}

// Bloque tappable del header (Home) que muestra la tasa de cambio del BCV y
// abre un bottom sheet con un conversor USD<->Bs. Self-contained a propósito
// (como SesionUsuario): maneja su propio estado de "sheet abierto" acá adentro
// para no tocar la firma de props de Header/HomePage.
export default function TasaCambioWidget() {
  const { valor, fechaActualizacion, cargando, error } = useTasaCambio()
  const [sheetAbierto, setSheetAbierto] = useState(false)

  // Fallo total: ni cache ni API externa respondieron (503 del endpoint, o
  // error de red). El bloque degrada a solo el label, nunca "Bs. NaN".
  const sinDato = !cargando && error && valor == null

  return (
    <>
      <button
        type="button"
        className="tasa-cambio-widget"
        onClick={() => setSheetAbierto(true)}
        aria-haspopup="dialog"
        aria-label={
          valor != null
            ? `Tasa de cambio: ${formatBs(valor)}. Ver conversor de dólares a bolívares`
            : 'Ver tasa de cambio'
        }
      >
        {cargando ? (
          <span className="tasa-cambio-widget__skeleton" aria-hidden="true" />
        ) : sinDato ? (
          <span className="tasa-cambio-widget__empty">Tasa de cambio</span>
        ) : (
          <span className="tasa-cambio-widget__content">
            <span className="tasa-cambio-widget__eyebrow">Tasa de cambio</span>
            <span className="tasa-cambio-widget__row">
              <span className="tasa-cambio-widget__valor">{formatBs(valor)}</span>
              <svg
                className="tasa-cambio-widget__chevron"
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path d="M9 6l6 6-6 6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </span>
        )}
      </button>

      {sheetAbierto && (
        <TasaCambioSheet
          valor={valor}
          fechaActualizacion={fechaActualizacion}
          cargando={cargando}
          error={error}
          onCerrar={() => setSheetAbierto(false)}
        />
      )}
    </>
  )
}
