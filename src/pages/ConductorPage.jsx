import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usePedidosDisponibles } from '../hooks/usePedidosDisponibles'
import { useMisPedidosActivos } from '../hooks/useMisPedidosActivos'
import { useOrderActions, ORDER_ALREADY_TAKEN } from '../hooks/useOrderActions'
import ConductorPedidoCard from '../components/ConductorPedidoCard'
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

  const [pendingId, setPendingId] = useState(null)
  const [feedback, setFeedback] = useState(null)

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
