import { useEffect, useState } from 'react'
import { onMessage } from 'firebase/messaging'
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
import { getFcmMessaging } from '../firebase'
import ConductorPedidoCard from '../components/ConductorPedidoCard'
import ViajeDisponibleCard from '../components/ViajeDisponibleCard'
import ViajeActivoCard from '../components/ViajeActivoCard'
import ToggleSwitch from '../components/ToggleSwitch'
import StatusMessage from '../components/StatusMessage'
import LogoutButton from '../components/LogoutButton'
import SesionUsuario from '../components/SesionUsuario'
import Toast from '../components/Toast'
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
  const { registrarToken, error: errorFcm } = useFcmToken()
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
  const [toastMensaje, setToastMensaje] = useState(null)
  // True mientras se pide permiso + token de push, para no mostrar el aviso de
  // "sin notificaciones" en el parpadeo entre activarse y que el token quede
  // escrito en Firestore.
  const [registrandoPush, setRegistrandoPush] = useState(false)

  // Aviso in-app de un mensaje push que llega mientras el conductor tiene
  // esta pantalla abierta (foreground): el navegador no muestra la
  // notificación del sistema en ese caso, así que sin esto el conductor no
  // se entera de un viaje nuevo hasta refrescar. No depende del toggle
  // "Disponible": si no hay token registrado, simplemente no llegan mensajes.
  useEffect(() => {
    let unsubscribe
    let cancelado = false

    getFcmMessaging().then((messaging) => {
      if (!messaging || cancelado) return
      unsubscribe = onMessage(messaging, (payload) => {
        // Los push son data-only (ver api/notificar-viaje.js): título y cuerpo
        // viajan en payload.data, no en payload.notification.
        const texto = [payload.data?.title, payload.data?.body].filter(Boolean).join(' — ')
        if (texto) setToastMensaje(texto)
      })
    })

    return () => {
      cancelado = true
      unsubscribe?.()
    }
  }, [])
  // Valor optimista del switch mientras la escritura está en curso: null
  // significa "sin toggle pendiente", y en ese caso se muestra el valor real
  // de Firestore. Se vuelve a null tanto si la escritura resuelve OK (ya
  // llegó por onSnapshot) como si falla (se revierte al valor real).
  const [optimisticActivo, setOptimisticActivo] = useState(null)

  // Pide permiso + token de push y lo guarda en conductores/{uid}. Devuelve
  // true si quedó un token válido registrado. `registrarToken` degrada a null
  // (sin lanzar) cuando NO hay soporte, permiso o SW listo — por eso chequeamos
  // el valor de retorno, no solo el throw: antes, ese null pasaba inadvertido y
  // el conductor quedaba "Disponible" sin token, sin enterarse de que no le iban
  // a llegar avisos. El aviso persistente de abajo (activo && sin fcmToken)
  // cubre además el caso de un token invalidado más tarde.
  async function registrarPush() {
    setRegistrandoPush(true)
    try {
      const token = await registrarToken(user.uid)
      return Boolean(token)
    } catch {
      return false
    } finally {
      setRegistrandoPush(false)
    }
  }

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

    // Registrar el token de push es best-effort: si falla, el conductor igual
    // queda disponible y puede usar la lista de respaldo. Pero ahora se le
    // avisa explícitamente (antes fallaba en silencio).
    if (nextValue) {
      const ok = await registrarPush()
      if (!ok) {
        setFeedback(
          'Quedaste disponible, pero este dispositivo no activó las notificaciones. No te van a llegar avisos de viajes nuevos — mirá el aviso de abajo.',
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
      <Toast mensaje={toastMensaje} onCerrar={() => setToastMensaje(null)} />

      <header className="conductor-page__header">
        <div className="conductor-page__titulo">
          <h1>Vista del conductor</h1>
          <SesionUsuario nombre={conductor?.nombre} />
        </div>
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

        {/* Aviso clave: estás disponible pero SIN token de push registrado, así
            que no te va a llegar ningún viaje aunque el switch diga "Disponible".
            Es el estado que causaba el "tengo todo activado y no me llega nada"
            (típico en iPhone sin la app instalada, o token invalidado). Se
            muestra el motivo real (errorFcm) y un botón para reintentar. */}
        {!loadingConductor && !errorConductor && conductor?.activo && !conductor?.fcmToken &&
          !registrandoPush && (
            <div className="conductor-page__push-aviso" role="alert">
              <p className="conductor-page__push-aviso-titulo">
                ⚠️ No vas a recibir avisos de viajes en este dispositivo
              </p>
              <p>
                {errorFcm ||
                  'Las notificaciones push no están activas.'}{' '}
                En iPhone tenés que instalar la app (Compartir → “Agregar a pantalla de inicio”)
                y volver a activar “Disponible”.
              </p>
              <button
                type="button"
                className="conductor-page__push-aviso-btn"
                onClick={registrarPush}
                disabled={registrandoPush}
              >
                {registrandoPush ? 'Activando...' : 'Activar notificaciones'}
              </button>
            </div>
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
