import { Link, useParams } from 'react-router-dom'
import { useOrder } from '../hooks/useOrder'
import EstadoProgress from '../components/EstadoProgress'
import StatusMessage from '../components/StatusMessage'
import { PAYMENT_LABELS, priceFormatter } from '../utils/pedidoLabels'
import './OrderTrackingPage.css'

const ORDER_STEPS = [
  { key: 'pendiente', label: 'Buscando un conductor' },
  { key: 'confirmado', label: 'Pedido confirmado' },
  { key: 'en_camino', label: 'Tu pedido va en camino' },
  { key: 'entregado', label: 'Pedido entregado' },
]

const STATUS_LABELS = Object.fromEntries(ORDER_STEPS.map((step) => [step.key, step.label]))

export default function OrderTrackingPage() {
  const { pedidoId } = useParams()
  const { order, loading, error } = useOrder(pedidoId)

  return (
    <div className="order-tracking-page">
      <header className="order-tracking-page__header">
        <Link to="/" className="order-tracking-page__back" aria-label="Volver al inicio">
          ←
        </Link>
        <h1>Seguimiento del pedido</h1>
      </header>

      {loading && <StatusMessage variant="loading" title="Buscando tu pedido..." />}

      {!loading && error && (
        <StatusMessage
          variant="error"
          title="No pudimos cargar tu pedido"
          description="Revisá tu conexión e intentá de nuevo."
        />
      )}

      {!loading && !error && !order && (
        <StatusMessage variant="empty" title="No encontramos este pedido" />
      )}

      {!loading && !error && order && (
        <div className="order-tracking-page__content">
          <p className="order-tracking-page__status">
            {STATUS_LABELS[order.estado] ?? order.estado}
          </p>

          <EstadoProgress estado={order.estado} steps={ORDER_STEPS} />

          <section className="order-tracking-page__section">
            <h2>Productos</h2>
            <ul className="order-tracking-page__products">
              {order.productos?.map((product, index) => (
                <li key={index} className="order-tracking-page__product">
                  <span>
                    {product.cantidad} × {product.nombre}
                  </span>
                  <span>{priceFormatter.format(product.precio * product.cantidad)}</span>
                </li>
              ))}
            </ul>
            <div className="order-tracking-page__total">
              <span>Total</span>
              <strong>{priceFormatter.format(order.total)}</strong>
            </div>
          </section>

          <section className="order-tracking-page__section">
            <h2>Método de pago</h2>
            <p>{PAYMENT_LABELS[order.metodoPago] ?? order.metodoPago}</p>
          </section>
        </div>
      )}
    </div>
  )
}
