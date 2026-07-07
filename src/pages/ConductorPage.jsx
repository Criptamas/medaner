import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usePedidosDisponibles } from '../hooks/usePedidosDisponibles'
import { useMisPedidosActivos } from '../hooks/useMisPedidosActivos'
import { useOrderActions, ORDER_ALREADY_TAKEN } from '../hooks/useOrderActions'
import { useConductorPropio } from '../hooks/useConductorPropio'
import { useDocToggle } from '../hooks/useDocToggle'
import { useFcmToken } from '../hooks/useFcmToken'
import { useTrackDriverLocation } from '../hooks/useTrackDriverLocation'
import { useViajesDisponibles } from '../hooks/useViajesDisponibles'
import { useMisViajesActivos } from '../hooks/useMisViajesActivos'
import ConductorPedidoCard from '../components/ConductorPedidoCard'
import ViajeDisponibleCard from '../components/ViajeDisponibleCard'
import ViajeActivoCard from '../components/ViajeActivoCard'
import ToggleSwitch from '../components/ToggleSwitch'
import StatusMessage from '../components/StatusMessage'
import LogoutButton from '../components/LogoutButton'
import './ConductorPage.css'

const SIGUIENTE_ESTADO = {
  confirmado: { estado: 'en_camino', label: 'Salir hacia la entrega' },
  en_camino: { estado: 'entregado', label: 'Marcar como entregado y cobrado' },
}

export default function ConductorPage() {
  const { user } = useAuth()
  const { pedidos: disponibles, loading: loadingDisponibles, error: errorDisponibles } =
    usePedidosDisponibles()
  const { pedidos: activos, loading: loadingActivos, error: errorActivos } = useMisPedidosActivos(
    user?.uid,
  )
  const { acceptOrder, advanceOrderStatus } = useOrderActions()

  const { conductor, loading: loadingConductor, error: errorConductor } = useConductorPropio(
    user?.uid,
  )
  const { toggle } = useDocToggle()
  const { registrarToken } = useFcmToken()
  const {
    viajes: viajesDisponibles,
    loading: loadingViajes,
    error: errorViajes,
  } = useViajesDisponibles()
  const {
    viajes: viajesActivos,
    loading: loadingViajesActivos,
    error: errorViajesActivos,
  } = useMisViajesActivos(user?.uid)

  // Solo transmite ubicación mientras el conductor está "Disponible".
  useTrackDriverLocation(user?.uid, conductor?.activo ?? false)

  const [pendingId, setPendingId] = useState(null)
  const [feedback, setFeedback] = useState(null)
  // Valor optimista del switch mientras la escritura está en curso: null
  // significa "sin toggle pendiente", y en ese caso se muestra el valor real
  // de Firestore. Se vuelve a null tanto si la escritura resuelve OK (ya
  // llegó por onSnapshot) como si falla (se revierte al valor real).
  const [optimisticActivo, setOptimisticActivo] = useState(null)

  async function handleToggleDisponible(nextValue) {
    setPendingId('disponible')
    setFeedback(null)
    setOptimisticActivo(nextValue)
    try {
      await toggle('conductores', user.uid, 'activo', nextValue)
    } catch {
      setOptimisticActivo(null)
      setFeedback('No pudimos actualizar tu disponibilidad. Revisá tu conexión e intentá de nuevo.')
      setPendingId(null)
      return
    }
    setOptimisticActivo(null)
    setPendingId(null)

    // Registrar el token de push es best-effort: si falla, el conductor
    // igual queda disponible y puede usar la lista de respaldo.
    if (nextValue) {
      try {
        await registrarToken(user.uid)
      } catch {
        setFeedback(
          'Quedaste disponible, pero no pudimos activar las notificaciones push en este dispositivo.',
        )
      }
    }
  }

  async function handleAceptar(pedidoId) {
    setPendingId(pedidoId)
    setFeedback(null)
    try {
      await acceptOrder(pedidoId, user.uid)
    } catch (err) {
      setFeedback(
        err.message === ORDER_ALREADY_TAKEN
          ? 'Este pedido ya fue tomado por otro conductor.'
          : 'No pudimos aceptar el pedido. Revisá tu conexión e intentá de nuevo.',
      )
    } finally {
      setPendingId(null)
    }
  }

  async function handleAvanzar(pedidoId, nuevoEstado) {
    setPendingId(pedidoId)
    setFeedback(null)
    try {
      await advanceOrderStatus(pedidoId, nuevoEstado)
    } catch {
      setFeedback('No pudimos actualizar el pedido. Revisá tu conexión e intentá de nuevo.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="conductor-page">
      <header className="conductor-page__header">
        <h1>Vista del conductor</h1>
        <LogoutButton />
      </header>

      {feedback && (
        <p className="conductor-page__feedback" role="alert">
          {feedback}
        </p>
      )}

      <section className="conductor-page__section">
        {loadingConductor && <StatusMessage variant="loading" title="Cargando tu perfil..." />}

        {!loadingConductor && errorConductor && (
          <StatusMessage
            variant="error"
            title="No pudimos cargar tu perfil"
            description="Revisá tu conexión e intentá de nuevo."
          />
        )}

        {!loadingConductor && !errorConductor && !conductor && (
          <StatusMessage
            variant="empty"
            title="Tu perfil de conductor no está configurado"
            description={`Pedile al administrador que cree tu perfil de conductor con este ID: ${user.uid}`}
          />
        )}

        {!loadingConductor && !errorConductor && conductor && (
          <ToggleSwitch
            checked={optimisticActivo ?? !!conductor.activo}
            disabled={pendingId === 'disponible'}
            onChange={handleToggleDisponible}
            label={(optimisticActivo ?? !!conductor.activo) ? 'Disponible' : 'No disponible'}
          />
        )}
      </section>

      <section className="conductor-page__section">
        <h2>Viajes disponibles</h2>

        {loadingViajes && <StatusMessage variant="loading" title="Buscando viajes..." />}

        {!loadingViajes && errorViajes && (
          <StatusMessage
            variant="error"
            title="No pudimos cargar los viajes disponibles"
            description="Revisá tu conexión e intentá de nuevo."
          />
        )}

        {!loadingViajes && !errorViajes && viajesDisponibles.length === 0 && (
          <StatusMessage variant="empty" title="No hay viajes disponibles por ahora" />
        )}

        {!loadingViajes && !errorViajes && viajesDisponibles.length > 0 && (
          <ul className="conductor-page__list">
            {viajesDisponibles.map((viaje) => (
              <li key={viaje.id}>
                <ViajeDisponibleCard viaje={viaje} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="conductor-page__section">
        <h2>Mis viajes activos</h2>

        {loadingViajesActivos && <StatusMessage variant="loading" title="Cargando tus viajes..." />}

        {!loadingViajesActivos && errorViajesActivos && (
          <StatusMessage
            variant="error"
            title="No pudimos cargar tus viajes"
            description="Revisá tu conexión e intentá de nuevo."
          />
        )}

        {!loadingViajesActivos && !errorViajesActivos && viajesActivos.length === 0 && (
          <StatusMessage variant="empty" title="No tenés viajes activos" />
        )}

        {!loadingViajesActivos && !errorViajesActivos && viajesActivos.length > 0 && (
          <ul className="conductor-page__list">
            {viajesActivos.map((viaje) => (
              <li key={viaje.id}>
                <ViajeActivoCard viaje={viaje} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="conductor-page__section">
        <h2>Mis pedidos activos</h2>

        {loadingActivos && <StatusMessage variant="loading" title="Cargando tus pedidos..." />}

        {!loadingActivos && errorActivos && (
          <StatusMessage
            variant="error"
            title="No pudimos cargar tus pedidos"
            description="Revisá tu conexión e intentá de nuevo."
          />
        )}

        {!loadingActivos && !errorActivos && activos.length === 0 && (
          <StatusMessage variant="empty" title="No tenés pedidos activos" />
        )}

        {!loadingActivos && !errorActivos && activos.length > 0 && (
          <ul className="conductor-page__list">
            {activos.map((pedido) => {
              const siguiente = SIGUIENTE_ESTADO[pedido.estado]
              return (
                <ConductorPedidoCard key={pedido.id} pedido={pedido} mostrarEstado>
                  {siguiente && (
                    <button
                      type="button"
                      disabled={pendingId === pedido.id}
                      onClick={() => handleAvanzar(pedido.id, siguiente.estado)}
                    >
                      {siguiente.label}
                    </button>
                  )}
                </ConductorPedidoCard>
              )
            })}
          </ul>
        )}
      </section>

      <section className="conductor-page__section">
        <h2>Pedidos disponibles</h2>

        {loadingDisponibles && (
          <StatusMessage variant="loading" title="Buscando pedidos disponibles..." />
        )}

        {!loadingDisponibles && errorDisponibles && (
          <StatusMessage
            variant="error"
            title="No pudimos cargar los pedidos disponibles"
            description="Revisá tu conexión e intentá de nuevo."
          />
        )}

        {!loadingDisponibles && !errorDisponibles && disponibles.length === 0 && (
          <StatusMessage variant="empty" title="No hay pedidos disponibles por ahora" />
        )}

        {!loadingDisponibles && !errorDisponibles && disponibles.length > 0 && (
          <ul className="conductor-page__list">
            {disponibles.map((pedido) => (
              <ConductorPedidoCard key={pedido.id} pedido={pedido}>
                <button
                  type="button"
                  disabled={pendingId === pedido.id}
                  onClick={() => handleAceptar(pedido.id)}
                >
                  Aceptar
                </button>
              </ConductorPedidoCard>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
