import { lazy, Suspense } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useViaje } from '../hooks/useViaje'
import EstadoProgress from '../components/EstadoProgress'
import StatusMessage from '../components/StatusMessage'
import { PAYMENT_LABELS, VIAJE_ESTADO_LABELS } from '../utils/pedidoLabels'
import { construirEnlaceWhatsApp } from '../utils/telefono'
import './ViajeTrackingPage.css'

// mapbox-gl es pesado (~1.5MB): se carga solo al abrir un viaje activo y no en
// el bundle principal (mismo criterio que las rutas de mapa en App.jsx).
const MapaSeguimientoViaje = lazy(() => import('../components/MapaSeguimientoViaje'))

// Estados con conductor asignado en los que tiene sentido el mapa en vivo. Al
// llegar a "completado" deja de renderizarse: así se corta el seguimiento de
// ubicación del lado del cliente.
const ESTADOS_CON_MAPA = new Set(['confirmado', 'en_curso'])

// Pasos del progreso derivados de VIAJE_ESTADO_LABELS para que este orden y
// sus textos no puedan divergir de los que usa "Mis pedidos recientes".
const VIAJE_STEPS = Object.entries(VIAJE_ESTADO_LABELS).map(([key, label]) => ({ key, label }))

const STATUS_LABELS = VIAJE_ESTADO_LABELS

const VEHICULO_LABELS = {
  moto: 'Moto',
  carro: 'Carro',
}

// Mensaje prellenado al abrir WhatsApp con el conductor: le ahorra al
// cliente escribir el saludo inicial.
const MENSAJE_WHATSAPP_CONDUCTOR = 'Hola, te escribo por mi viaje en Medaner.'

function formatCoords(punto) {
  if (!punto) return '—'
  return `${punto.lat?.toFixed(5)}, ${punto.lng?.toFixed(5)}`
}

export default function ViajeTrackingPage() {
  const { viajeId } = useParams()
  const { viaje, loading, error } = useViaje(viajeId)
  // conductorTelefono solo existe una vez que un conductor aceptó el viaje
  // (lo copia acceptViaje); construirEnlaceWhatsApp devuelve null tanto si
  // no hay teléfono todavía como si el que hay no es válido.
  const enlaceWhatsAppConductor = viaje ? construirEnlaceWhatsApp(viaje.conductorTelefono) : null

  return (
    <div className="viaje-tracking-page">
      <header className="viaje-tracking-page__header">
        <Link to="/" className="viaje-tracking-page__back" aria-label="Volver al inicio">
          ←
        </Link>
        <h1>Seguimiento del viaje</h1>
      </header>

      {loading && <StatusMessage variant="loading" title="Buscando tu viaje..." />}

      {!loading && error && (
        <StatusMessage
          variant="error"
          title="No pudimos cargar tu viaje"
          description="Revisá tu conexión e intentá de nuevo."
        />
      )}

      {!loading && !error && !viaje && (
        <StatusMessage variant="empty" title="No encontramos este viaje" />
      )}

      {!loading && !error && viaje && (
        <div className="viaje-tracking-page__content">
          <p className="viaje-tracking-page__status">
            {STATUS_LABELS[viaje.estado] ?? viaje.estado}
          </p>

          <EstadoProgress estado={viaje.estado} steps={VIAJE_STEPS} />

          {/* Solo aparece una vez que un conductor aceptó (conductorNombre
              se copia al viaje recién en ese momento, ver acceptViaje). */}
          {viaje.conductorNombre && (
            <section className="viaje-tracking-page__conductor">
              <p className="viaje-tracking-page__conductor-mensaje">
                «{viaje.conductorNombre}» aceptó tu viaje
              </p>
              {enlaceWhatsAppConductor ? (
                <a
                  href={`${enlaceWhatsAppConductor}?text=${encodeURIComponent(MENSAJE_WHATSAPP_CONDUCTOR)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="viaje-tracking-page__whatsapp"
                >
                  💬 Escribir a tu conductor por WhatsApp
                </a>
              ) : (
                viaje.conductorTelefono && (
                  <p className="viaje-tracking-page__telefono-plano">{viaje.conductorTelefono}</p>
                )
              )}
            </section>
          )}

          {ESTADOS_CON_MAPA.has(viaje.estado) && (
            <section className="viaje-tracking-page__section">
              <h2>Tu conductor en el mapa</h2>
              <Suspense fallback={<StatusMessage variant="loading" title="Cargando mapa..." />}>
                <MapaSeguimientoViaje
                  origen={viaje.origen}
                  destino={viaje.destino}
                  ubicacionConductor={viaje.ubicacionConductor}
                />
              </Suspense>
            </section>
          )}

          <section className="viaje-tracking-page__section">
            <h2>Vehículo</h2>
            <p>{VEHICULO_LABELS[viaje.tipoVehiculo] ?? viaje.tipoVehiculo}</p>
          </section>

          <section className="viaje-tracking-page__section">
            <h2>Recorrido</h2>
            <p className="viaje-tracking-page__coords">
              Origen: {viaje.origenNombre || formatCoords(viaje.origen)}
            </p>
            <p className="viaje-tracking-page__coords">
              Destino: {viaje.destinoNombre || formatCoords(viaje.destino)}
            </p>
          </section>

          <section className="viaje-tracking-page__section">
            <h2>Método de pago</h2>
            <p>{PAYMENT_LABELS[viaje.metodoPago] ?? viaje.metodoPago}</p>
          </section>
        </div>
      )}
    </div>
  )
}
