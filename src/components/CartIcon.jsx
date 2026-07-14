import { useCart } from '../hooks/useCart'
import { IconCart } from './icons/Icons'
import './CartIcon.css'

export default function CartIcon() {
  const { itemCount, openCart } = useCart()

  return (
    <button
      type="button"
      className="cart-icon"
      onClick={openCart}
      aria-label={itemCount > 0 ? `Ver carrito, ${itemCount} productos` : 'Ver carrito'}
    >
      {/* Decorativo: el botón ya tiene su aria-label descriptivo arriba. */}
      <IconCart size={18} aria-hidden="true" />
      {itemCount > 0 && <span className="cart-icon__badge">{itemCount}</span>}
    </button>
  )
}
