import { useState } from 'react'
import { useCart } from '../hooks/useCart'
import './ProductCard.css'

const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

export default function ProductCard({ product }) {
  const [imageFailed, setImageFailed] = useState(false)
  const { addItem } = useCart()

  return (
    <div className="product-card">
      <div className="product-card__image-wrap">
        {product.imagen && !imageFailed ? (
          <img
            className="product-card__image"
            src={product.imagen}
            alt={product.nombre}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="product-card__image-fallback" aria-hidden="true">
            {product.nombre?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="product-card__body">
        <h3 className="product-card__name">{product.nombre}</h3>
        {product.descripcion && <p className="product-card__description">{product.descripcion}</p>}
        <div className="product-card__footer">
          {typeof product.precio === 'number' && (
            <p className="product-card__price">{priceFormatter.format(product.precio)}</p>
          )}
          <button type="button" className="product-card__add" onClick={() => addItem(product)}>
            Agregar
          </button>
        </div>
      </div>
    </div>
  )
}
