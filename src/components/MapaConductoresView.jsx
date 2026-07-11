import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import VehiculoSeleccionSheet from './VehiculoSeleccionSheet'
import StatusMessage from './StatusMessage'
import { formatUbicacionCorta } from '../utils/ubicacionTexto'
import './MapaConductoresView.css'

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN

const ICONO_VEHICULO = { moto: '🏍️', carro: '🚗' }

// Vista 'conductores' (sección 3.2 del spec): mapa oscuro con origen/destino
// fijos + conductores activos alrededor, dos pills para editar cada punto sin
// perder el otro, y el sheet de selección de vehículo/precio anclado abajo.
// Primer uso de un estilo oscuro de Mapbox en el repo (dark-v11) — el resto
// de los mapas de la app (SelectorUbicacion, MapaSeguimientoViaje) siguen con
// streets-v12, no se tocan.
export default function MapaConductoresView({ origen, destino, onEditarOrigen, onEditarDestino, onVolver }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const conductoresMarkersRef = useRef([])

  const [conductores, setConductores] = useState([])

  // Mapa + pines fijos de origen/destino: se crean una sola vez al montar.
  useEffect(() => {
    if (!mapboxToken || !containerRef.current) return undefined

    mapboxgl.accessToken = mapboxToken

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [origen.lng, origen.lat],
      zoom: 13,
    })
    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    new mapboxgl.Marker({ color: '#3B82F6' }).setLngLat([origen.lng, origen.lat]).addTo(map) // azul = origen
    new mapboxgl.Marker({ color: '#22C55E' }).setLngLat([destino.lng, destino.lat]).addTo(map) // verde = destino

    const bounds = new mapboxgl.LngLatBounds()
    bounds.extend([origen.lng, origen.lat])
    bounds.extend([destino.lng, destino.lat])
    map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 0 })

    return () => {
      map.remove()
      mapRef.current = null
      conductoresMarkersRef.current = []
    }
    // Origen/destino son fijos mientras se está en esta vista (editarlos vuelve
    // a 'mapa' primero): el mapa no debe recrearse en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Conductores activos cerca del origen: best-effort, un fallo acá nunca
  // rompe la vista — el mapa se muestra igual, solo sin íconos de conductores.
  useEffect(() => {
    let cancelado = false

    async function cargarConductores() {
      try {
        const response = await fetch(`/api/conductores-cerca?lat=${origen.lat}&lng=${origen.lng}`)
        if (!response.ok) return
        const data = await response.json()
        if (!cancelado) setConductores(data.conductores ?? [])
      } catch {
        // silencioso a propósito: ver comentario arriba
      }
    }

    cargarConductores()

    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pinta un marcador HTML custom por conductor cada vez que cambia la lista.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    conductoresMarkersRef.current.forEach((marker) => marker.remove())
    conductoresMarkersRef.current = conductores.map((conductor) => {
      const el = document.createElement('div')
      el.className = 'mapa-conductores-view__marcador-conductor'
      el.textContent = ICONO_VEHICULO[conductor.vehiculo] ?? '📍'
      return new mapboxgl.Marker({ element: el }).setLngLat([conductor.lng, conductor.lat]).addTo(map)
    })
  }, [conductores])

  const textoOrigen = formatUbicacionCorta(origen) ?? 'Origen'
  const textoDestino = formatUbicacionCorta(destino) ?? 'Destino'

  if (!mapboxToken) {
    return (
      <StatusMessage
        variant="error"
        title="Falta configurar Mapbox"
        description="Definí VITE_MAPBOX_TOKEN en el archivo .env para mostrar el mapa."
      />
    )
  }

  return (
    <div className="mapa-conductores-view">
      <div ref={containerRef} className="mapa-conductores-view__mapa" />

      <button
        type="button"
        className="mapa-conductores-view__volver"
        onClick={onVolver}
        aria-label="Volver"
      >
        ←
      </button>

      <div className="mapa-conductores-view__pills">
        <button type="button" className="mapa-conductores-view__pill mapa-conductores-view__pill--destino" onClick={onEditarDestino}>
          <span className="mapa-conductores-view__pill-punto" aria-hidden="true" />
          <span className="mapa-conductores-view__pill-texto">{textoDestino}</span>
          <span aria-hidden="true">›</span>
        </button>
        <button type="button" className="mapa-conductores-view__pill mapa-conductores-view__pill--origen" onClick={onEditarOrigen}>
          <span className="mapa-conductores-view__pill-punto" aria-hidden="true" />
          <span className="mapa-conductores-view__pill-texto">{textoOrigen}</span>
          <span aria-hidden="true">›</span>
        </button>
      </div>

      <VehiculoSeleccionSheet origen={origen} destino={destino} />
    </div>
  )
}
