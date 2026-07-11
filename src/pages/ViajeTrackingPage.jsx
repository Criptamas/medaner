import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { onMessage } from 'firebase/messaging'
import { useViaje } from '../hooks/useViaje'
import StatusMessage from '../components/StatusMessage'
import Toast from '../components/Toast'
import BuscandoConductorPanel from '../components/BuscandoConductorPanel'
import ConductorAsignadoPanel from '../components/ConductorAsignadoPanel'
import ViajeResumenDetalle from '../components/ViajeResumenDetalle'
import { getFcmMessaging } from '../firebase'
import { VIAJE_ESTADO_LABELS, VIAJE_ESTADO_CANCELADO_LABEL } from '../utils/pedidoLabels'
import './ViajeTrackingPage.css'

// mapbox-gl es pesado (~1.5MB): se carga solo al abrir un viaje activo y no en
// el bundle principal (mismo criterio que las rutas de mapa en App.jsx).
const MapaSeguimientoViaje = lazy(() => import('../components/MapaSeguimientoViaje'))

// Estados que muestran el mapa a pantalla completa detrás del panel (estilo
// Uber). "pendiente" también lo muestra (encuadra origen+destino aunque no
// haya conductor). Al llegar a "completado"/"cancelado" el mapa deja de
// renderizarse: así se corta el seguimiento de ubicación del lado del cliente.
const ESTADOS_CON_MAPA = new Set(['pendiente', 'confirmado', 'en_curso'])

// Layout compartido por los estados sin mapa que reusan el header de siempre
// (carga/error/no encontrado): se mantiene idéntico a como se veía antes para
// no cambiar esos estados (offline-first: la carga/el error no deben mutar).
function PaginaSimple({ children }) {
  return (
    <div className="viaje-tracking-page">
      <header className="viaje-tracking-page__header">
        <Link to="/" className="viaje-tracking-page__back" aria-label="Volver al inicio">
          ←
        </Link>
        <h1>Seguimiento del viaje</h1>
      </header>
      {children}
    </div>
  )
}

// Contenido según el estado del viaje. No usa hooks: recibe el viaje ya
// cargado. El cambio de estado (onSnapshot de useViaje) hace que este switch
// re-renderice solo hacia la pantalla que corresponda, sin lógica extra.
function ContenidoViaje({ viaje }) {
  const { estado } = viaje

  if (ESTADOS_CON_MAPA.has(estado)) {
    return (
      <div className="viaje-track viaje-track--mapa">
        <Suspense
          fallback={
            <div className="viaje-track__mapa-fallback">
              <StatusMessage variant="loading" title="Cargando mapa..." />
            </div>
          }
        >
          <MapaSeguimientoViaje
            className="mapa-seguimiento--fondo"
            origen={viaje.origen}
            destino={viaje.destino}
            ubicacionConductor={viaje.ubicacionConductor}
            // En "pendiente" todavía no hay conductor asignado: no tiene sentido
            // "esperar su ubicación".
            mostrarEsperandoUbicacion={estado !== 'pendiente'}
          />
        </Suspense>

        <Link to="/" className="viaje-track__volver" aria-label="Volver al inicio">
          ←
        </Link>

        {estado === 'pendiente' ? (
          <BuscandoConductorPanel viajeId={viaje.id} viaje={viaje} />
        ) : (
          <ConductorAsignadoPanel viaje={viaje} />
        )}
      </div>
    )
  }

  // Estados terminales (completado/cancelado) y cualquier estado desconocido:
  // página oscura con scroll, sin mapa. El header vuelve porque acá no hay
  // mapa de fondo sobre el que flotar.
  return (
    <div className="viaje-track viaje-track--terminal">
      <header className="viaje-track__header">
        <Link to="/" className="viaje-track__back" aria-label="Volver al inicio">
          ←
        </Link>
        <h1>Seguimiento del viaje</h1>
      </header>

      <div className="viaje-track__cierre">
        {estado === 'cancelado' ? (
          <>
            <span
              className="viaje-track__icono viaje-track__icono--cancelado"
              aria-hidden="true"
            >
              ✕
            </span>
            <h2 className="viaje-track__cierre-titulo">{VIAJE_ESTADO_CANCELADO_LABEL}</h2>
            <p className="viaje-track__cierre-texto">
              Cancelaste este viaje. Podés pedir uno nuevo cuando quieras.
            </p>
            <Link to="/" className="viaje-track__cta">
              Volver al inicio
            </Link>
          </>
        ) : (
          <>
            <span
              className="viaje-track__icono viaje-track__icono--completado"
              aria-hidden="true"
            >
              ✓
            </span>
            <h2 className="viaje-track__cierre-titulo">
              {VIAJE_ESTADO_LABELS[estado] ?? 'Viaje finalizado'}
            </h2>
            {viaje.conductorNombre && (
              <p className="viaje-track__cierre-texto">
                Viajaste con {viaje.conductorNombre}. ¡Gracias por elegir Medaner!
              </p>
            )}
            <div className="viaje-track__resumen-wrap">
              <ViajeResumenDetalle viaje={viaje} />
            </div>
            <Link to="/" className="viaje-track__cta">
              Volver al inicio
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function ViajeTrackingPage() {
  const { viajeId } = useParams()
  const { viaje, loading, error } = useViaje(viajeId)

  const [toastMensaje, setToastMensaje] = useState(null)

  // Aviso in-app de cambios de estado del viaje mientras el cliente tiene
  // esta pantalla de seguimiento abierta (foreground): sin esto, se entera
  // recién si refresca. Debe seguir funcionando en TODOS los estados, por eso
  // se monta a nivel de página (fuera del switch de ContenidoViaje).
  useEffect(() => {
    let unsubscribe
    let cancelado = false

    getFcmMessaging().then((messaging) => {
      if (!messaging || cancelado) return
      unsubscribe = onMessage(messaging, (payload) => {
        // Los push son data-only (ver api/notificar-cambio-estado.js): título y
        // cuerpo viajan en payload.data, no en payload.notification.
        const texto = [payload.data?.title, payload.data?.body].filter(Boolean).join(' — ')
        if (texto) setToastMensaje(texto)
      })
    })

    return () => {
      cancelado = true
      unsubscribe?.()
    }
  }, [])

  return (
    <>
      {/* Toast siempre montado, en cualquier estado (checklist de la feature). */}
      <Toast mensaje={toastMensaje} onCerrar={() => setToastMensaje(null)} />

      {loading && (
        <PaginaSimple>
          <StatusMessage variant="loading" title="Buscando tu viaje..." />
        </PaginaSimple>
      )}

      {!loading && error && (
        <PaginaSimple>
          <StatusMessage
            variant="error"
            title="No pudimos cargar tu viaje"
            description="Revisá tu conexión e intentá de nuevo."
          />
        </PaginaSimple>
      )}

      {!loading && !error && !viaje && (
        <PaginaSimple>
          <StatusMessage variant="empty" title="No encontramos este viaje" />
        </PaginaSimple>
      )}

      {!loading && !error && viaje && <ContenidoViaje viaje={viaje} />}
    </>
  )
}
