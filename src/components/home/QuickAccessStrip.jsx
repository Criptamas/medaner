import { iconoDeCategoria } from '../../utils/categorias'
import './QuickAccessStrip.css'

// Tira horizontal de accesos rápidos por categoría (scroll táctil).
// Las categorías salen de valores DISTINTOS de `categoria` en las tiendas
// activas (se calculan en HomePage con categoriasDistintas). Al tocar una,
// se filtra la grilla de tiendas (estado en HomePage). "Todas" limpia el
// filtro. Si no hay categorías, no se renderiza nada.
export default function QuickAccessStrip({ categorias, seleccionada, onSeleccionar }) {
  if (!categorias || categorias.length === 0) return null

  return (
    <nav className="quick-access" aria-label="Categorías de tiendas">
      <ul className="quick-access__list">
        <li>
          <button
            type="button"
            className={`quick-access__item${!seleccionada ? ' quick-access__item--activo' : ''}`}
            aria-pressed={!seleccionada}
            onClick={() => onSeleccionar(null)}
          >
            <span className="quick-access__icon" aria-hidden="true">
              🧭
            </span>
            <span className="quick-access__label">Todas</span>
          </button>
        </li>

        {categorias.map((categoria) => {
          const activa = seleccionada === categoria
          return (
            <li key={categoria}>
              <button
                type="button"
                className={`quick-access__item${activa ? ' quick-access__item--activo' : ''}`}
                aria-pressed={activa}
                onClick={() => onSeleccionar(activa ? null : categoria)}
              >
                <span className="quick-access__icon" aria-hidden="true">
                  {iconoDeCategoria(categoria)}
                </span>
                <span className="quick-access__label">{categoria}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
