import { Link } from 'react-router-dom'
import { useActiveStores } from '../hooks/useActiveStores'
import { useLastOrderId } from '../hooks/useLastOrderId'
import StoreCard from '../components/StoreCard'
import StatusMessage from '../components/StatusMessage'
import './StoreListPage.css'

export default function StoreListPage() {
  const { stores, loading, error } = useActiveStores()
  const lastOrderId = useLastOrderId()

  return (
    <div className="store-list-page">
      <header className="store-list-page__header">
        <h1>Medaner</h1>
        <p>Elegí una tienda para ver su catálogo</p>
      </header>

      <Link to="/pedir-viaje" className="store-list-page__pedir-viaje">
        🚕 Pedir un viaje
      </Link>

      {lastOrderId && (
        <Link to={`/pedido/${lastOrderId}`} className="store-list-page__last-order">
          Ver mi último pedido
        </Link>
      )}

      {loading && <StatusMessage variant="loading" title="Cargando tiendas..." />}

      {!loading && error && (
        <StatusMessage
          variant="error"
          title="No pudimos cargar las tiendas"
          description="Revisá tu conexión e intentá de nuevo."
        />
      )}

      {!loading && !error && stores.length === 0 && (
        <StatusMessage variant="empty" title="No hay tiendas disponibles por ahora" />
      )}

      {!loading && !error && stores.length > 0 && (
        <ul className="store-list-page__list">
          {stores.map((store) => (
            <li key={store.id}>
              <StoreCard store={store} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
