import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TipoVehiculoStep from '../components/TipoVehiculoStep'
import UbicacionViajeStep from '../components/UbicacionViajeStep'
import DatosClienteViajeStep from '../components/DatosClienteViajeStep'
import MetodoPagoViajeStep from '../components/MetodoPagoViajeStep'
import { useCreateViaje } from '../hooks/useCreateViaje'
import './PedirViajePage.css'

const TOTAL_PASOS = 5

// Orquestador del wizard: mantiene todos los datos de los 5 pasos en su
// propio estado, así retroceder nunca pierde lo ya ingresado.
export default function PedirViajePage() {
  const navigate = useNavigate()
  const { createViaje, submitting, error } = useCreateViaje()

  const [paso, setPaso] = useState(0)
  const [tipoVehiculo, setTipoVehiculo] = useState(null)
  const [origen, setOrigen] = useState(null)
  const [destino, setDestino] = useState(null)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')

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

  async function handleConfirmar() {
    try {
      const id = await createViaje({
        tipoVehiculo,
        origen,
        destino,
        clienteNombre: nombre.trim(),
        clienteTelefono: telefono.trim(),
        metodoPago,
      })
      navigate(`/viaje/${id}`)
    } catch {
      // el error queda expuesto por useCreateViaje y se muestra en el paso de pago
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

        {paso === 2 && (
          <UbicacionViajeStep
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
            onConfirmar={handleConfirmar}
            submitting={submitting}
            error={error}
          />
        )}
      </div>
    </div>
  )
}
