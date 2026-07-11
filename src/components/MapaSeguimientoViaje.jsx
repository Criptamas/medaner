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
//
// - `className`: modificador opcional (ej. "mapa-seguimiento--fondo") para que
//   el mapa llene su contenedor como fondo de pantalla en vez de ser una
//   tarjeta de alto fijo.
// - `mostrarEsperandoUbicacion`: en estados sin conductor asignado (ej.
//   "pendiente", buscando conductores) NO hay a quién esperar todavía, así que
//   el aviso "Esperando ubicación del conductor…" se puede apagar.
export default function MapaSeguimientoViaje({
  origen,
  destino,
  ubicacionConductor,
  className = '',
  mostrarEsperandoUbicacion = true,
}) {
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

    // Convención estándar de mapas (y de la paleta de esta feature): origen en
    // azul, destino en verde. El conductor (marcador que se mueve) va en el
    // amarillo de acento, más abajo.
    if (origen) {
      new mapboxgl.Marker({ color: '#4C9AFF' }) // azul = origen
        .setLngLat([origen.lng, origen.lat])
        .setPopup(new mapboxgl.Popup({ offset: 24 }).setText('Origen'))
        .addTo(map)
    }
    if (destino) {
      new mapboxgl.Marker({ color: '#22C55E' }) // verde = destino
        .setLngLat([destino.lng, destino.lat])
        .setPopup(new mapboxgl.Popup({ offset: 24 }).setText('Destino'))
        .addTo(map)
    }

    // Encuadre inicial de origen + destino, apenas se crea el mapa. Es
    // independiente del encuadre "con conductor" (efecto 2, que sigue
    // ocurriendo su primera vez): así, aun cuando el viaje todavía no tiene
    // conductor (estado "pendiente", buscando), el mapa muestra ambos puntos
    // en vez de quedar centrado solo en el origen a zoom fijo. Sin animación
    // (duration 0) porque es el encuadre de arranque, no una transición.
    if (origen && destino) {
      const bounds = new mapboxgl.LngLatBounds()
        .extend([origen.lng, origen.lat])
        .extend([destino.lng, destino.lat])
      map.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 0 })
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
      // Amarillo de acento de las pantallas de seguimiento (paleta oscura de
      // esta feature). Antes leía --accent de :root, pero ese token es el azul
      // global de la marca, no el amarillo de estas pantallas: se hardcodea
      // para no depender de un token que fuera de acá significa otra cosa.
      conductorMarkerRef.current = new mapboxgl.Marker({ color: '#FFC70A' })
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
    <div className={`mapa-seguimiento ${className}`.trim()}>
      <div ref={containerRef} className="mapa-seguimiento__mapa" />
      {!ubicacionConductor && mostrarEsperandoUbicacion && (
        <p className="mapa-seguimiento__esperando" role="status">
          Esperando ubicación del conductor…
        </p>
      )}
    </div>
  )
}
