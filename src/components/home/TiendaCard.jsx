import { Link } from 'react-router-dom'
import { iconoDeCategoria } from '../../utils/categorias'
import './TiendaCard.css'

// Card de tienda para la grilla de la Home. Enlaza al catálogo de la tienda
// (/tienda/:storeId). Muestra un ícono según su categoría (ver utils/categorias).
// Reemplaza al StoreCard anterior con la nueva identidad visual.
export default function TiendaCard({ tienda }) {
  return (
    <Link to={`/tienda/${tienda.id}`} className="tienda-card">
      <span className="tienda-card__icono" aria-hidden="true">
        {iconoDeCategoria(tienda.categoria)}
      </span>
      <span className="tienda-card__info">
        <span className="tienda-card__nombre-row">
          <span className="tienda-card__nombre">{tienda.nombre}</span>
          {tienda.categoria && (
            <span className="tienda-card__categoria">{tienda.categoria}</span>
          )}
        </span>
        {tienda.descripcion && (
          <span className="tienda-card__descripcion">{tienda.descripcion}</span>
        )}
      </span>
      <span className="tienda-card__chevron" aria-hidden="true">
        ›
      </span>
    </Link>
  )
}
