import { useState } from 'react'
import SelectorUbicacion from '../components/SelectorUbicacion'
import './TestMapaPage.css'

// Página temporal para probar SelectorUbicacion de forma aislada.
// Borrar (y la ruta /test-mapa en App.jsx) una vez confirmado que funciona.
export default function TestMapaPage() {
  const [ubicacion, setUbicacion] = useState(null)

  return (
    <div className="test-mapa-page">
      <header className="test-mapa-page__header">
        <h1>Prueba: Selector de ubicación</h1>
        <p>Tocá el mapa para colocar un pin, arrastralo, o usá tu ubicación actual.</p>
      </header>

      <SelectorUbicacion onLocationSelected={(lat, lng) => setUbicacion({ lat, lng })} />

      <p className="test-mapa-page__resultado">
        {ubicacion
          ? `Última posición seleccionada: lat ${ubicacion.lat.toFixed(6)}, lng ${ubicacion.lng.toFixed(6)}`
          : 'Todavía no seleccionaste ninguna posición.'}
      </p>
    </div>
  )
}
