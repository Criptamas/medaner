import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useViaje } from '../hooks/useViaje'
import { useViajeActions, VIAJE_ALREADY_TAKEN } from '../hooks/useViajeActions'
import { useCompartirUbicacionViaje, UBICACION_ESTADO } from '../hooks/useCompartirUbicacionViaje'
import { useConductorPropio } from '../hooks/useConductorPropio'
import { construirEnlaceWhatsApp } from '../utils/telefono'
import { VIAJE_ESTADO_BADGE_LABELS } from '../utils/pedidoLabels'
import StatusMessage from '../components/StatusMessage'
import './ConductorViajeDetallePage.css'

const VEHICULO_LABELS = {
  moto: 'Moto',
  carro: 'Carro',
}

// Mensaje que ve el conductor según el estado del permiso de geolocalización
// mientras comparte su ubicación con el cliente.
const UBICACION_MENSAJE = {
  [UBICACION_ESTADO.COMPARTIENDO]: '📍 Compartiendo tu ubicación con el cliente…',
  [UBICACION_ESTADO.PERMISO_DENEGADO]:
    '⚠️ Activá el permiso de ubicación para que el cliente te vea en el mapa.',
  [UBICACION_ESTADO.SIN_SOPORTE]: '⚠️ Este dispositivo no permite compartir ubicación.',
  [UBICACION_ESTADO.ERROR]:
    '⚠️ No pudimos leer tu ubicación; el cliente no te verá moverte por ahora.',
}

// Mensaje prellenado al abrir WhatsApp con el cliente: le ahorra al
// conductor escribir el saludo inicial.
const MENSAJE_WHATSAPP_CLIENTE = 'Hola, soy tu conductor de Medaner. Te escribo por tu viaje.'

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
  // Perfil propio del conductor: se necesita su nombre/teléfono para
  // copiarlos al viaje al aceptar (ver handleAceptar). Es la única forma en
  // que el cliente —que no tiene login y no puede leer conductores/{uid}
  // por las reglas de Firestore— se entera de quién lo va a buscar.
  const { conductor, loading: loadingConductor } = useConductorPropio(user?.uid)

  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  async function handleAceptar() {
    setSubmitting(true)
    setFeedback(null)
    try {
      await acceptViaje(viajeId, user.uid, {
        nombre: conductor?.nombre,
        telefono: conductor?.telefono,
      })
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

  // Contacto del cliente: solo se ofrece una vez que ESTE conductor aceptó
  // el viaje (esMio), igual que "Mis viajes activos" (ViajeActivoCard) ya
  // hace hoy. Antes de aceptar, el viaje sigue en el pool "disponible" que
  // ve cualquier conductor; mostrar ahí el teléfono del cliente invitaría a
  // que varios lo contacten a la vez sin haberse comprometido con el viaje.
  const enlaceWhatsAppCliente = esMio ? construirEnlaceWhatsApp(viaje?.clienteTelefono) : null

  // Transmitir ubicación al viaje solo si es MI viaje y está activo
  // (confirmado/en_curso). El hook resuelve throttle, permisos y cleanup;
  // se llama siempre (nunca condicionalmente) y se apaga con `activo=false`.
  const compartiendoUbicacion =
    esMio && (viaje?.estado === 'confirmado' || viaje?.estado === 'en_curso')
  const ubicacionEstado = useCompartirUbicacionViaje(viajeId, compartiendoUbicacion)

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

          {compartiendoUbicacion && (
            <p
              className={
                ubicacionEstado === UBICACION_ESTADO.COMPARTIENDO ||
                ubicacionEstado === UBICACION_ESTADO.INACTIVO
                  ? 'conductor-viaje-detalle-page__ubicacion'
                  : 'conductor-viaje-detalle-page__ubicacion conductor-viaje-detalle-page__ubicacion--alerta'
              }
              role="status"
            >
              {UBICACION_MENSAJE[ubicacionEstado] ??
                UBICACION_MENSAJE[UBICACION_ESTADO.COMPARTIENDO]}
            </p>
          )}

          {esMio && (
            <section className="conductor-viaje-detalle-page__section">
              <h2>Cliente</h2>
              <p>
                {viaje.clienteNombre || 'Cliente'}
                {!enlaceWhatsAppCliente && viaje.clienteTelefono
                  ? ` · ${viaje.clienteTelefono}`
                  : ''}
              </p>
              {enlaceWhatsAppCliente && (
                <a
                  href={`${enlaceWhatsAppCliente}?text=${encodeURIComponent(MENSAJE_WHATSAPP_CLIENTE)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="conductor-viaje-detalle-page__whatsapp"
                >
                  💬 Escribir al cliente por WhatsApp
                </a>
              )}
            </section>
          )}

          <section className="conductor-viaje-detalle-page__section">
            <h2>Vehículo</h2>
            <p>{VEHICULO_LABELS[viaje.tipoVehiculo] ?? viaje.tipoVehiculo}</p>
          </section>

          <section className="conductor-viaje-detalle-page__section">
            <h2>Recorrido</h2>
            <p className="conductor-viaje-detalle-page__coords">
              Origen: {viaje.origenNombre || formatCoords(viaje.origen)}
            </p>
            <p className="conductor-viaje-detalle-page__coords">
              Destino: {viaje.destinoNombre || formatCoords(viaje.destino)}
            </p>
          </section>

          {feedback && (
            <p className="conductor-viaje-detalle-page__feedback" role="alert">
              {feedback}
            </p>
          )}

          {viaje.estado === 'pendiente' && (
            // Se espera a que cargue el perfil propio (loadingConductor) para
            // que nombre/teléfono siempre viajen completos al aceptar — así
            // el cliente nunca ve una identidad de conductor vacía.
            <button type="button" onClick={handleAceptar} disabled={submitting || loadingConductor}>
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
