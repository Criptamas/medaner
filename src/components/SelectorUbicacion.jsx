import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import StatusMessage from './StatusMessage'
import './SelectorUbicacion.css'

// Punto Fijo, Falcón — centro por defecto porque muchas zonas de la ciudad
// no tienen direcciones formales y el usuario ubica el punto a ojo en el mapa.
const PUNTO_FIJO_CENTER = { lat: 11.6942, lng: -70.2181 }
const DEFAULT_ZOOM = 13
const SELECTED_ZOOM = 15

const GEOLOCATION_ERROR_MESSAGES = {
  1: 'Denegaste el permiso de ubicación. Podés activarlo desde la configuración del navegador.',
  2: 'No pudimos determinar tu ubicación actual.',
  3: 'La búsqueda de tu ubicación tardó demasiado. Intentá de nuevo.',
}

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN

// initialLat/initialLng permiten restaurar un pin ya elegido (ej. al volver
// atrás en el wizard de viaje). Si no se pasan, el mapa arranca limpio en
// Punto Fijo, que es el comportamiento standalone original.
export default function SelectorUbicacion({ onLocationSelected, initialLat, initialLng }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState(null)

  useEffect(() => {
    if (!mapboxToken || !containerRef.current) return undefined

    const hasInitial = initialLat != null && initialLng != null

    mapboxgl.accessToken = mapboxToken

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: hasInitial
        ? [initialLng, initialLat]
        : [PUNTO_FIJO_CENTER.lng, PUNTO_FIJO_CENTER.lat],
      zoom: hasInitial ? SELECTED_ZOOM : DEFAULT_ZOOM,
    })
    mapRef.current = map

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('click', (event) => {
      placeMarker(event.lngLat.lat, event.lngLat.lng)
    })

    // Restaurar el pin previo sin disparar onLocationSelected: no es una
    // selección nueva del usuario, solo estamos re-dibujando lo ya elegido.
    if (hasInitial) {
      upsertMarker(initialLat, initialLng)
    }

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Crea el marker la primera vez o lo reubica si ya existe (un solo pin).
  function upsertMarker(lat, lng) {
    const map = mapRef.current
    if (!map) return

    if (!markerRef.current) {
      const accentColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent')
        .trim()

      const marker = new mapboxgl.Marker({ color: accentColor || '#aa3bff', draggable: true })
        .setLngLat([lng, lat])
        .addTo(map)

      marker.on('dragend', () => {
        const { lat: draggedLat, lng: draggedLng } = marker.getLngLat()
        onLocationSelected(draggedLat, draggedLng)
      })

      markerRef.current = marker
    } else {
      markerRef.current.setLngLat([lng, lat])
    }
  }

  function placeMarker(lat, lng) {
    upsertMarker(lat, lng)
    onLocationSelected(lat, lng)
  }

  function handleUsarUbicacionActual() {
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no soporta geolocalización.')
      return
    }

    setLocating(true)
    setGeoError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: SELECTED_ZOOM })
        placeMarker(latitude, longitude)
        setLocating(false)
      },
      (error) => {
        setGeoError(GEOLOCATION_ERROR_MESSAGES[error.code] ?? 'No pudimos obtener tu ubicación.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

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
    <div className="selector-ubicacion">
      <div ref={containerRef} className="selector-ubicacion__mapa" />

      <button
        type="button"
        className="selector-ubicacion__boton-ubicacion"
        onClick={handleUsarUbicacionActual}
        disabled={locating}
      >
        {locating ? 'Buscando tu ubicación...' : '📍 Usar mi ubicación actual'}
      </button>

      {geoError && (
        <p className="selector-ubicacion__error" role="alert">
          {geoError}
        </p>
      )}
    </div>
  )
}
