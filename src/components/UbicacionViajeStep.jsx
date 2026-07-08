import { useState } from 'react'
import SelectorUbicacion from './SelectorUbicacion'
import './UbicacionViajeStep.css'

// Envuelve SelectorUbicacion + un botón de confirmación. Se usa igual para
// origen y destino cambiando el texto del prompt. value permite restaurar la
// selección previa —incluida la dirección legible ya resuelta y la
// referencia manual ya escrita— al volver atrás en el wizard, sin perder
// nada ni tener que re-geocodificar.
export default function UbicacionViajeStep({ titulo, value, onConfirmar }) {
  const [seleccion, setSeleccion] = useState(value ?? null)

  return (
    <div className="ubicacion-viaje-step">
      <p className="ubicacion-viaje-step__prompt">{titulo}</p>

      <SelectorUbicacion
        initialLat={value?.lat}
        initialLng={value?.lng}
        initialNombre={value?.nombre}
        initialReferencia={value?.referencia}
        onLocationSelected={(lat, lng, nombre, referencia) =>
          setSeleccion({ lat, lng, nombre, referencia })
        }
      />

      {/* La dirección geocodificada es solo un complemento (puede llegar
          vacía si Mapbox no tiene cobertura en la zona o falló la conexión);
          la referencia manual sí es obligatoria porque el conductor no ve
          mapa en su pantalla y depende 100% de este texto para ubicar el
          punto — dejarla opcional reintroduciría en la práctica el problema
          que este campo existe para resolver. */}
      <button
        type="button"
        className="ubicacion-viaje-step__confirmar"
        disabled={!seleccion || !seleccion.referencia?.trim()}
        onClick={() => onConfirmar(seleccion)}
      >
        Confirmar ubicación
      </button>
    </div>
  )
}
