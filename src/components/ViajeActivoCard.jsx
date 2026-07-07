import { Link } from 'react-router-dom'
import { PAYMENT_LABELS, VIAJE_ESTADO_BADGE_LABELS } from '../utils/pedidoLabels'
import './ViajeActivoCard.css'

const VEHICULO_LABELS = {
  moto: 'Moto',
  carro: 'Carro',
}

function formatCoords(punto) {
  if (!punto) return '—'
  return `${punto.lat?.toFixed(5)}, ${punto.lng?.toFixed(5)}`
}

// Lleva al detalle del viaje: ahí viven los botones para avanzar de estado
// (Iniciar / Marcar como completado), igual que cuando se acepta desde
// "Viajes disponibles". Evita duplicar esa lógica de transición acá.
export default function ViajeActivoCard({ viaje }) {
  return (
    <Link to={`/conductor/viaje/${viaje.id}`} className="viaje-activo-card">
      <div className="viaje-activo-card__header">
        <h2>{VEHICULO_LABELS[viaje.tipoVehiculo] ?? viaje.tipoVehiculo}</h2>
        <span className="viaje-activo-card__badge">
          {VIAJE_ESTADO_BADGE_LABELS[viaje.estado] ?? viaje.estado}
        </span>
      </div>

      <p className="viaje-activo-card__cliente">
        {viaje.clienteNombre} · {viaje.clienteTelefono}
      </p>

      <p className="viaje-activo-card__coords">Origen: {formatCoords(viaje.origen)}</p>
      <p className="viaje-activo-card__coords">Destino: {formatCoords(viaje.destino)}</p>

      <div className="viaje-activo-card__footer">
        <span>{PAYMENT_LABELS[viaje.metodoPago] ?? viaje.metodoPago}</span>
      </div>
    </Link>
  )
}
