import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TipoVehiculoStep from '../components/TipoVehiculoStep'
import UbicacionViajeStep from '../components/UbicacionViajeStep'
import DestinoViajeStep from '../components/DestinoViajeStep'
import DatosClienteViajeStep from '../components/DatosClienteViajeStep'
import MetodoPagoViajeStep from '../components/MetodoPagoViajeStep'
import CotizacionViajeSheet from '../components/CotizacionViajeSheet'
import { useCreateViaje } from '../hooks/useCreateViaje'
import { useFcmToken } from '../hooks/useFcmToken'
import './PedirViajePage.css'

const TOTAL_PASOS = 5

// Orquestador del wizard: mantiene todos los datos de los 5 pasos en su
// propio estado, así retroceder nunca pierde lo ya ingresado.
export default function PedirViajePage() {
  const navigate = useNavigate()
  const { createViaje, submitting, error } = useCreateViaje()
  const { obtenerToken } = useFcmToken()

  const [paso, setPaso] = useState(0)
  const [tipoVehiculo, setTipoVehiculo] = useState(null)
  const [origen, setOrigen] = useState(null)
  const [destino, setDestino] = useState(null)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  // El paso 4 ya no crea el viaje directamente: abre este sheet, que muestra
  // el precio estimado y es quien efectivamente llama a createViaje al
  // confirmar. Si se cierra sin confirmar, el wizard se queda en el paso 4
  // tal cual estaba (nada de lo ya ingresado se pierde).
  const [mostrarCotizacion, setMostrarCotizacion] = useState(false)

  function avanzar() {
    setPaso((actual) => actual + 1)
  }

  function retroceder() {
    // En el primer paso, "atrás" sale del flujo de viaje.
    if (paso === 0) {
      navigate('/')
      return
    }
    setPaso((actual) => actual - 1)
  }

  // Llamado desde el botón "Confirmar viaje" DENTRO del sheet de cotización,
  // con el precio ya acordado (datosPrecio = distanciaKm, duracionEstimadaMin,
  // precioBase, precioFinal). Si falla, el sheet se queda abierto mostrando
  // el error (useCreateViaje.error) para poder reintentar sin perder la
  // cotización ya calculada.
  async function handleConfirmarViaje(datosPrecio) {
    // Push para el cliente es un plus, nunca un bloqueante: si el navegador
    // no soporta notificaciones, el permiso se niega o falla por cualquier
    // motivo, el viaje se crea igual con fcmTokenCliente: null.
    let fcmTokenCliente = null
    try {
      fcmTokenCliente = await obtenerToken()
    } catch {
      fcmTokenCliente = null
    }

    try {
      const id = await createViaje({
        tipoVehiculo,
        origen,
        destino,
        clienteNombre: nombre.trim(),
        clienteTelefono: telefono.trim(),
        metodoPago,
        fcmTokenCliente,
        ...datosPrecio,
      })
      navigate(`/viaje/${id}`)
    } catch {
      // el error queda expuesto por useCreateViaje y se muestra en el sheet de cotización
    }
  }

  return (
    <div className="pedir-viaje-page">
      <header className="pedir-viaje-page__header">
        <button
          type="button"
          className="pedir-viaje-page__back"
          onClick={retroceder}
          aria-label="Volver"
        >
          ←
        </button>
        <span className="pedir-viaje-page__progreso">
          Paso {paso + 1} de {TOTAL_PASOS}
        </span>
      </header>

      <div className="pedir-viaje-page__body">
        {paso === 0 && (
          <TipoVehiculoStep
            value={tipoVehiculo}
            onSelect={(valor) => {
              setTipoVehiculo(valor)
              avanzar()
            }}
          />
        )}

        {/* key distinto entre origen y destino: fuerza a montar un mapa limpio
            en cada paso en vez de reutilizar la instancia del paso anterior. */}
        {paso === 1 && (
          <UbicacionViajeStep
            key="ubicacion-origen"
            titulo="¿Dónde te recogemos?"
            value={origen}
            onConfirmar={(ubicacion) => {
              setOrigen(ubicacion)
              avanzar()
            }}
          />
        )}

        {/* Solo el paso de destino usa DestinoViajeStep (favoritas Hogar/
            Trabajo/Universidad/Personalizado + mapa libre). El paso de
            origen (arriba) sigue con UbicacionViajeStep tal cual — no se toca. */}
        {paso === 2 && (
          <DestinoViajeStep
            key="ubicacion-destino"
            titulo="¿A dónde vas?"
            value={destino}
            onConfirmar={(ubicacion) => {
              setDestino(ubicacion)
              avanzar()
            }}
          />
        )}

        {paso === 3 && (
          <DatosClienteViajeStep
            nombre={nombre}
            telefono={telefono}
            onNombreChange={setNombre}
            onTelefonoChange={setTelefono}
            onContinuar={avanzar}
          />
        )}

        {paso === 4 && (
          <MetodoPagoViajeStep
            metodoPago={metodoPago}
            onMetodoPagoChange={setMetodoPago}
            onConfirmar={() => setMostrarCotizacion(true)}
          />
        )}
      </div>

      {mostrarCotizacion && (
        <CotizacionViajeSheet
          origen={origen}
          destino={destino}
          tipoVehiculo={tipoVehiculo}
          onConfirmar={handleConfirmarViaje}
          onCerrar={() => setMostrarCotizacion(false)}
          submitting={submitting}
          error={error}
        />
      )}
    </div>
  )
}
