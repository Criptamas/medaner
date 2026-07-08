import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { useStoreProducts } from '../hooks/useStoreProducts'
import { CartProvider } from '../context/CartContext'
import { useCart } from '../hooks/useCart'
import ProductCard from '../components/ProductCard'
import StatusMessage from '../components/StatusMessage'
import CartIcon from '../components/CartIcon'
import CartDrawer from '../components/CartDrawer'
import CheckoutScreen from '../components/CheckoutScreen'
import './StoreCatalogPage.css'

// Cuando el usuario toca "+" en un producto del carrusel de la Home, se navega
// acá con router state { addProductId }. Este componente (montado DENTRO del
// CartProvider de la tienda) agrega ese producto al carrito REAL de la tienda
// y abre el drawer. Así el "+" de la Home usa la lógica de carrito existente
// sin crear un carrito global (que rompería el checkout por-tienda).
function AutoAgregarDesdeHome({ products }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { addItem, openCart } = useCart()
  const yaAgregadoRef = useRef(false)
  const addProductId = location.state?.addProductId

  useEffect(() => {
    if (!addProductId || yaAgregadoRef.current || products.length === 0) return
    const producto = products.find((p) => p.id === addProductId)
    if (!producto) return

    yaAgregadoRef.current = true
    addItem(producto)
    openCart()
    // Limpia el state para que al recargar o volver atrás no se re-agregue.
    navigate(location.pathname, { replace: true })
  }, [addProductId, products, addItem, openCart, navigate, location.pathname])

  return null
}

export default function StoreCatalogPage() {
  const { storeId } = useParams()
  const navigate = useNavigate()
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const { store, loading: storeLoading, error: storeError } = useStore(storeId)
  const { products, loading: productsLoading, error: productsError } = useStoreProducts(storeId)

  const loading = storeLoading || productsLoading
  const error = storeError || productsError

  return (
    <CartProvider key={storeId}>
      <AutoAgregarDesdeHome products={products} />
      <div className="store-catalog-page">
        <header className="store-catalog-page__header">
          <button
            type="button"
            className="store-catalog-page__back"
            onClick={() => navigate('/')}
            aria-label="Volver a la lista de tiendas"
          >
            ←
          </button>
          <div className="store-catalog-page__header-text">
            <h1>{store?.nombre ?? 'Catálogo'}</h1>
            {store?.categoria && <span>{store.categoria}</span>}
          </div>
          <CartIcon />
        </header>

        {loading && <StatusMessage variant="loading" title="Cargando catálogo..." />}

        {!loading && error && (
          <StatusMessage
            variant="error"
            title="No pudimos cargar el catálogo"
            description="Revisá tu conexión e intentá de nuevo."
          />
        )}

        {!loading && !error && !store && (
          <StatusMessage variant="empty" title="No encontramos esta tienda" />
        )}

        {!loading && !error && store && products.length === 0 && (
          <StatusMessage variant="empty" title="Esta tienda no tiene productos disponibles" />
        )}

        {!loading && !error && store && products.length > 0 && (
          <div className="store-catalog-page__grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      <CartDrawer onConfirm={() => setIsCheckoutOpen(true)} />

      {isCheckoutOpen && (
        <CheckoutScreen storeId={storeId} onClose={() => setIsCheckoutOpen(false)} />
      )}
    </CartProvider>
  )
}
