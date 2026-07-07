import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import StatusMessage from './StatusMessage'
import './MapaSeguimientoViaje.css'

// Punto Fijo, Falcón — centro por defecto si el viaje aún no trajo su origen.
const PUNTO_FIJO_CENTER = { lat: 11.6942, lng: -70.2181 }

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN

// Muestra origen y destino del viaje (fijos) y el marcador del conductor, que
// se mueve en vivo a medida que llega `ubicacionConductor` por onSnapshot desde
// el documento del viaje. El mapa se crea UNA sola vez; en cada actualización
// solo movemos el marcador con setLngLat (nunca recreamos el mapa ni el marker).
export default function MapaSeguimientoViaje({ origen, destino, ubicacionConductor }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const conductorMarkerRef = useRef(null)
  // Solo encuadramos (fitBounds) la primera vez que aparece el conductor, para
  // no "pelear" con el usuario si después mueve o hace zoom en el mapa.
  const encuadradoRef = useRef(false)

  // 1) Crear el mapa y los marcadores fijos de origen/destino una sola vez.
  useEffect(() => {
    if (!mapboxToken || !containerRef.current) return undefined

    mapboxgl.accessToken = mapboxToken

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: origen ? [origen.lng, origen.lat] : [PUNTO_FIJO_CENTER.lng, PUNTO_FIJO_CENTER.lat],
      zoom: 13,
    })
    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    if (origen) {
      new mapboxgl.Marker({ color: '#2e7d32' }) // verde = origen
        .setLngLat([origen.lng, origen.lat])
        .setPopup(new mapboxgl.Popup({ offset: 24 }).setText('Origen'))
        .addTo(map)
    }
    if (destino) {
      new mapboxgl.Marker({ color: '#c62828' }) // rojo = destino
        .setLngLat([destino.lng, destino.lat])
        .setPopup(new mapboxgl.Popup({ offset: 24 }).setText('Destino'))
        .addTo(map)
    }

    return () => {
      map.remove()
      mapRef.current = null
      conductorMarkerRef.current = null
      encuadradoRef.current = false
    }
    // origen/destino son fijos durante el viaje; el mapa no debe recrearse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2) Crear/mover el marcador del conductor cuando cambia ubicacionConductor.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ubicacionConductor) return

    const { lat, lng } = ubicacionConductor
    if (typeof lat !== 'number' || typeof lng !== 'number') return

    if (!conductorMarkerRef.current) {
      const accent = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent')
        .trim()
      conductorMarkerRef.current = new mapboxgl.Marker({ color: accent || '#aa3bff' })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 24 }).setText('Conductor'))
        .addTo(map)
    } else {
      conductorMarkerRef.current.setLngLat([lng, lat])
    }

    // Primera aparición del conductor: encuadrar origen + destino + conductor.
    if (!encuadradoRef.current) {
      const puntos = [origen, destino, { lat, lng }].filter(Boolean)
      if (puntos.length >= 2) {
        const bounds = puntos.reduce(
          (acc, p) => acc.extend([p.lng, p.lat]),
          new mapboxgl.LngLatBounds(),
        )
        map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 600 })
        encuadradoRef.current = true
      }
    }
  }, [ubicacionConductor, origen, destino])

  if (!mapboxToken) {
    return (
      <StatusMessage
        variant="error"
        title="Falta configurar Mapbox"
        description="Definí VITE_MAPBOX_TOKEN para mostrar el mapa."
      />
    )
  }

  return (
    <div className="mapa-seguimiento">
      <div ref={containerRef} className="mapa-seguimiento__mapa" />
      {!ubicacionConductor && (
        <p className="mapa-seguimiento__esperando" role="status">
          Esperando ubicación del conductor…
        </p>
      )}
    </div>
  )
}
