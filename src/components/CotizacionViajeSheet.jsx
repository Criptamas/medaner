import { useEffect, useMemo, useState } from 'react'
import { useTarifas } from '../hooks/useTarifas'
import { getRouteDistance } from '../utils/directions'
import { calcularPrecioBase, formatUSD } from '../utils/tarifas'
import StatusMessage from './StatusMessage'
import './CotizacionViajeSheet.css'

// Mismo mapa icono+label que ya vive duplicado en TipoVehiculoStep,
// ViajeDisponibleCard, ViajeActivoCard, ConductorViajeDetallePage y
// ViajeTrackingPage — se repite acá siguiendo ese mismo patrón existente en
// vez de extraerlo a un archivo compartido (fuera de alcance de esta tarea).
const VEHICULO_INFO = {
  moto: { label: 'Moto', icon: '🏍️' },
  carro: { label: 'Carro', icon: '🚗' },
}

// Bottom sheet de cotización: se abre justo antes de crear el viaje (ver
// PedirViajePage) para que el cliente vea un precio estimado y pueda subirlo
// -nunca bajarlo del precio base- antes de confirmar. Mismo patrón visual
// "sin librerías" que CartDrawer (backdrop full-screen + sheet con
// position:absolute; bottom:0), pero es un componente nuevo e independiente:
// no comparte estado ni domain logic con el carrito.
export default function CotizacionViajeSheet({
  origen,
  destino,
  tipoVehiculo,
  onConfirmar,
  onCerrar,
  submitting,
  error,
}) {
  const { tarifas, loading: loadingTarifas, error: errorTarifas, reintentar: reintentarTarifas } =
    useTarifas()

  const [ruta, setRuta] = useState(null)
  const [loadingRuta, setLoadingRuta] = useState(true)
  const [errorRuta, setErrorRuta] = useState(false)
  const [intentoRuta, setIntentoRuta] = useState(0)
  const [precioFinal, setPrecioFinal] = useState(null)

  // Dependemos de los valores primitivos (no de los objetos origen/destino
  // completos) para no re-disparar la llamada a Mapbox si el padre re-renderiza
  // con una referencia nueva pero mismas coordenadas.
  const origenLat = origen?.lat
  const origenLng = origen?.lng
  const destinoLat = destino?.lat
  const destinoLng = destino?.lng

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

  const precioBase = useMemo(() => {
    if (!tarifas || !ruta) return null
    return calcularPrecioBase({ tipoVehiculo, distanciaKm: ruta.distanceKm, tarifas })
  }, [tarifas, ruta, tipoVehiculo])

  // precioFinal arranca igual al precioBase apenas se calcula (y se
  // recalcula si el usuario reintenta y el precioBase cambia); a partir de
  // ahí el stepper lo mueve de forma independiente.
  useEffect(() => {
    if (precioBase != null) setPrecioFinal(precioBase)
  }, [precioBase])

  function reintentar() {
    reintentarTarifas()
    setIntentoRuta((n) => n + 1)
  }

  function subirPrecio() {
    setPrecioFinal((actual) => Math.round((actual + tarifas.incrementoAjuste) * 100) / 100)
  }

  function bajarPrecio() {
    setPrecioFinal((actual) => {
      const siguiente = Math.round((actual - tarifas.incrementoAjuste) * 100) / 100
      return Math.max(precioBase, siguiente)
    })
  }

  function handleConfirmarClick() {
    if (!ruta || precioFinal == null) return
    onConfirmar({
      distanciaKm: ruta.distanceKm,
      duracionEstimadaMin: ruta.durationMin,
      precioBase,
      precioFinal,
    })
  }

  const cargando = loadingTarifas || loadingRuta
  const hayError = Boolean(errorTarifas || errorRuta)
  const listoParaConfirmar = !cargando && !hayError && precioFinal != null

  const enElPiso = precioBase != null && Math.abs(precioFinal - precioBase) < 0.001

  return (
    <div className="cotizacion-sheet">
      <button
        type="button"
        className="cotizacion-sheet__backdrop"
        onClick={onCerrar}
        aria-label="Cerrar cotización"
      />
      <div className="cotizacion-sheet__sheet" role="dialog" aria-label="Cotización del viaje">
        <header className="cotizacion-sheet__header">
          <h2>Precio estimado</h2>
          <button
            type="button"
            className="cotizacion-sheet__close"
            onClick={onCerrar}
            aria-label="Cerrar cotización"
          >
            ✕
          </button>
        </header>

        {cargando && !hayError && (
          <StatusMessage variant="loading" title="Calculando el precio de tu viaje..." />
        )}

        {hayError && (
          <StatusMessage
            variant="error"
            title="No pudimos calcular el precio"
            description="Revisá tu conexión e intentá de nuevo."
          />
        )}
        {hayError && (
          <button type="button" className="cotizacion-sheet__reintentar" onClick={reintentar}>
            Reintentar
          </button>
        )}

        {!cargando && !hayError && ruta && precioFinal != null && (
          <>
            <div className="cotizacion-sheet__resumen">
              <span className="cotizacion-sheet__vehiculo">
                {VEHICULO_INFO[tipoVehiculo]?.icon} {VEHICULO_INFO[tipoVehiculo]?.label ?? tipoVehiculo}
              </span>
              <span className="cotizacion-sheet__distancia">{ruta.distanceKm.toFixed(1)} km</span>
            </div>

            <div className="cotizacion-sheet__precio">{formatUSD(precioFinal)}</div>

            <div className="cotizacion-sheet__stepper">
              <button
                type="button"
                onClick={bajarPrecio}
                disabled={enElPiso}
                aria-label="Bajar precio"
              >
                −
              </button>
              <span>{formatUSD(precioFinal)}</span>
              <button type="button" onClick={subirPrecio} aria-label="Subir precio">
                +
              </button>
            </div>

            <p className="cotizacion-sheet__hint">
              Podés subir el precio para que un conductor acepte tu viaje más rápido.
            </p>

            {error && (
              <p className="cotizacion-sheet__error" role="alert">
                No pudimos crear tu viaje. Revisá tu conexión e intentá de nuevo.
              </p>
            )}

            <button
              type="button"
              className="cotizacion-sheet__confirmar"
              onClick={handleConfirmarClick}
              disabled={!listoParaConfirmar || submitting}
            >
              {submitting ? 'Creando tu viaje...' : 'Confirmar viaje'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
