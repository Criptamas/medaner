import { useMemo, useState } from 'react'
import LogoutButton from '../components/LogoutButton'
import SesionUsuario from '../components/SesionUsuario'
import StatusMessage from '../components/StatusMessage'
import AdminPedidoRow from '../components/AdminPedidoRow'
import AdminTiendaRow from '../components/AdminTiendaRow'
import AdminConductorRow from '../components/AdminConductorRow'
import AdminSolicitudRow from '../components/AdminSolicitudRow'
import { useAllPedidos } from '../hooks/useAllPedidos'
import { useAllTiendas } from '../hooks/useAllTiendas'
import { useAllConductores } from '../hooks/useAllConductores'
import { useSolicitudesConductor } from '../hooks/useSolicitudesConductor'
import { useDocToggle } from '../hooks/useDocToggle'
import './AdminPage.css'

const TABS = [
  { key: 'pedidos', label: 'Pedidos' },
  { key: 'tiendas', label: 'Tiendas' },
  { key: 'conductores', label: 'Conductores' },
  { key: 'solicitudes', label: 'Solicitudes' },
]

export default function AdminPage() {
  const [tab, setTab] = useState('pedidos')
  const [pendingId, setPendingId] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const { pedidos, loading: loadingPedidos, error: errorPedidos } = useAllPedidos()
  const {
    tiendas,
    loading: loadingTiendas,
    error: errorTiendas,
    refetch: refetchTiendas,
  } = useAllTiendas()
  const {
    conductores,
    loading: loadingConductores,
    error: errorConductores,
  } = useAllConductores()
  const {
    solicitudes,
    loading: loadingSolicitudes,
    error: errorSolicitudes,
    refetch: refetchSolicitudes,
  } = useSolicitudesConductor()
  const { toggle } = useDocToggle()

  // Confirmación de que se aprobó una solicitud: ya no hay credenciales que
  // mostrar (el conductor entra con su propia cuenta Supabase, no se crea
  // una cuenta Firebase con password temporal), pero se deja el aviso fijo
  // en pantalla igual — no un alert() bloqueante — hasta que el admin lo cierra.
  const [aprobacionExitosa, setAprobacionExitosa] = useState(false)

  // Separa pendientes (con acciones) de ya procesadas (historial colapsado),
  // priorizando simplicidad: un solo array recorrido dos veces, sin ordenar
  // ni paginar — el volumen de solicitudes de conductor es bajo.
  const solicitudesPendientes = useMemo(
    () => solicitudes.filter((s) => s.estado === 'pendiente'),
    [solicitudes],
  )
  const solicitudesProcesadas = useMemo(
    () => solicitudes.filter((s) => s.estado !== 'pendiente'),
    [solicitudes],
  )

  async function handleToggleTienda(tiendaId, nextValue) {
    setPendingId(tiendaId)
    setFeedback(null)
    try {
      // tiendas vive en Supabase: el catálogo no tiene policy de update para
      // el cliente (es de solo lectura desde el navegador), así que la
      // escritura pasa por un endpoint serverless con service_role.
      const response = await fetch('/api/admin-toggle-tienda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiendaId, activa: nextValue }),
      })
      if (!response.ok) {
        throw new Error(`POST /api/admin-toggle-tienda respondió ${response.status}`)
      }
      // useAllTiendas ya no es tiempo real (antes onSnapshot de Firestore
      // empujaba el cambio solo; ahora es un fetch al montar), así que hay
      // que refrescar a mano para que el switch no quede visualmente
      // pegado al valor viejo hasta recargar la página.
      await refetchTiendas()
    } catch {
      setFeedback('No pudimos actualizar la tienda. Revisá tu conexión e intentá de nuevo.')
    } finally {
      setPendingId(null)
    }
  }

  async function handleToggleConductor(conductorId, nextValue) {
    setPendingId(conductorId)
    setFeedback(null)
    try {
      await toggle('conductores', conductorId, 'cuotaSemanalPagada', nextValue)
    } catch {
      setFeedback('No pudimos actualizar el conductor. Revisá tu conexión e intentá de nuevo.')
    } finally {
      setPendingId(null)
    }
  }

  async function handleAprobarSolicitud(solicitudId) {
    setPendingId(solicitudId)
    setFeedback(null)
    try {
      const response = await fetch('/api/admin-aprobar-conductor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitudId }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || `POST /api/admin-aprobar-conductor respondió ${response.status}`)
      }
      // El conductor ya puede iniciar sesión con su propia cuenta Supabase
      // (ya no hay password temporal que generar ni mostrar acá).
      setAprobacionExitosa(true)
      await refetchSolicitudes()
    } catch {
      setFeedback('No pudimos aprobar la solicitud. Revisá tu conexión e intentá de nuevo.')
    } finally {
      setPendingId(null)
    }
  }

  async function handleRechazarSolicitud(solicitudId) {
    const motivo = window.prompt('Motivo del rechazo (opcional):')
    if (motivo === null) return // el admin canceló el prompt, no se envía nada

    setPendingId(solicitudId)
    setFeedback(null)
    try {
      const response = await fetch('/api/admin-rechazar-conductor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitudId, motivo: motivo.trim() || null }),
      })
      if (!response.ok) {
        throw new Error(`POST /api/admin-rechazar-conductor respondió ${response.status}`)
      }
      await refetchSolicitudes()
    } catch {
      setFeedback('No pudimos rechazar la solicitud. Revisá tu conexión e intentá de nuevo.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div className="admin-page__titulo">
          <h1>Panel de administración</h1>
          {/* Sin prop `nombre`: acá resuelve por el mapa de personal interno
              (ver utils/nombresUsuarios), no hay doc de perfil para el admin. */}
          <SesionUsuario />
        </div>
        <LogoutButton />
      </header>

      <nav className="admin-page__tabs">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`admin-page__tab ${tab === item.key ? 'admin-page__tab--active' : ''}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {feedback && (
        <p className="admin-page__feedback" role="alert">
          {feedback}
        </p>
      )}

      {aprobacionExitosa && (
        <div className="admin-page__credenciales" role="alert">
          <p className="admin-page__credenciales-titulo">
            Conductor aprobado. Ya puede iniciar sesión con su cuenta.
          </p>
          <div className="admin-page__credenciales-acciones">
            <button type="button" onClick={() => setAprobacionExitosa(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {tab === 'pedidos' && (
        <section className="admin-page__section">
          {loadingPedidos && <StatusMessage variant="loading" title="Cargando pedidos..." />}

          {!loadingPedidos && errorPedidos && (
            <StatusMessage
              variant="error"
              title="No pudimos cargar los pedidos"
              description="Revisá tu conexión e intentá de nuevo."
            />
          )}

          {!loadingPedidos && !errorPedidos && pedidos.length === 0 && (
            <StatusMessage variant="empty" title="Todavía no hay pedidos" />
          )}

          {!loadingPedidos && !errorPedidos && pedidos.length > 0 && (
            <ul className="admin-page__list">
              {pedidos.map((pedido) => (
                <AdminPedidoRow key={pedido.id} pedido={pedido} />
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'tiendas' && (
        <section className="admin-page__section">
          {loadingTiendas && <StatusMessage variant="loading" title="Cargando tiendas..." />}

          {!loadingTiendas && errorTiendas && (
            <StatusMessage
              variant="error"
              title="No pudimos cargar las tiendas"
              description="Revisá tu conexión e intentá de nuevo."
            />
          )}

          {!loadingTiendas && !errorTiendas && tiendas.length === 0 && (
            <StatusMessage variant="empty" title="Todavía no hay tiendas" />
          )}

          {!loadingTiendas && !errorTiendas && tiendas.length > 0 && (
            <ul className="admin-page__list">
              {tiendas.map((tienda) => (
                <AdminTiendaRow
                  key={tienda.id}
                  tienda={tienda}
                  updating={pendingId === tienda.id}
                  onToggle={(nextValue) => handleToggleTienda(tienda.id, nextValue)}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'conductores' && (
        <section className="admin-page__section">
          {loadingConductores && (
            <StatusMessage variant="loading" title="Cargando conductores..." />
          )}

          {!loadingConductores && errorConductores && (
            <StatusMessage
              variant="error"
              title="No pudimos cargar los conductores"
              description="Revisá tu conexión e intentá de nuevo."
            />
          )}

          {!loadingConductores && !errorConductores && conductores.length === 0 && (
            <StatusMessage variant="empty" title="Todavía no hay conductores" />
          )}

          {!loadingConductores && !errorConductores && conductores.length > 0 && (
            <ul className="admin-page__list">
              {conductores.map((conductor) => (
                <AdminConductorRow
                  key={conductor.id}
                  conductor={conductor}
                  updating={pendingId === conductor.id}
                  onToggle={(nextValue) => handleToggleConductor(conductor.id, nextValue)}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'solicitudes' && (
        <section className="admin-page__section">
          {loadingSolicitudes && (
            <StatusMessage variant="loading" title="Cargando solicitudes..." />
          )}

          {!loadingSolicitudes && errorSolicitudes && (
            <StatusMessage
              variant="error"
              title="No pudimos cargar las solicitudes"
              description="Revisá tu conexión e intentá de nuevo."
            />
          )}

          {!loadingSolicitudes && !errorSolicitudes && solicitudes.length === 0 && (
            <StatusMessage variant="empty" title="Todavía no hay solicitudes de conductor" />
          )}

          {!loadingSolicitudes && !errorSolicitudes && solicitudes.length > 0 && solicitudesPendientes.length === 0 && (
            <StatusMessage variant="empty" title="No hay solicitudes pendientes" />
          )}

          {!loadingSolicitudes && !errorSolicitudes && solicitudesPendientes.length > 0 && (
            <ul className="admin-page__list">
              {solicitudesPendientes.map((solicitud) => (
                <AdminSolicitudRow
                  key={solicitud.id}
                  solicitud={solicitud}
                  updating={pendingId === solicitud.id}
                  onAprobar={() => handleAprobarSolicitud(solicitud.id)}
                  onRechazar={() => handleRechazarSolicitud(solicitud.id)}
                />
              ))}
            </ul>
          )}

          {!loadingSolicitudes && !errorSolicitudes && solicitudesProcesadas.length > 0 && (
            <details className="admin-page__historial">
              <summary>Solicitudes procesadas ({solicitudesProcesadas.length})</summary>
              <ul className="admin-page__list">
                {solicitudesProcesadas.map((solicitud) => (
                  <AdminSolicitudRow key={solicitud.id} solicitud={solicitud} updating={false} />
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
    </div>
  )
}
