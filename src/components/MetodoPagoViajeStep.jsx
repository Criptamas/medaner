import { PAYMENT_METHODS } from '../utils/pedidoLabels'
import './MetodoPagoViajeStep.css'

// El botón "Confirmar viaje" de este paso ya no crea el viaje: abre el sheet
// de cotización (CotizacionViajeSheet, ver PedirViajePage), que muestra el
// precio estimado y es quien efectivamente llama a createViaje. Por eso este
// paso no maneja submitting/error de la creación — ese feedback vive ahora
// en el sheet, más cerca de la acción real.
export default function MetodoPagoViajeStep({ metodoPago, onMetodoPagoChange, onConfirmar }) {
  return (
    <div className="metodo-pago-step">
      <p className="metodo-pago-step__prompt">¿Cómo vas a pagar?</p>

      <label className="metodo-pago-step__field">
        <span>Método de pago</span>
        <select value={metodoPago} onChange={(event) => onMetodoPagoChange(event.target.value)}>
          {PAYMENT_METHODS.map((metodo) => (
            <option key={metodo.value} value={metodo.value}>
              {metodo.label}
            </option>
          ))}
        </select>
      </label>

      <button type="button" className="metodo-pago-step__confirmar" onClick={onConfirmar}>
        Confirmar viaje
      </button>
    </div>
  )
}
