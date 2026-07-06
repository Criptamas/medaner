import { PAYMENT_METHODS } from '../utils/pedidoLabels'
import './MetodoPagoViajeStep.css'

export default function MetodoPagoViajeStep({
  metodoPago,
  onMetodoPagoChange,
  onConfirmar,
  submitting,
  error,
}) {
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

      {error && (
        <p className="metodo-pago-step__error" role="alert">
          No pudimos crear tu viaje. Revisá tu conexión e intentá de nuevo.
        </p>
      )}

      <button
        type="button"
        className="metodo-pago-step__confirmar"
        onClick={onConfirmar}
        disabled={submitting}
      >
        {submitting ? 'Creando tu viaje...' : 'Confirmar viaje'}
      </button>
    </div>
  )
}
