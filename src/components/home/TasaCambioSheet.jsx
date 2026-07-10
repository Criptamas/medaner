import { useEffect, useState } from 'react'
import StatusMessage from '../StatusMessage'
import './TasaCambioSheet.css'

// Formatea fechaActualizacion (string ISO que devuelve DolarApi, ver
// api/tasa-cambio.js) a texto legible en español. Defensivo: fecha ausente o
// inválida no rompe el render, simplemente no se muestra la línea de fecha.
function formatearFecha(fechaISO) {
  if (!fechaISO) return null
  const fecha = new Date(fechaISO)
  if (Number.isNaN(fecha.getTime())) return null
  return fecha.toLocaleDateString('es-VE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Bottom sheet de tasa de cambio: mismo patrón "sin librerías" que
// CartDrawer/CotizacionViajeSheet (backdrop full-screen + sheet con
// position:absolute; bottom:0). Componente independiente, sin estado
// compartido con esos dos.
export default function TasaCambioSheet({ valor, fechaActualizacion, cargando, error, onCerrar }) {
  // Cuál de los dos campos es el editable ahora mismo; el otro se calcula.
  const [campoActivo, setCampoActivo] = useState('usd')
  const [montoUsd, setMontoUsd] = useState('1')
  const [montoBs, setMontoBs] = useState('')

  // Calcula el campo derivado cada vez que cambia la tasa (al montar, o si
  // llega tarde porque el sheet se abrió mientras el fetch todavía estaba en
  // vuelo) o cuando el usuario invierte el campo editable, para que el campo
  // read-only siempre quede sincronizado con el que se está tipeando.
  useEffect(() => {
    if (valor == null) return
    if (campoActivo === 'usd') {
      const numero = Number(montoUsd)
      setMontoBs(montoUsd === '' || Number.isNaN(numero) ? '' : (numero * valor).toFixed(2))
    } else {
      const numero = Number(montoBs)
      setMontoUsd(montoBs === '' || Number.isNaN(numero) ? '' : (numero / valor).toFixed(2))
    }
    // Solo recalcular cuando cambian tasa o campo activo (el toggle de ↕
    // debe re-sincronizar); el propio onChange de cada input ya actualiza el
    // otro campo en tiempo real, no hace falta reaccionar a montoUsd/montoBs
    // acá también (evita loops de sincronización cruzada).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, campoActivo])

  function handleUsdChange(e) {
    const raw = e.target.value
    if (raw !== '' && Number(raw) < 0) return // sanitiza: nunca negativos
    setMontoUsd(raw)
    if (valor != null) {
      const numero = Number(raw)
      setMontoBs(raw === '' || Number.isNaN(numero) ? '' : (numero * valor).toFixed(2))
    }
  }

  function handleBsChange(e) {
    const raw = e.target.value
    if (raw !== '' && Number(raw) < 0) return
    setMontoBs(raw)
    if (valor != null && valor !== 0) {
      const numero = Number(raw)
      setMontoUsd(raw === '' || Number.isNaN(numero) ? '' : (numero / valor).toFixed(2))
    }
  }

  function invertir() {
    setCampoActivo((actual) => (actual === 'usd' ? 'bs' : 'usd'))
  }

  const sinDatos = !cargando && Boolean(error) && valor == null
  const fechaLegible = formatearFecha(fechaActualizacion)

  return (
    <div className="tasa-sheet">
      <button
        type="button"
        className="tasa-sheet__backdrop"
        onClick={onCerrar}
        aria-label="Cerrar tasa de cambio"
      />
      <div className="tasa-sheet__sheet" role="dialog" aria-label="Tasa de cambio">
        <div className="tasa-sheet__handle" aria-hidden="true" />

        <header className="tasa-sheet__header">
          <h2>Tasa de cambio</h2>
          <button
            type="button"
            className="tasa-sheet__close"
            onClick={onCerrar}
            aria-label="Cerrar tasa de cambio"
          >
            ✕
          </button>
        </header>

        {cargando && valor == null && !error && (
          <StatusMessage variant="loading" title="Consultando la tasa de cambio..." />
        )}

        {sinDatos && (
          <StatusMessage
            variant="error"
            title="Tasa no disponible en este momento"
            description="Intenta más tarde."
          />
        )}

        {valor != null && (
          <>
            <div className="tasa-sheet__conversor">
              <label className="tasa-sheet__campo">
                <span className="tasa-sheet__campo-label">Monto en Dólares</span>
                <span className="tasa-sheet__input-wrap">
                  <span className="tasa-sheet__prefijo">$</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    className="tasa-sheet__input"
                    value={montoUsd}
                    onChange={handleUsdChange}
                    readOnly={campoActivo === 'bs'}
                    aria-label="Monto en dólares"
                  />
                </span>
              </label>

              <button
                type="button"
                className="tasa-sheet__invertir"
                onClick={invertir}
                aria-label="Invertir campo editable"
              >
                ↕
              </button>

              <label className="tasa-sheet__campo">
                <span className="tasa-sheet__campo-label">Monto en Bolívares</span>
                <span className="tasa-sheet__input-wrap">
                  <span className="tasa-sheet__prefijo">Bs</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    className="tasa-sheet__input"
                    value={montoBs}
                    onChange={handleBsChange}
                    readOnly={campoActivo === 'usd'}
                    aria-label="Monto en bolívares"
                  />
                </span>
              </label>
            </div>

            <p className="tasa-sheet__fuente">
              Tasa de cambio de acuerdo al Banco Central de Venezuela
              {fechaLegible && <> · Actualizada el {fechaLegible}</>}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
