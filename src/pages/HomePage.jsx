import { useMemo, useState } from 'react'
import { useActiveStores } from '../hooks/useActiveStores'
import { useHomeProductos } from '../hooks/useHomeProductos'
import { categoriasDistintas, normalizarCategoria } from '../utils/categorias'
import Seo from '../components/Seo'
import StatusMessage from '../components/StatusMessage'
import Header from '../components/home/Header'
import Hero from '../components/home/Hero'
import QuickAccessStrip from '../components/home/QuickAccessStrip'
import MisActividadReciente from '../components/home/MisActividadReciente'
import ProductRail from '../components/home/ProductRail'
import HomeProductCard from '../components/home/HomeProductCard'
import TiendaCard from '../components/home/TiendaCard'
import Footer from '../components/home/Footer'
import './HomePage.css'

// Normaliza texto para búsquedas: minúsculas y sin acentos, para que "cafe"
// encuentre "Café" y viceversa.
function normalizarTexto(texto) {
  return (texto ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export default function HomePage() {
  const { stores, loading, error } = useActiveStores()
  // Productos para los carruseles (fan-out acotado sobre tiendas activas).
  const { productos } = useHomeProductos(stores)

  const [query, setQuery] = useState('')
  const [categoria, setCategoria] = useState(null)

  const buscando = query.trim() !== ''
  const q = normalizarTexto(query.trim())

  const categorias = useMemo(() => categoriasDistintas(stores), [stores])

  // --- Filtrado por categoría (modo navegación) ---
  const tiendasPorCategoria = useMemo(() => {
    if (!categoria) return stores
    const cat = normalizarCategoria(categoria)
    return stores.filter((t) => normalizarCategoria(t.categoria) === cat)
  }, [stores, categoria])

  // --- Resultados de búsqueda (modo búsqueda) ---
  const tiendasEncontradas = useMemo(() => {
    if (!buscando) return []
    return stores.filter((t) =>
      [t.nombre, t.categoria, t.descripcion].some((campo) =>
        normalizarTexto(campo).includes(q),
      ),
    )
  }, [buscando, stores, q])

  const productosEncontrados = useMemo(() => {
    if (!buscando) return []
    return productos.filter((p) =>
      [p.nombre, p.descripcion, p.tiendaNombre].some((campo) =>
        normalizarTexto(campo).includes(q),
      ),
    )
  }, [buscando, productos, q])

  // --- Carruseles (modo navegación) ---
  // No hay campo real de "tendencia"/"destacado" en Firestore todavía, así que
  // ambos rieles se derivan del mismo pool con distinto orden (heurística
  // placeholder). Cuando exista ese dato, alimentar cada riel desde ahí.
  const interesar = productos.slice(0, 12)
  const tendencia =
    productos.length > 12 ? productos.slice(12, 24) : [...productos].reverse().slice(0, 12)

  return (
    <>
      <Seo
        title="Medaner | Delivery y Viajes en Punto Fijo"
        description="Pide comida, productos y viajes en Punto Fijo, estado Falcón. Tiendas locales con delivery y mototaxi/taxi. Paga en efectivo, pago móvil o Zelle."
        canonicalPath="/"
      />

      <Header query={query} onQueryChange={setQuery} />

      <main className="home">
        {/* h1 para SEO/accesibilidad (frase clave), sin recargar el diseño */}
        <h1 className="sr-only">Medaner — Delivery y viajes en Punto Fijo, estado Falcón</h1>

        {buscando ? (
          <section className="home__section home__resultados" aria-label="Resultados de búsqueda">
            <h2 className="home__section-titulo">
              Resultados para “{query.trim()}”
            </h2>

            {tiendasEncontradas.length === 0 && productosEncontrados.length === 0 ? (
              <StatusMessage
                variant="empty"
                title="Sin resultados"
                description="Probá con otro nombre de tienda o producto."
              />
            ) : (
              <>
                {tiendasEncontradas.length > 0 && (
                  <div className="home__resultados-bloque">
                    <h3 className="home__resultados-subtitulo">Tiendas</h3>
                    <div className="home__tiendas-grid">
                      {tiendasEncontradas.map((tienda) => (
                        <TiendaCard key={tienda.id} tienda={tienda} />
                      ))}
                    </div>
                  </div>
                )}

                {productosEncontrados.length > 0 && (
                  <div className="home__resultados-bloque">
                    <h3 className="home__resultados-subtitulo">Productos</h3>
                    <div className="home__productos-grid">
                      {productosEncontrados.map((producto) => (
                        <HomeProductCard
                          key={`${producto.tiendaId}-${producto.id}`}
                          producto={producto}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        ) : (
          <>
            <section className="home__section home__hero-section">
              <Hero />
            </section>

            {categorias.length > 0 && (
              <section className="home__section" aria-label="Categorías">
                <QuickAccessStrip
                  categorias={categorias}
                  seleccionada={categoria}
                  onSeleccionar={setCategoria}
                />
              </section>
            )}

            <section className="home__section">
              <MisActividadReciente />
            </section>

            {interesar.length > 0 && (
              <section className="home__section">
                <ProductRail titulo="Te puede interesar..." productos={interesar} />
              </section>
            )}

            {tendencia.length > 0 && (
              <section className="home__section">
                <ProductRail titulo="Mira los productos en tendencia" productos={tendencia} />
              </section>
            )}

            <section className="home__section" id="home-tiendas" aria-label="Tiendas">
              <div className="home__tiendas-header">
                <h2 className="home__section-titulo">
                  {categoria ? `Tiendas de ${categoria}` : 'Explora las tiendas'}
                </h2>
                {categoria && (
                  <button
                    type="button"
                    className="home__limpiar-filtro"
                    onClick={() => setCategoria(null)}
                  >
                    Ver todas
                  </button>
                )}
              </div>

              {loading && <StatusMessage variant="loading" title="Cargando tiendas..." />}

              {!loading && error && (
                <StatusMessage
                  variant="error"
                  title="No pudimos cargar las tiendas"
                  description="Revisá tu conexión e intentá de nuevo."
                />
              )}

              {!loading && !error && tiendasPorCategoria.length === 0 && (
                <StatusMessage variant="empty" title="No hay tiendas disponibles por ahora" />
              )}

              {!loading && !error && tiendasPorCategoria.length > 0 && (
                <div className="home__tiendas-grid">
                  {tiendasPorCategoria.map((tienda) => (
                    <TiendaCard key={tienda.id} tienda={tienda} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <Footer />
    </>
  )
}
