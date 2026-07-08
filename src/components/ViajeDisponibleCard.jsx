import { Link } from 'react-router-dom'
import './ViajeDisponibleCard.css'

const VEHICULO_LABELS = {
  moto: 'Moto',
  carro: 'Carro',
}

function formatCoords(punto) {
  if (!punto) return '—'
  return `${punto.lat?.toFixed(5)}, ${punto.lng?.toFixed(5)}`
}

export default function ViajeDisponibleCard({ viaje }) {
  return (
    <Link to={`/conductor/viaje/${viaje.id}`} className="viaje-disponible-card">
      <div className="viaje-disponible-card__header">
        <h3>{VEHICULO_LABELS[viaje.tipoVehiculo] ?? viaje.tipoVehiculo}</h3>
      </div>
      <p className="viaje-disponible-card__coords">
        Origen: {viaje.origenNombre || formatCoords(viaje.origen)}
      </p>
      <p className="viaje-disponible-card__coords">
        Destino: {viaje.destinoNombre || formatCoords(viaje.destino)}
      </p>
    </Link>
  )
}
