import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useActiveStores } from '../hooks/useActiveStores'
import StoreCard from '../components/StoreCard'
import MisPedidosRecientes from '../components/MisPedidosRecientes'
import RecuperarPedidos from '../components/RecuperarPedidos'
import StatusMessage from '../components/StatusMessage'
import './StoreListPage.css'

export default function StoreListPage() {
  const { stores, loading, error } = useActiveStores()

  // MisPedidosRecientes lee localStorage una sola vez al montar (ver ese
  // componente). Cuando RecuperarPedidos reinyecta pedidos/viajes ahí,
  // subimos este contador para forzar su remount vía `key` y que los
  // resultados nuevos aparezcan sin recargar la página.
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="store-list-page">
      <header className="store-list-page__header">
        <h1>Medaner</h1>
        <p>Elegí una tienda para ver su catálogo</p>
      </header>

      <Link to="/pedir-viaje" className="store-list-page__pedir-viaje">
        🚕 Pedir un viaje
      </Link>

      <MisPedidosRecientes key={refreshKey} />

      <RecuperarPedidos onRecuperados={() => setRefreshKey((key) => key + 1)} />

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
