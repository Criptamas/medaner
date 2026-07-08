import { Link } from 'react-router-dom'
import { PAYMENT_LABELS, VIAJE_ESTADO_BADGE_LABELS } from '../utils/pedidoLabels'
import { construirEnlaceWhatsApp } from '../utils/telefono'
import './ViajeActivoCard.css'

const VEHICULO_LABELS = {
  moto: 'Moto',
  carro: 'Carro',
}

function formatCoords(punto) {
  if (!punto) return '—'
  return `${punto.lat?.toFixed(5)}, ${punto.lng?.toFixed(5)}`
}

// Toda la tarjeta es un <Link>: un <a> anidado adentro sería HTML inválido y
// dispararía dos navegaciones a la vez (la del Link y la del link de
// WhatsApp). Por eso el contacto es un <button> que abre WhatsApp a mano y
// frena el click para que no llegue al <Link> que lo envuelve.
function handleWhatsAppClick(event, url) {
  event.preventDefault()
  event.stopPropagation()
  window.open(url, '_blank', 'noopener,noreferrer')
}

// Lleva al detalle del viaje: ahí viven los botones para avanzar de estado
// (Iniciar / Marcar como completado), igual que cuando se acepta desde
// "Viajes disponibles". Evita duplicar esa lógica de transición acá.
export default function ViajeActivoCard({ viaje }) {
  const enlaceWhatsApp = construirEnlaceWhatsApp(viaje.clienteTelefono)

  return (
    <Link to={`/conductor/viaje/${viaje.id}`} className="viaje-activo-card">
      <div className="viaje-activo-card__header">
        <h2>{VEHICULO_LABELS[viaje.tipoVehiculo] ?? viaje.tipoVehiculo}</h2>
        <span className="viaje-activo-card__badge">
          {VIAJE_ESTADO_BADGE_LABELS[viaje.estado] ?? viaje.estado}
        </span>
      </div>

      <p className="viaje-activo-card__cliente">
        <span>{viaje.clienteNombre}</span>
        {enlaceWhatsApp ? (
          <button
            type="button"
            className="viaje-activo-card__whatsapp"
            onClick={(event) => handleWhatsAppClick(event, enlaceWhatsApp)}
          >
            💬 {viaje.clienteTelefono}
          </button>
        ) : (
          viaje.clienteTelefono && <span>· {viaje.clienteTelefono}</span>
        )}
      </p>

      <p className="viaje-activo-card__coords">
        Origen: {viaje.origenNombre || formatCoords(viaje.origen)}
      </p>
      <p className="viaje-activo-card__coords">
        Destino: {viaje.destinoNombre || formatCoords(viaje.destino)}
      </p>

      <div className="viaje-activo-card__footer">
        <span>{PAYMENT_LABELS[viaje.metodoPago] ?? viaje.metodoPago}</span>
      </div>
    </Link>
  )
}
