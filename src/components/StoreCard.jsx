import { Link } from 'react-router-dom'
import './StoreCard.css'

export default function StoreCard({ store }) {
  return (
    <Link to={`/tienda/${store.id}`} className="store-card">
      <div className="store-card__header">
        <h2 className="store-card__name">{store.nombre}</h2>
        {store.categoria && <span className="store-card__category">{store.categoria}</span>}
      </div>
      {store.descripcion && <p className="store-card__description">{store.descripcion}</p>}
    </Link>
  )
}
