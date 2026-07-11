import { useState } from 'react'
import SelectorUbicacion from './SelectorUbicacion'
import './SeleccionarUbicacionView.css'

// Reemplaza a UbicacionViajeStep (mismo wrapper: título + SelectorUbicacion +
// botón "Confirmar ubicación"), renombrado porque ahora es una vista genérica
// de PedirViajePage — se reusa para fijar origen, destino Y el pin de una
// dirección favorita nueva, no solo "el paso de origen" como antes.
//
// valorInicial permite restaurar un pin ya elegido (el usuario tocó el input
// de nuevo para ajustar una ubicación ya definida) sin perder la dirección
// resuelta ni la referencia ya escrita.
export default function SeleccionarUbicacionView({ titulo, valorInicial, onConfirmar }) {
  const [seleccion, setSeleccion] = useState(valorInicial ?? null)

  return (
    <div className="seleccionar-ubicacion-view">
      <p className="seleccionar-ubicacion-view__prompt">{titulo}</p>

      <SelectorUbicacion
        initialLat={valorInicial?.lat}
        initialLng={valorInicial?.lng}
        initialNombre={valorInicial?.nombre}
        initialReferencia={valorInicial?.referencia}
        onLocationSelected={(lat, lng, nombre, referencia) =>
          setSeleccion({ lat, lng, nombre, referencia })
        }
      />

      {/* La dirección geocodificada es solo un complemento (puede llegar
          vacía si Mapbox no tiene cobertura en la zona o falló la conexión);
          la referencia manual sí es obligatoria porque el conductor no ve
          mapa en su pantalla y depende 100% de este texto para ubicar el
          punto. */}
      <button
        type="button"
        className="seleccionar-ubicacion-view__confirmar"
        disabled={!seleccion || !seleccion.referencia?.trim()}
        onClick={() => onConfirmar(seleccion)}
      >
        Confirmar ubicación
      </button>
    </div>
  )
}
