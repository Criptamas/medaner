import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SolicitudViajeView from '../components/SolicitudViajeView'
import SeleccionarUbicacionView from '../components/SeleccionarUbicacionView'
import FavoritaForm from '../components/FavoritaForm'
import MapaConductoresView from '../components/MapaConductoresView'
import { useDireccionesFavoritas } from '../hooks/useDireccionesFavoritas'
import { reverseGeocode } from '../utils/geocode'
import './PedirViajePage.css'

// Orquestador de la pantalla única de "pedir un viaje" (reemplaza al wizard
// de 5 pasos viejo). Ya no hay "pasos" lineales: hay 4 vistas internas que
// comparten todo su estado acá (origen/destino, qué campo se está editando,
// datos de la favorita en edición) — no hace falta ruta nueva, todo vive en
// useState de este componente.
//
//   'solicitud'     — card de origen/destino + favoritas + botón Continuar.
//   'mapa'          — SelectorUbicacion para fijar CON PRECISIÓN el origen, el
//                      destino, o el pin de una favorita nueva (mapaProposito
//                      decide cuál de los tres).
//   'favorita-form' — crear/editar una dirección favorita.
//   'conductores'   — mapa oscuro con conductores cerca + selección de
//                      vehículo/precio (se llega acá con "Continuar").
export default function PedirViajePage() {
  const navigate = useNavigate()

  const [vista, setVista] = useState('solicitud')
  const [origen, setOrigen] = useState(null)
  const [destino, setDestino] = useState(null)

  // 'campoActivo' cumple DOS roles a la vez (mismo mecanismo, ver spec): 1)
  // qué campo fija la vista 'mapa' cuando se llega ahí tocando el input de
  // Origen o Destino, y 2) a cuál de los dos campos autocompleta una
  // dirección favorita tocada en 'solicitud'. Arranca en 'destino' (caso más
  // común: el origen ya se resuelve solo por GPS) y pasa a 'origen' si el
  // usuario entró al mapa desde ese input — así una favorita tocada después
  // de eso cae en Origen, tal como pide el spec ("Origen si se entró desde ahí").
  const [campoActivo, setCampoActivo] = useState('destino')

  // Motivo por el que se está en la vista 'mapa' en este momento: fijar
  // origen, fijar destino, o elegir el pin de una dirección favorita nueva
  // (en ese último caso, al confirmar no se toca origen/destino: se pasa a
  // 'favorita-form' con el pin ya cargado).
  const [mapaProposito, setMapaProposito] = useState('destino')

  // 'favorita-form': null = crear (puntoNuevaFavorita trae el pin elegido en
  // el mapa, si vino de ahí); objeto = editando esa favorita ya existente.
  const [favoritaEnEdicion, setFavoritaEnEdicion] = useState(null)
  const [puntoNuevaFavorita, setPuntoNuevaFavorita] = useState(null)

  // Se pide UNA sola vez acá arriba (no en DireccionesFavoritasList ni en
  // FavoritaForm, que son hermanas en el árbol): evita duplicar el fetch de
  // Supabase cada vez que se cambia entre 'solicitud' y 'favorita-form'.
  const {
    favoritas,
    loading: favoritasLoading,
    error: favoritasError,
    crear: crearFavorita,
    actualizar: actualizarFavorita,
    eliminar: eliminarFavorita,
    refetch: refetchFavoritas,
  } = useDireccionesFavoritas()

  // true mientras se está pidiendo la posición GPS y/o resolviendo su nombre
  // legible — controla si el input "Origen" muestra "Tu ubicación actual"
  // como estado transitorio en vez de quedar vacío.
  const [origenResolviendo, setOrigenResolviendo] = useState(true)

  // DECISIÓN DE PRODUCTO (ver CLAUDE.md / instrucciones de esta tarea): pedir
  // geolocalización en silencio al montar, sin bloquear la UI. Si se concede,
  // el origen queda definido con lat/lng de inmediato (alcanza para habilitar
  // "Continuar", tal como pide el spec) con referencia vacía a propósito — el
  // usuario puede tocar el input "Origen" en cualquier momento para ir al
  // mapa (que SÍ exige la referencia manual) y precisar el punto con una
  // descripción útil para el conductor. Esto es una degradación conocida y
  // aceptada, no un bug: el conductor puede recibir un viaje con origen sin
  // referencia si el cliente nunca toca el input, igual que otros campos
  // best-effort ya documentados en el proyecto (ver geocode.js).
  useEffect(() => {
    let cancelado = false

    if (!navigator.geolocation) {
      setOrigenResolviendo(false)
      return undefined
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelado) return
        const { latitude, longitude } = position.coords

        // prev ?? {...}: si el usuario ya fijó un origen a mano (tocó el
        // input y confirmó un pin en el mapa) antes de que este callback
        // async del GPS llegara a resolver, no lo pisamos.
        setOrigen((prev) => prev ?? { lat: latitude, lng: longitude, nombre: '', referencia: '' })
        setOrigenResolviendo(false)

        reverseGeocode(latitude, longitude).then((nombreResuelto) => {
          if (cancelado || !nombreResuelto) return
          // Solo aplica el nombre resuelto si el origen sigue siendo este
          // mismo punto de GPS (el usuario no lo cambió mientras tanto).
          setOrigen((prev) =>
            prev && prev.lat === latitude && prev.lng === longitude ? { ...prev, nombre: nombreResuelto } : prev,
          )
        })
      },
      () => {
        // Permiso denegado, timeout, o posición no disponible: el input
        // "Origen" cae a su placeholder normal, nunca bloquea el flujo.
        if (!cancelado) setOrigenResolviendo(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )

    return () => {
      cancelado = true
    }
  }, [])

  function abrirMapa(campo) {
    setCampoActivo(campo)
    setMapaProposito(campo)
    setVista('mapa')
  }

  function handleConfirmarMapa(seleccion) {
    if (mapaProposito === 'nueva-favorita') {
      setPuntoNuevaFavorita(seleccion)
      setFavoritaEnEdicion(null)
      setVista('favorita-form')
      return
    }
    if (mapaProposito === 'origen') setOrigen(seleccion)
    else setDestino(seleccion)
    setVista('solicitud')
  }

  function handleSeleccionarFavorita(favorita) {
    const seleccion = {
      lat: favorita.lat,
      lng: favorita.lng,
      nombre: favorita.direccion_texto,
      referencia: favorita.descripcion,
    }
    if (campoActivo === 'origen') setOrigen(seleccion)
    else setDestino(seleccion)
  }

  function handleAgregarFavorita() {
    setMapaProposito('nueva-favorita')
    setVista('mapa')
  }

  function handleEditarFavorita(favorita) {
    setFavoritaEnEdicion(favorita)
    setPuntoNuevaFavorita(null)
    setVista('favorita-form')
  }

  function handleVolver() {
    if (vista === 'solicitud') {
      navigate('/')
      return
    }
    // 'mapa' y 'favorita-form' siempre vuelven a 'solicitud': ninguna de las
    // dos es un paso obligatorio en la pantalla única, son desvíos opcionales.
    setVista('solicitud')
  }

  const tituloMapa =
    mapaProposito === 'origen'
      ? '¿Dónde te recogemos?'
      : mapaProposito === 'destino'
        ? '¿A dónde vas?'
        : 'Ubicación de la nueva dirección'

  const valorInicialMapa = mapaProposito === 'origen' ? origen : mapaProposito === 'destino' ? destino : null

  return (
    <div className="pedir-viaje-page">
      {/* La vista 'conductores' es mapa full-bleed con su propio botón de
          volver flotante — el header genérico solo aplica a las otras tres. */}
      {vista !== 'conductores' && (
        <header className="pedir-viaje-page__header">
          <button type="button" className="pedir-viaje-page__back" onClick={handleVolver} aria-label="Volver">
            ←
          </button>
          {vista === 'favorita-form' && (
            <span className="pedir-viaje-page__titulo">
              {favoritaEnEdicion ? 'Editar dirección' : 'Guardar dirección'}
            </span>
          )}
        </header>
      )}

      <div className="pedir-viaje-page__body">
        {vista === 'solicitud' && (
          <SolicitudViajeView
            origen={origen}
            destino={destino}
            origenResolviendo={origenResolviendo}
            onEditarOrigen={() => abrirMapa('origen')}
            onEditarDestino={() => abrirMapa('destino')}
            favoritas={favoritas}
            favoritasLoading={favoritasLoading}
            favoritasError={favoritasError}
            favoritasRefetch={refetchFavoritas}
            eliminarFavorita={eliminarFavorita}
            onSeleccionarFavorita={handleSeleccionarFavorita}
            onEditarFavorita={handleEditarFavorita}
            onAgregarFavorita={handleAgregarFavorita}
            onContinuar={() => setVista('conductores')}
          />
        )}

        {vista === 'mapa' && (
          <SeleccionarUbicacionView titulo={tituloMapa} valorInicial={valorInicialMapa} onConfirmar={handleConfirmarMapa} />
        )}

        {vista === 'favorita-form' && (
          <FavoritaForm
            modo={favoritaEnEdicion ? 'editar' : 'crear'}
            favoritaInicial={favoritaEnEdicion}
            puntoInicial={puntoNuevaFavorita}
            crear={crearFavorita}
            actualizar={actualizarFavorita}
            onGuardado={() => setVista('solicitud')}
            onCancelar={() => setVista('solicitud')}
            onEditarExistente={(favorita) => setFavoritaEnEdicion(favorita)}
          />
        )}
      </div>

      {/* Fuera de .pedir-viaje-page__body (que tiene padding/max-width de
          contenido de texto): MapaConductoresView es full-bleed por su cuenta
          (position: fixed) y no necesita ese contenedor. */}
      {vista === 'conductores' && (
        <MapaConductoresView
          origen={origen}
          destino={destino}
          onEditarOrigen={() => abrirMapa('origen')}
          onEditarDestino={() => abrirMapa('destino')}
          onVolver={() => setVista('solicitud')}
        />
      )}
    </div>
  )
}
