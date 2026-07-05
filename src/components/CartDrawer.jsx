import { useCart } from '../hooks/useCart'
import './CartDrawer.css'

const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

export default function CartDrawer({ onConfirm }) {
  const { items, incrementQuantity, decrementQuantity, totalPrice, isOpen, closeCart } = useCart()

  if (!isOpen) return null

  function handleConfirm() {
    closeCart()
    onConfirm()
  }

  return (
    <div className="cart-drawer">
      <button
        type="button"
        className="cart-drawer__backdrop"
        onClick={closeCart}
        aria-label="Cerrar carrito"
      />
      <div className="cart-drawer__sheet" role="dialog" aria-label="Carrito de compras">
        <header className="cart-drawer__header">
          <h2>Tu carrito</h2>
          <button
            type="button"
            className="cart-drawer__close"
            onClick={closeCart}
            aria-label="Cerrar carrito"
          >
            ✕
          </button>
        </header>

        {items.length === 0 ? (
          <p className="cart-drawer__empty">Todavía no agregaste productos.</p>
        ) : (
          <ul className="cart-drawer__list">
            {items.map(({ product, quantity }) => (
              <li key={product.id} className="cart-drawer__item">
                <div className="cart-drawer__item-info">
                  <p className="cart-drawer__item-name">{product.nombre}</p>
                  <p className="cart-drawer__item-price">
                    {priceFormatter.format(product.precio ?? 0)}
                  </p>
                </div>
                <div className="cart-drawer__stepper">
                  <button
                    type="button"
                    onClick={() => decrementQuantity(product.id)}
                    aria-label={`Quitar una unidad de ${product.nombre}`}
                  >
                    −
                  </button>
                  <span>{quantity}</span>
                  <button
                    type="button"
                    onClick={() => incrementQuantity(product.id)}
                    aria-label={`Agregar una unidad de ${product.nombre}`}
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <footer className="cart-drawer__footer">
            <div className="cart-drawer__total">
              <span>Total</span>
              <strong>{priceFormatter.format(totalPrice)}</strong>
            </div>
            <button type="button" className="cart-drawer__confirm" onClick={handleConfirm}>
              Confirmar pedido
            </button>
          </footer>
        )}
      </div>
    </div>
  )
}
