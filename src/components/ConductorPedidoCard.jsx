import { useStore } from '../hooks/useStore'
import { ESTADO_BADGE_LABELS, priceFormatter } from '../utils/pedidoLabels'
import './ConductorPedidoCard.css'

export default function ConductorPedidoCard({ pedido, mostrarEstado = false, children }) {
  const { store } = useStore(pedido.tiendaId)

  return (
    <li className="conductor-pedido-card">
      <div className="conductor-pedido-card__header">
        <h2>{store?.nombre ?? 'Tienda'}</h2>
        {mostrarEstado && (
          <span className="conductor-pedido-card__badge">
            {ESTADO_BADGE_LABELS[pedido.estado] ?? pedido.estado}
          </span>
        )}
      </div>

      <ul className="conductor-pedido-card__productos">
        {pedido.productos?.map((producto, index) => (
          <li key={index}>
            {producto.cantidad} × {producto.nombre}
          </li>
        ))}
      </ul>

      <p className="conductor-pedido-card__direccion">📍 {pedido.direccion}</p>

      <div className="conductor-pedido-card__footer">
        <strong>{priceFormatter.format(pedido.total)}</strong>
        <div className="conductor-pedido-card__acciones">{children}</div>
      </div>
    </li>
  )
}
