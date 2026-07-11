import { useState } from 'react'
import Avatar from './Avatar'
import ViajeResumenDetalle from './ViajeResumenDetalle'
import { construirEnlaceWhatsApp } from '../utils/telefono'
import { VIAJE_ESTADO_LABELS } from '../utils/pedidoLabels'
import './ConductorAsignadoPanel.css'

const VEHICULO_ICON = { moto: '🏍️', carro: '🚗' }

// Mensaje prellenado al abrir WhatsApp con el conductor: le ahorra al cliente
// escribir el saludo inicial (mismo texto que usaba ViajeTrackingPage).
const MENSAJE_WHATSAPP_CONDUCTOR = 'Hola, te escribo por mi viaje en Medaner.'

// Panel anclado abajo del mapa en vivo una vez que un conductor aceptó el viaje.
// Sirve tanto para "confirmado" (va en camino) como para "en_curso" (viaje en
// marcha): el titular cambia solo según VIAJE_ESTADO_LABELS[estado].
export default function ConductorAsignadoPanel({ viaje }) {
  const [expandido, setExpandido] = useState(false)

  // conductorTelefono/Placa/Vehiculo los copia acceptViaje al viaje al aceptar
  // (única fuente que el cliente puede leer). Cualquiera puede faltar en viajes
  // viejos o si el admin no lo cargó: cada bloque degrada sin romper.
  const enlaceWhatsApp = construirEnlaceWhatsApp(viaje.conductorTelefono)
  const icono = VEHICULO_ICON[viaje.tipoVehiculo] ?? '🚗'

  return (
    <section className="viaje-panel conductor-panel" aria-label="Conductor asignado">
      <p className="conductor-panel__estado">
        {VIAJE_ESTADO_LABELS[viaje.estado] ?? viaje.estado}
      </p>

      <div className="conductor-panel__conductor">
        {/* El wrapper permite pintar el círculo del Avatar con la paleta oscura
            de esta feature sin tocar los estilos base compartidos de Avatar. */}
        <span className="conductor-panel__avatar">
          <Avatar nombre={viaje.conductorNombre} size={56} />
        </span>
        <div className="conductor-panel__identidad">
          <p className="conductor-panel__nombre">{viaje.conductorNombre || 'Tu conductor'}</p>
          {viaje.conductorVehiculo && (
            <p className="conductor-panel__vehiculo">
              <span aria-hidden="true">{icono}</span> {viaje.conductorVehiculo}
            </p>
          )}
          {viaje.conductorPlaca && (
            <span className="conductor-panel__placa">{viaje.conductorPlaca}</span>
          )}
        </div>
      </div>

      {/* Nunca un link roto: si el teléfono no es válido/está vacío, cae a texto
          plano (mismo patrón ya usado en toda la app). */}
      {enlaceWhatsApp ? (
        <a
          href={`${enlaceWhatsApp}?text=${encodeURIComponent(MENSAJE_WHATSAPP_CONDUCTOR)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="conductor-panel__whatsapp"
        >
          💬 Escribir por WhatsApp
        </a>
      ) : (
        viaje.conductorTelefono && (
          <p className="conductor-panel__telefono">{viaje.conductorTelefono}</p>
        )
      )}

      {/* Detalles colapsados por defecto para dejar el mapa lo más visible
          posible en mobile; se despliegan bajo demanda. */}
      <button
        type="button"
        className="conductor-panel__detalles-toggle"
        onClick={() => setExpandido((v) => !v)}
        aria-expanded={expandido}
      >
        {expandido ? 'Ocultar detalles del viaje' : 'Ver detalles del viaje'}
      </button>

      {expandido && <ViajeResumenDetalle viaje={viaje} />}
    </section>
  )
}
