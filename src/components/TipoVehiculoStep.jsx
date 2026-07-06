import './TipoVehiculoStep.css'

const OPCIONES = [
  { value: 'moto', label: 'Moto', icon: '🏍️' },
  { value: 'carro', label: 'Carro', icon: '🚗' },
]

// Tocar una tarjeta confirma y avanza (no hay botón "Siguiente" extra).
export default function TipoVehiculoStep({ value, onSelect }) {
  return (
    <div className="tipo-vehiculo-step">
      <p className="tipo-vehiculo-step__prompt">¿Qué tipo de vehículo necesitás?</p>
      <div className="tipo-vehiculo-step__opciones">
        {OPCIONES.map((opcion) => (
          <button
            key={opcion.value}
            type="button"
            className={`tipo-vehiculo-step__card ${
              value === opcion.value ? 'tipo-vehiculo-step__card--active' : ''
            }`}
            onClick={() => onSelect(opcion.value)}
          >
            <span className="tipo-vehiculo-step__icon" aria-hidden="true">
              {opcion.icon}
            </span>
            <span className="tipo-vehiculo-step__label">{opcion.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
