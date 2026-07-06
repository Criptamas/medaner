import { useState } from 'react'
import SelectorUbicacion from './SelectorUbicacion'
import './UbicacionViajeStep.css'

// Envuelve SelectorUbicacion + un botón de confirmación. Se usa igual para
// origen y destino cambiando el texto del prompt. value permite restaurar la
// selección previa al volver atrás en el wizard.
export default function UbicacionViajeStep({ titulo, value, onConfirmar }) {
  const [seleccion, setSeleccion] = useState(value ?? null)

  return (
    <div className="ubicacion-viaje-step">
      <p className="ubicacion-viaje-step__prompt">{titulo}</p>

      <SelectorUbicacion
        initialLat={value?.lat}
        initialLng={value?.lng}
        onLocationSelected={(lat, lng) => setSeleccion({ lat, lng })}
      />

      <button
        type="button"
        className="ubicacion-viaje-step__confirmar"
        disabled={!seleccion}
        onClick={() => onConfirmar(seleccion)}
      >
        Confirmar ubicación
      </button>
    </div>
  )
}
