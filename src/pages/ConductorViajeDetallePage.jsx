import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useViaje } from '../hooks/useViaje'
import { useViajeActions, VIAJE_ALREADY_TAKEN } from '../hooks/useViajeActions'
import { VIAJE_ESTADO_BADGE_LABELS } from '../utils/pedidoLabels'
import StatusMessage from '../components/StatusMessage'
import './ConductorViajeDetallePage.css'

const VEHICULO_LABELS = {
  moto: 'Moto',
  carro: 'Carro',
}

function formatCoords(punto) {
  if (!punto) return '—'
  return `${punto.lat?.toFixed(5)}, ${punto.lng?.toFixed(5)}`
}

// Una sola pantalla reactiva: como useViaje usa onSnapshot, el botón cambia
// solo ("Aceptar viaje" → "Iniciar viaje") cuando el estado cambia, sin
// necesidad de navegar a otra ruta después de aceptar.
export default function ConductorViajeDetallePage() {
  const { viajeId } = useParams()
  const { user } = useAuth()
  const { viaje, loading, error } = useViaje(viajeId)
  const { acceptViaje, advanceViajeStatus } = useViajeActions()

  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  async function handleAceptar() {
    setSubmitting(true)
    setFeedback(null)
    try {
      await acceptViaje(viajeId, user.uid)
    } catch (err) {
      setFeedback(
        err.message === VIAJE_ALREADY_TAKEN
          ? 'Este viaje ya fue tomado por otro conductor.'
          : 'No pudimos aceptar el viaje. Revisá tu conexión e intentá de nuevo.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleIniciar() {
    setSubmitting(true)
    setFeedback(null)
    try {
      await advanceViajeStatus(viajeId, 'en_curso')
    } catch {
      setFeedback('No pudimos actualizar el viaje. Revisá tu conexión e intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFinalizar() {
    setSubmitting(true)
    setFeedback(null)
    try {
      await advanceViajeStatus(viajeId, 'completado')
    } catch {
      setFeedback('No pudimos actualizar el viaje. Revisá tu conexión e intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const esMio = viaje?.conductorId === user?.uid

  return (
    <div className="conductor-viaje-detalle-page">
      <header className="conductor-viaje-detalle-page__header">
        <Link to="/conductor" className="conductor-viaje-detalle-page__back" aria-label="Volver">
          ←
        </Link>
        <h1>Detalle del viaje</h1>
      </header>

      {loading && <StatusMessage variant="loading" title="Cargando viaje..." />}

      {!loading && error && (
        <StatusMessage
          variant="error"
          title="No pudimos cargar este viaje"
          description="Revisá tu conexión e intentá de nuevo."
        />
      )}

      {!loading && !error && !viaje && (
        <StatusMessage variant="empty" title="No encontramos este viaje" />
      )}

      {!loading && !error && viaje && (
        <div className="conductor-viaje-detalle-page__content">
          <p className="conductor-viaje-detalle-page__estado">
            {VIAJE_ESTADO_BADGE_LABELS[viaje.estado] ?? viaje.estado}
          </p>

          <section className="conductor-viaje-detalle-page__section">
            <h2>Vehículo</h2>
            <p>{VEHICULO_LABELS[viaje.tipoVehiculo] ?? viaje.tipoVehiculo}</p>
          </section>

          <section className="conductor-viaje-detalle-page__section">
            <h2>Recorrido</h2>
            <p className="conductor-viaje-detalle-page__coords">
              Origen: {formatCoords(viaje.origen)}
            </p>
            <p className="conductor-viaje-detalle-page__coords">
              Destino: {formatCoords(viaje.destino)}
            </p>
          </section>

          {feedback && (
            <p className="conductor-viaje-detalle-page__feedback" role="alert">
              {feedback}
            </p>
          )}

          {viaje.estado === 'pendiente' && (
            <button type="button" onClick={handleAceptar} disabled={submitting}>
              {submitting ? 'Aceptando...' : 'Aceptar viaje'}
            </button>
          )}

          {viaje.estado === 'confirmado' && esMio && (
            <button type="button" onClick={handleIniciar} disabled={submitting}>
              {submitting ? 'Iniciando...' : 'Iniciar viaje'}
            </button>
          )}

          {viaje.estado === 'confirmado' && !esMio && (
            <StatusMessage variant="empty" title="Este viaje ya fue tomado por otro conductor" />
          )}

          {viaje.estado === 'en_curso' && esMio && (
            <button type="button" onClick={handleFinalizar} disabled={submitting}>
              {submitting ? 'Finalizando...' : 'Marcar como completado y cobrado'}
            </button>
          )}

          {viaje.estado === 'en_curso' && !esMio && (
            <StatusMessage variant="empty" title="Este viaje está en curso con otro conductor" />
          )}
        </div>
      )}
    </div>
  )
}
