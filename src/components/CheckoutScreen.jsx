import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { useCreateOrder } from '../hooks/useCreateOrder'
import './CheckoutScreen.css'

const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'pago_movil', label: 'Pago móvil' },
  { value: 'zelle', label: 'Zelle' },
]

export default function CheckoutScreen({ storeId, onClose }) {
  const navigate = useNavigate()
  const { items, totalPrice, clearCart } = useCart()
  const { createOrder, submitting, error } = useCreateOrder()

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')

  const isValid = nombre.trim() !== '' && telefono.trim() !== '' && direccion.trim() !== ''

  async function handleSubmit(event) {
    event.preventDefault()
    if (!isValid || submitting) return

    try {
      const id = await createOrder({
        storeId,
        items,
        totalPrice,
        clienteNombre: nombre.trim(),
        clienteTelefono: telefono.trim(),
        direccion: direccion.trim(),
        metodoPago,
      })
      clearCart()
      navigate(`/pedido/${id}`)
    } catch {
      // el error queda expuesto por useCreateOrder y se muestra debajo del formulario
    }
  }

  return (
    <div className="checkout-screen">
      <header className="checkout-screen__header">
        <button
          type="button"
          className="checkout-screen__back"
          onClick={onClose}
          aria-label="Volver al carrito"
        >
          ←
        </button>
        <h1>Confirmar pedido</h1>
      </header>

      <div className="checkout-screen__summary">
        <span>{items.length === 1 ? '1 producto' : `${items.length} productos`}</span>
        <strong>{priceFormatter.format(totalPrice)}</strong>
      </div>

      <form className="checkout-screen__form" onSubmit={handleSubmit}>
        <label className="checkout-screen__field">
          <span>Nombre</span>
          <input
            type="text"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            autoComplete="name"
            required
          />
        </label>

        <label className="checkout-screen__field">
          <span>Teléfono</span>
          <input
            type="tel"
            value={telefono}
            onChange={(event) => setTelefono(event.target.value)}
            autoComplete="tel"
            required
          />
        </label>

        <label className="checkout-screen__field">
          <span>Dirección o punto de referencia</span>
          <input
            type="text"
            value={direccion}
            onChange={(event) => setDireccion(event.target.value)}
            placeholder="Ej: Frente a la plaza, Punto Fijo"
            required
          />
        </label>

        <label className="checkout-screen__field">
          <span>Método de pago</span>
          <select value={metodoPago} onChange={(event) => setMetodoPago(event.target.value)}>
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </label>

        {error && (
          <p className="checkout-screen__error" role="alert">
            No pudimos enviar tu pedido. Revisá tu conexión e intentá de nuevo.
          </p>
        )}

        <button type="submit" disabled={!isValid || submitting}>
          {submitting ? 'Enviando...' : 'Confirmar pedido'}
        </button>
      </form>
    </div>
  )
}
