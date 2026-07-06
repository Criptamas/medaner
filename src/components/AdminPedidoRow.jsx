import { useStore } from '../hooks/useStore'
import { ESTADO_BADGE_LABELS, PAYMENT_LABELS, priceFormatter } from '../utils/pedidoLabels'
import './AdminPedidoRow.css'

export default function AdminPedidoRow({ pedido }) {
  const { store } = useStore(pedido.tiendaId)

  const resumenProductos = pedido.productos
    ?.map((producto) => `${producto.cantidad} × ${producto.nombre}`)
    .join(', ')

  return (
    <li className="admin-pedido-row">
      <div className="admin-pedido-row__header">
        <h3>{store?.nombre ?? 'Tienda'}</h3>
        <span className={`admin-pedido-row__badge admin-pedido-row__badge--${pedido.estado}`}>
          {ESTADO_BADGE_LABELS[pedido.estado] ?? pedido.estado}
        </span>
      </div>

      <p className="admin-pedido-row__cliente">
        {pedido.clienteNombre} · {pedido.clienteTelefono}
      </p>
      <p className="admin-pedido-row__productos">{resumenProductos}</p>
      <p className="admin-pedido-row__direccion">📍 {pedido.direccion}</p>

      <div className="admin-pedido-row__footer">
        <span>{PAYMENT_LABELS[pedido.metodoPago] ?? pedido.metodoPago}</span>
        <strong>{priceFormatter.format(pedido.total)}</strong>
      </div>
    </li>
  )
}
