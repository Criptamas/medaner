import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { priceFormatter } from '../../utils/pedidoLabels'
import './HomeProductCard.css'

// Card de producto para los carruseles de la Home.
//
// Ojo con el carrito: en esta app el carrito es POR tienda (CartProvider vive
// dentro de StoreCatalogPage con key={storeId}); NO hay carrito global. Meter
// productos de varias tiendas en un carrito global rompería el checkout, que
// asume un único tiendaId por pedido (useCreateOrder). Por eso el botón "+"
// NO crea un estado de carrito paralelo: navega al catálogo de la tienda del
// producto pasando el id por router state, y StoreCatalogPage lo agrega ahí,
// al carrito real de esa tienda (ver AutoAgregarDesdeHome en esa página).
export default function HomeProductCard({ producto }) {
  const [imagenFallo, setImagenFallo] = useState(false)
  const navigate = useNavigate()

  const rutaTienda = `/tienda/${producto.tiendaId}`
  const tienePrecio = typeof producto.precio === 'number'

  function agregar() {
    // Lleva al catálogo de la tienda con la intención de agregar este producto
    // a su carrito (el add real ocurre allá, en el CartProvider de la tienda).
    navigate(rutaTienda, { state: { addProductId: producto.id } })
  }

  const alt = producto.tiendaNombre
    ? `${producto.nombre} — ${producto.tiendaNombre}`
    : producto.nombre

  return (
    <article className="hp-card">
      <Link to={rutaTienda} className="hp-card__media" aria-label={`Ver ${alt}`}>
        {producto.imagen && !imagenFallo ? (
          <img
            className="hp-card__img"
            src={producto.imagen}
            alt={alt}
            loading="lazy"
            decoding="async"
            onError={() => setImagenFallo(true)}
          />
        ) : (
          <span className="hp-card__img-fallback" aria-hidden="true">
            {producto.nombre?.charAt(0).toUpperCase()}
          </span>
        )}
      </Link>

      <div className="hp-card__body">
        <Link to={rutaTienda} className="hp-card__nombre">
          {producto.nombre}
        </Link>
        {producto.tiendaNombre && (
          <span className="hp-card__tienda">{producto.tiendaNombre}</span>
        )}

        <div className="hp-card__footer">
          {tienePrecio && (
            <span className="hp-card__precio">{priceFormatter.format(producto.precio)}</span>
          )}
          <button
            type="button"
            className="hp-card__add"
            onClick={agregar}
            aria-label={`Agregar ${producto.nombre} al carrito`}
          >
            +
          </button>
        </div>
      </div>
    </article>
  )
}
