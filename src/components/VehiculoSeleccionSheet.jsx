import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTarifas } from '../hooks/useTarifas'
import { useTasaCambio } from '../hooks/useTasaCambio'
import { useClienteAuth } from '../hooks/useClienteAuth'
import { useCreateViaje } from '../hooks/useCreateViaje'
import { useFcmToken } from '../hooks/useFcmToken'
import { useConteoConductoresDisponibles } from '../hooks/useConteoConductoresDisponibles'
import { getRouteDistance } from '../utils/directions'
import { calcularPrecioBase, formatUSD } from '../utils/tarifas'
import { PAYMENT_METHODS } from '../utils/pedidoLabels'
import StatusMessage from './StatusMessage'
import { IllustrationCar, IllustrationMoto } from './icons/Illustrations'
import './VehiculoSeleccionSheet.css'

// Tarjeta de un vehículo (Carro o Moto) dentro del sheet. Componente local
// (no se exporta ni se reusa fuera de este archivo) porque su única razón de
// existir es no repetir el markup dos veces acá adentro — no es una pieza de
// diseño reusable en otras pantallas, a diferencia de DireccionesFavoritasList.
function TarjetaVehiculo({
  tipo,
  Ilustracion,
  capacidadLabel,
  precioUSD,
  valorTasa,
  seleccionado,
  onSeleccionar,
  conInfoTooltip,
  disponibles,
  cargandoConteo,
}) {
  const [mostrarInfo, setMostrarInfo] = useState(false)
  const precioBs = valorTasa != null && Number.isFinite(precioUSD) ? precioUSD * valorTasa : null
  // Mientras cargandoConteo es true (primer fetch del hook todavía sin
  // resolver) no se muestra el badge: mostrar "0" de entrada sería un flash
  // engañoso antes de tener el dato real (ver spec de la feature).
  const mostrarBadge = !cargandoConteo && Number.isFinite(disponibles)
  const hayDisponibles = mostrarBadge && disponibles > 0

  return (
    <button
      type="button"
      className={`vehiculo-seleccion-sheet__tarjeta${seleccionado ? ' vehiculo-seleccion-sheet__tarjeta--activa' : ''}`}
      onClick={onSeleccionar}
      aria-pressed={seleccionado}
      aria-label={`Elegir ${tipo}`}
    >
      <Ilustracion className="vehiculo-seleccion-sheet__tarjeta-ilustracion" aria-hidden="true" />
      <span className="vehiculo-seleccion-sheet__tarjeta-capacidad">{capacidadLabel}</span>
      <span className="vehiculo-seleccion-sheet__tarjeta-precio">
        {formatUSD(precioUSD)}
        {mostrarBadge && (
          <span
            className={`vehiculo-seleccion-sheet__tarjeta-badge${hayDisponibles ? '' : ' vehiculo-seleccion-sheet__tarjeta-badge--vacio'}`}
            aria-label={
              hayDisponibles
                ? `${disponibles} conductores disponibles cerca`
                : 'Sin conductores disponibles cerca por ahora'
            }
          >
            {disponibles}
          </span>
        )}
      </span>

      {precioBs != null && (
        <span className="vehiculo-seleccion-sheet__tarjeta-bs">
          Bs. {precioBs.toFixed(2)}
          {conInfoTooltip && (
            <span
              role="button"
              tabIndex={0}
              className="vehiculo-seleccion-sheet__info-btn"
              aria-label="Sobre este monto en bolívares"
              onClick={(event) => {
                event.stopPropagation()
                setMostrarInfo((actual) => !actual)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                  setMostrarInfo((actual) => !actual)
                }
              }}
            >
              (i)
            </span>
          )}
        </span>
      )}

      {conInfoTooltip && mostrarInfo && (
        <span className="vehiculo-seleccion-sheet__tooltip">Referencial según tasa BCV</span>
      )}
    </button>
  )
}

// Bottom sheet de la vista 'conductores' (sección 3.2 del spec): selección de
// vehículo + precio + método de pago + confirmar. A diferencia del viejo
// CotizacionViajeSheet (que recibía onConfirmar/submitting/error por props
// desde PedirViajePage), este sheet es dueño de toda su lógica de envío
// (useCreateViaje/useFcmToken/useClienteAuth/navigate acá adentro) para no
// tener que hacer prop-drilling de esos callbacks a través de
// MapaConductoresView — el mismo patrón que ya usan otras piezas "hoja" de la
// app (ej. ViajeActivoCard llama a useNavigate por su cuenta).
export default function VehiculoSeleccionSheet({ origen, destino }) {
  const navigate = useNavigate()
  const { nombre, telefono } = useClienteAuth()
  const { createViaje, submitting, error } = useCreateViaje()
  const { obtenerToken } = useFcmToken()

  const { tarifas, loading: loadingTarifas, error: errorTarifas, reintentar: reintentarTarifas } = useTarifas()
  const { valor: valorTasa } = useTasaCambio()
  // activo=true fijo a propósito: el conteo de conductores es independiente
  // del cálculo de precio (tarifas/ruta), así que arranca apenas se monta el
  // sheet en vez de esperar a que esos otros hooks resuelvan.
  const { conteo, cargando: cargandoConteo } = useConteoConductoresDisponibles(origen, true)

  const [ruta, setRuta] = useState(null)
  const [loadingRuta, setLoadingRuta] = useState(true)
  const [errorRuta, setErrorRuta] = useState(false)
  const [intentoRuta, setIntentoRuta] = useState(0)

  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState('moto')
  const [ofertaActiva, setOfertaActiva] = useState(false)
  const [precioOfertado, setPrecioOfertado] = useState(null)
  const [metodoPago, setMetodoPago] = useState('efectivo')

  const origenLat = origen?.lat
  const origenLng = origen?.lng
  const destinoLat = destino?.lat
  const destinoLng = destino?.lng

  // Distancia real de manejo (contrato #1): un fallo acá SIEMPRE bloquea con
  // "Reintentar", nunca se inventa una distancia para no torcer el precio.
  useEffect(() => {
    let cancelado = false
    setLoadingRuta(true)
    setErrorRuta(false)

    getRouteDistance(origen, destino).then((resultado) => {
      if (cancelado) return
      if (!resultado) {
        setRuta(null)
        setErrorRuta(true)
      } else {
        setRuta(resultado)
      }
      setLoadingRuta(false)
    })

    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origenLat, origenLng, destinoLat, destinoLng, intentoRuta])

  const precioBaseMoto =
    tarifas && ruta ? calcularPrecioBase({ tipoVehiculo: 'moto', distanciaKm: ruta.distanceKm, tarifas }) : null
  const precioBaseCarro =
    tarifas && ruta ? calcularPrecioBase({ tipoVehiculo: 'carro', distanciaKm: ruta.distanceKm, tarifas }) : null
  const precioBaseSeleccionado = vehiculoSeleccionado === 'moto' ? precioBaseMoto : precioBaseCarro

  // Cambiar de vehículo descarta la oferta activa: el stepper sube el precio
  // del vehículo actualmente seleccionado, no tiene sentido arrastrar una
  // oferta hecha sobre el otro vehículo.
  useEffect(() => {
    setOfertaActiva(false)
    setPrecioOfertado(null)
  }, [vehiculoSeleccionado])

  const precioFinal = ofertaActiva && precioOfertado != null ? precioOfertado : precioBaseSeleccionado

  function reintentar() {
    reintentarTarifas()
    setIntentoRuta((n) => n + 1)
  }

  function activarOferta() {
    if (precioBaseSeleccionado == null) return
    setOfertaActiva(true)
    setPrecioOfertado(precioBaseSeleccionado)
  }

  function subirOferta() {
    setPrecioOfertado((actual) => Math.round((actual + tarifas.incrementoAjuste) * 100) / 100)
  }

  function bajarOferta() {
    setPrecioOfertado((actual) => {
      const siguiente = Math.round((actual - tarifas.incrementoAjuste) * 100) / 100
      return Math.max(precioBaseSeleccionado, siguiente)
    })
  }

  async function handleConfirmar() {
    if (!ruta || precioBaseSeleccionado == null || precioFinal == null) return

    // Push para el cliente es un plus, nunca un bloqueante (ver useFcmToken):
    // permiso denegado/navegador sin soporte/error de red caen a null y el
    // viaje se crea igual.
    let fcmTokenCliente = null
    try {
      fcmTokenCliente = await obtenerToken()
    } catch {
      fcmTokenCliente = null
    }

    try {
      const id = await createViaje({
        tipoVehiculo: vehiculoSeleccionado,
        origen,
        destino,
        clienteNombre: (nombre ?? '').trim(),
        clienteTelefono: (telefono ?? '').trim(),
        metodoPago,
        fcmTokenCliente,
        distanciaKm: ruta.distanceKm,
        duracionEstimadaMin: ruta.durationMin,
        precioBase: precioBaseSeleccionado,
        precioFinal,
      })
      // createViaje ya dispara internamente POST /api/notificar-viaje
      // (fire-and-forget) al crear el doc — no hace falta repetirlo acá.
      navigate(`/viaje/${id}`)
    } catch {
      // el error queda expuesto por useCreateViaje y se muestra abajo
    }
  }

  const cargando = loadingTarifas || loadingRuta
  const hayError = Boolean(errorTarifas || errorRuta)
  const listoParaConfirmar = !cargando && !hayError && precioFinal != null

  const enElPiso = precioBaseSeleccionado != null && precioOfertado != null && Math.abs(precioOfertado - precioBaseSeleccionado) < 0.001

  return (
    <div className="vehiculo-seleccion-sheet">
      <div className="vehiculo-seleccion-sheet__fila-superior">
        {/* "Para mí" / "Ahora": únicas opciones disponibles por ahora, dejadas
            como placeholders no funcionales a propósito — a futuro habilitan
            pedir para otra persona / programar el viaje. Se deshabilitan en
            vez de ocultarse para comunicar que la función existe pero todavía
            no está activa. */}
        <select className="vehiculo-seleccion-sheet__select-chico" disabled defaultValue="para-mi">
          <option value="para-mi">Para mí</option>
        </select>
        <select className="vehiculo-seleccion-sheet__select-chico" disabled defaultValue="ahora">
          <option value="ahora">Ahora</option>
        </select>

        <div className="vehiculo-seleccion-sheet__oferta">
          {!ofertaActiva ? (
            <button
              type="button"
              className="vehiculo-seleccion-sheet__ofertar-btn"
              onClick={activarOferta}
              disabled={cargando || hayError || precioBaseSeleccionado == null}
            >
              Ofertar
            </button>
          ) : (
            <div className="vehiculo-seleccion-sheet__stepper">
              <button type="button" onClick={bajarOferta} disabled={enElPiso} aria-label="Bajar oferta">
                −
              </button>
              <span>{formatUSD(precioOfertado)}</span>
              <button type="button" onClick={subirOferta} aria-label="Subir oferta">
                +
              </button>
            </div>
          )}
        </div>
      </div>

      {cargando && !hayError && (
        <StatusMessage variant="loading" title="Calculando el precio de tu viaje..." />
      )}

      {hayError && (
        <>
          <StatusMessage
            variant="error"
            title="No pudimos calcular el precio"
            description="Revisá tu conexión e intentá de nuevo."
          />
          <button type="button" className="vehiculo-seleccion-sheet__reintentar" onClick={reintentar}>
            Reintentar
          </button>
        </>
      )}

      {!cargando && !hayError && (
        <>
          <div className="vehiculo-seleccion-sheet__vehiculos">
            <TarjetaVehiculo
              tipo="carro"
              Ilustracion={IllustrationCar}
              capacidadLabel="👤 4"
              precioUSD={ofertaActiva && vehiculoSeleccionado === 'carro' ? precioFinal : precioBaseCarro}
              valorTasa={valorTasa}
              seleccionado={vehiculoSeleccionado === 'carro'}
              onSeleccionar={() => setVehiculoSeleccionado('carro')}
              conInfoTooltip={false}
              disponibles={conteo.carro}
              cargandoConteo={cargandoConteo}
            />
            <TarjetaVehiculo
              tipo="moto"
              Ilustracion={IllustrationMoto}
              capacidadLabel="👤 1"
              precioUSD={ofertaActiva && vehiculoSeleccionado === 'moto' ? precioFinal : precioBaseMoto}
              valorTasa={valorTasa}
              seleccionado={vehiculoSeleccionado === 'moto'}
              onSeleccionar={() => setVehiculoSeleccionado('moto')}
              conInfoTooltip
              disponibles={conteo.moto}
              cargandoConteo={cargandoConteo}
            />
          </div>

          <label className="vehiculo-seleccion-sheet__pago">
            <span>Método de pago</span>
            <select value={metodoPago} onChange={(event) => setMetodoPago(event.target.value)}>
              {PAYMENT_METHODS.map((metodo) => (
                <option key={metodo.value} value={metodo.value}>
                  {metodo.label}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <p className="vehiculo-seleccion-sheet__error" role="alert">
              No pudimos crear tu viaje. Revisá tu conexión e intentá de nuevo.
            </p>
          )}

          <button
            type="button"
            className="vehiculo-seleccion-sheet__confirmar"
            onClick={handleConfirmar}
            disabled={!listoParaConfirmar || submitting}
          >
            {submitting ? 'Creando tu viaje...' : 'Confirmar viaje'}
          </button>
        </>
      )}
    </div>
  )
}
