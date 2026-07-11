import { useState } from 'react'
import IlustracionBuscando from './IlustracionBuscando'
import ViajeResumenDetalle from './ViajeResumenDetalle'
import './BuscandoConductorPanel.css'

// Panel anclado abajo del mapa mientras el viaje está "pendiente" (buscando un
// conductor). No es un modal con backdrop: el mapa de fondo debe seguir visible
// (estilo Uber), por eso se adapta el patrón de sheet sin tapar la pantalla.
export default function BuscandoConductorPanel({ viajeId, viaje }) {
  const [expandido, setExpandido] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [errorCancelar, setErrorCancelar] = useState(null)

  async function handleCancelar() {
    setCancelando(true)
    setErrorCancelar(null)
    try {
      const res = await fetch('/api/cancelar-viaje', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viajeId }),
      })

      if (!res.ok) {
        // 409 = un conductor tomó el viaje justo antes de este click (carrera
        // esperable). No navegamos ni forzamos nada: el onSnapshot de useViaje
        // mueve la pantalla a "conductor asignado" solo si en efecto ya lo
        // tomaron. Cualquier otro código (404/500/red) es un error a reintentar.
        setErrorCancelar(
          res.status === 409
            ? 'Un conductor ya tomó tu viaje, no se puede cancelar.'
            : 'No pudimos cancelar el viaje. Revisá tu conexión e intentá de nuevo.',
        )
        setCancelando(false)
        return
      }

      // Éxito: NO tocamos estado local ni navegamos. El endpoint escribió
      // estado:'cancelado' en Firestore y el onSnapshot de useViaje re-renderiza
      // solo hacia la pantalla terminal "cancelado". Dejamos `cancelando` en
      // true a propósito para que el botón no se re-habilite en el instante
      // previo a ese re-render (este componente se desmonta enseguida).
    } catch {
      setErrorCancelar('No pudimos cancelar el viaje. Revisá tu conexión e intentá de nuevo.')
      setCancelando(false)
    }
  }

  return (
    <section className="viaje-panel buscando-panel" aria-label="Buscando conductores">
      <header className="buscando-panel__header">
        <span className="buscando-panel__pulso" aria-hidden="true" />
        <div>
          <h2 className="buscando-panel__titulo">Buscando conductores</h2>
          <p className="buscando-panel__subtitulo">
            Te avisamos apenas un conductor acepte tu viaje.
          </p>
        </div>
      </header>

      {/* La ilustración deja lugar a los detalles al expandir, para no estirar
          el panel de más y mantener el mapa visible en pantallas chicas. */}
      {expandido ? (
        <ViajeResumenDetalle viaje={viaje} />
      ) : (
        <IlustracionBuscando className="buscando-panel__ilustracion" />
      )}

      {errorCancelar && (
        <p className="buscando-panel__error" role="alert">
          {errorCancelar}
        </p>
      )}

      <div className="buscando-panel__acciones">
        <button
          type="button"
          className="buscando-panel__cancelar"
          onClick={handleCancelar}
          disabled={cancelando}
        >
          {cancelando ? 'Cancelando…' : 'Cancelar viaje'}
        </button>
        <button
          type="button"
          className="buscando-panel__detalles"
          onClick={() => setExpandido((v) => !v)}
          aria-expanded={expandido}
        >
          {expandido ? 'Ocultar detalles' : 'Ver detalles'}
        </button>
      </div>
    </section>
  )
}
