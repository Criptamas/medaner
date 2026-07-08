import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import StatusMessage from './StatusMessage'
import { reverseGeocode } from '../utils/geocode'
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

// initialLat/initialLng/initialNombre/initialReferencia permiten restaurar un
// pin ya elegido (ej. al volver atrás en el wizard de viaje) sin perder la
// dirección ya resuelta ni la referencia ya escrita, ni disparar un nuevo
// reverse geocode innecesario.
export default function SelectorUbicacion({
  onLocationSelected,
  initialLat,
  initialLng,
  initialNombre,
  initialReferencia,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState(null)

  // true si venimos de un paso anterior del wizard con un pin ya elegido
  // (volver atrás no debe perder el punto ni obligar a tocar el mapa de nuevo).
  const hasInitialPoint = initialLat != null && initialLng != null

  // Coordenadas del pin actual en estado de React: antes solo vivían en el
  // marker de Mapbox (closures) y nunca se leían de vuelta. El input de
  // referencia las necesita para poder re-emitir la selección completa en
  // cada tecleo, sin esperar a un nuevo click/drag sobre el mapa.
  const [puntoSeleccionado, setPuntoSeleccionado] = useState(
    hasInitialPoint ? { lat: initialLat, lng: initialLng } : null,
  )

  // 'idle' | 'buscando' | 'resuelta' | 'fallida': estado de la dirección
  // legible del pin actual. Restaurar arranca en 'resuelta' si ya hay nombre
  // geocodificado, o en 'fallida' si hay pin pero el geocoding de la vez
  // anterior no dio nombre (así el bloque de dirección+referencia se sigue
  // mostrando al volver atrás en el wizard, en vez de desaparecer).
  const [direccionEstado, setDireccionEstado] = useState(
    initialNombre ? 'resuelta' : hasInitialPoint ? 'fallida' : 'idle',
  )
  const [direccionNombre, setDireccionNombre] = useState(initialNombre ?? '')

  // Referencia manual escrita por el cliente (punto de referencia para el
  // conductor, que no ve mapa). Vive en estado para el input controlado, y
  // además en un ref: los handlers de Mapbox (click/dragend) se registran
  // una sola vez al montar el mapa, así que si solo leyeran el estado
  // verían siempre el valor de referencia del momento del montaje.
  const [referencia, setReferencia] = useState(initialReferencia ?? '')
  const referenciaRef = useRef(initialReferencia ?? '')

  // Cuenta la última solicitud de geocoding disparada: si el usuario mueve el
  // pin de nuevo antes de que resuelva una respuesta anterior, esa respuesta
  // llega "vieja" y se descarta (evita pisar la dirección del pin actual con
  // la de un pin ya abandonado).
  const geocodeRequestRef = useRef(0)

  useEffect(() => {
    if (!mapboxToken || !containerRef.current) return undefined

    mapboxgl.accessToken = mapboxToken

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: hasInitialPoint
        ? [initialLng, initialLat]
        : [PUNTO_FIJO_CENTER.lng, PUNTO_FIJO_CENTER.lat],
      zoom: hasInitialPoint ? SELECTED_ZOOM : DEFAULT_ZOOM,
    })
    mapRef.current = map

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('click', (event) => {
      placeMarker(event.lngLat.lat, event.lngLat.lng)
    })

    // Restaurar el pin previo sin disparar onLocationSelected: no es una
    // selección nueva del usuario, solo estamos re-dibujando lo ya elegido.
    if (hasInitialPoint) {
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
        seleccionarPunto(draggedLat, draggedLng)
      })

      markerRef.current = marker
    } else {
      markerRef.current.setLngLat([lng, lat])
    }
  }

  // Punto único de entrada para toda selección nueva del usuario (click,
  // arrastre del pin o geolocalización): avisa al padre de inmediato con las
  // coordenadas —la selección nunca espera al geocoding, ver instrucciones
  // del wizard— y dispara la resolución de la dirección legible en paralelo.
  // El nombre geocodificado se reinicia porque pertenecía al pin anterior;
  // la referencia escrita por el cliente NO se toca (puede estar solo
  // ajustando el pin unos metros, no perdió su descripción).
  function seleccionarPunto(lat, lng) {
    setPuntoSeleccionado({ lat, lng })
    setDireccionNombre('')
    onLocationSelected(lat, lng, '', referenciaRef.current)
    resolverDireccion(lat, lng)
  }

  async function resolverDireccion(lat, lng) {
    const requestId = ++geocodeRequestRef.current
    setDireccionEstado('buscando')

    const direccion = await reverseGeocode(lat, lng)

    // El pin ya se movió de nuevo mientras esperábamos esta respuesta: llegó
    // vieja, se descarta para no pisar el estado del pin actual.
    if (requestId !== geocodeRequestRef.current) return

    if (direccion) {
      setDireccionNombre(direccion)
      setDireccionEstado('resuelta')
    } else {
      setDireccionNombre('')
      setDireccionEstado('fallida')
    }
    // Segundo aviso al padre, ahora con el nombre ya resuelto (o '' si
    // falló). Si el usuario ya confirmó con el nombre vacío, no pasa nada:
    // createViaje/createOrder aceptan nombre='' y caen a coordenadas.
    // referenciaRef (no el estado) porque esta respuesta puede llegar
    // después de que el usuario ya haya tecleado una referencia nueva —
    // usar el estado capturado en esta clausura la pisaría con un valor viejo.
    onLocationSelected(lat, lng, direccion ?? '', referenciaRef.current)
  }

  // El input de referencia puede cambiar sin que se mueva el pin: reemitimos
  // la selección completa con las últimas coordenadas y nombre conocidos.
  function handleReferenciaChange(event) {
    const valor = event.target.value
    setReferencia(valor)
    referenciaRef.current = valor
    if (puntoSeleccionado) {
      onLocationSelected(puntoSeleccionado.lat, puntoSeleccionado.lng, direccionNombre, valor)
    }
  }

  function placeMarker(lat, lng) {
    upsertMarker(lat, lng)
    seleccionarPunto(lat, lng)
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

      {/* Dirección legible del pin actual: el cliente confirma acá el mismo
          nombre que después va a ver el conductor, en vez de coordenadas.
          La referencia manual va justo debajo, agrupada visualmente: completa
          lo que la dirección geocodificada no puede (nivel de calle). */}
      {direccionEstado !== 'idle' && (
        <div className="selector-ubicacion__referencia-bloque">
          <p
            className={
              direccionEstado === 'buscando'
                ? 'selector-ubicacion__direccion selector-ubicacion__direccion--pendiente'
                : 'selector-ubicacion__direccion'
            }
            role="status"
          >
            {direccionEstado === 'buscando' && 'Buscando dirección…'}
            {direccionEstado === 'resuelta' && `📍 ${direccionNombre}`}
            {direccionEstado === 'fallida' && '📍 Ubicación seleccionada'}
          </p>

          <div className="selector-ubicacion__referencia">
            <label className="selector-ubicacion__referencia-campo">
              <span>Referencia (calle, avenida, punto conocido)</span>
              <input
                type="text"
                value={referencia}
                onChange={handleReferenciaChange}
                placeholder="Ej: Av. 7, sector Maraven, frente a la panadería"
                maxLength={120}
                autoComplete="off"
                required
                aria-describedby="selector-ubicacion-referencia-ayuda"
              />
            </label>
            <p id="selector-ubicacion-referencia-ayuda" className="selector-ubicacion__referencia-ayuda">
              Tu conductor no ve un mapa, solo esta descripción — sé específico.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
