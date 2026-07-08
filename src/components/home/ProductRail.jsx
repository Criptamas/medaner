import HomeProductCard from './HomeProductCard'
import './ProductRail.css'

// Carrusel horizontal de productos reutilizable. Lo usan tanto
// "Te puede interesar..." como "Mira los productos en tendencia".
// Scroll-snap nativo (sin librería). No renderiza nada si no hay productos.
export default function ProductRail({ titulo, productos }) {
  if (!productos || productos.length === 0) return null

  return (
    <section className="product-rail" aria-label={titulo}>
      <h2 className="product-rail__titulo">{titulo}</h2>
      <ul className="product-rail__track">
        {productos.map((producto) => (
          <li key={`${producto.tiendaId}-${producto.id}`}>
            <HomeProductCard producto={producto} />
          </li>
        ))}
      </ul>
    </section>
  )
}
