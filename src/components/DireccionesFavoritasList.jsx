import { useState } from 'react'
import { useClienteAuth } from '../hooks/useClienteAuth'
import './DireccionesFavoritasList.css'

const ICONOS_TITULO = { Hogar: '🏠', Trabajo: '💼', Universidad: '🎓', Personalizado: '❤️' }

function nombreFavorita(favorita) {
  return favorita.titulo === 'Personalizado' ? favorita.etiqueta_personalizada : favorita.titulo
}

// Lista de direcciones favoritas del cliente, extraída de DestinoViajeStep
// (que antes SOLO se usaba en el paso de destino del wizard viejo). Ahora se
// reutiliza para completar tanto Origen como Destino desde la pantalla única
// de SolicitudViajeView — quién es "el campo activo" lo decide el padre
// (PedirViajePage), acá solo se avisa qué favorita se tocó.
//
// El CRUD (favoritas/crear/actualizar/eliminar) se recibe por props en vez de
// llamar a useDireccionesFavoritas() acá adentro: ese hook también lo necesita
// FavoritaForm (vista 'favorita-form', hermana de esta en el árbol, no hija),
// así que se levanta una sola vez en PedirViajePage y se comparte — evita
// duplicar el fetch cada vez que se monta/desmonta cualquiera de las dos vistas.
export default function DireccionesFavoritasList({
  favoritas,
  loading,
  error,
  refetch,
  eliminar,
  onSeleccionar,
  onEditar,
  onAgregarNueva,
}) {
  const { user, loading: authLoading } = useClienteAuth()
  const [menuAbiertoId, setMenuAbiertoId] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)

  async function handleEliminar(id) {
    setMenuAbiertoId(null)
    if (!window.confirm('¿Eliminar esta dirección favorita?')) return
    setErrorAccion(null)
    try {
      await eliminar(id)
    } catch (err) {
      console.error('No se pudo eliminar la dirección favorita:', err)
      setErrorAccion('No se pudo eliminar la dirección. Intentá de nuevo.')
    }
  }

  return (
    <div className="direcciones-favoritas-list">
      <p className="direcciones-favoritas-list__titulo">Direcciones favoritas</p>

      {authLoading && (
        <div className="direcciones-favoritas-list__skeleton" aria-hidden="true">
          <div className="direcciones-favoritas-list__skeleton-item" />
          <div className="direcciones-favoritas-list__skeleton-item" />
        </div>
      )}

      {!authLoading && !user && (
        <p className="direcciones-favoritas-list__sin-sesion">
          Iniciá sesión para guardar tus direcciones favoritas y elegirlas en un toque.
        </p>
      )}

      {!authLoading && user && loading && (
        <div className="direcciones-favoritas-list__skeleton" aria-hidden="true">
          <div className="direcciones-favoritas-list__skeleton-item" />
          <div className="direcciones-favoritas-list__skeleton-item" />
        </div>
      )}

      {!authLoading && user && !loading && error && (
        <div className="direcciones-favoritas-list__error-carga">
          <p>No pudimos cargar tus direcciones guardadas.</p>
          <button type="button" onClick={refetch}>
            Reintentar
          </button>
        </div>
      )}

      {!authLoading && user && !loading && !error && (
        <>
          {favoritas.map((favorita) => (
            <div
              key={favorita.id}
              className="direcciones-favoritas-list__tarjeta"
              role="button"
              tabIndex={0}
              onClick={() => onSeleccionar(favorita)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSeleccionar(favorita)
                }
              }}
            >
              <span className="direcciones-favoritas-list__tarjeta-icono" aria-hidden="true">
                {ICONOS_TITULO[favorita.titulo]}
              </span>
              <span className="direcciones-favoritas-list__tarjeta-info">
                <span className="direcciones-favoritas-list__tarjeta-nombre">{nombreFavorita(favorita)}</span>
                <span className="direcciones-favoritas-list__tarjeta-direccion">{favorita.direccion_texto}</span>
              </span>
              <button
                type="button"
                className="direcciones-favoritas-list__tarjeta-menu-btn"
                aria-haspopup="true"
                aria-expanded={menuAbiertoId === favorita.id}
                aria-label="Más opciones"
                onClick={(event) => {
                  event.stopPropagation()
                  setMenuAbiertoId((actual) => (actual === favorita.id ? null : favorita.id))
                }}
              >
                ⋮
              </button>

              {menuAbiertoId === favorita.id && (
                <div className="direcciones-favoritas-list__menu-popover" onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuAbiertoId(null)
                      onEditar(favorita)
                    }}
                  >
                    Editar
                  </button>
                  <button type="button" onClick={() => handleEliminar(favorita.id)}>
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}

          {menuAbiertoId && (
            <button
              type="button"
              className="direcciones-favoritas-list__menu-backdrop"
              aria-label="Cerrar menú"
              onClick={() => setMenuAbiertoId(null)}
            />
          )}

          {errorAccion && (
            <p className="direcciones-favoritas-list__error" role="alert">
              {errorAccion}
            </p>
          )}

          <button type="button" className="direcciones-favoritas-list__agregar-nueva" onClick={onAgregarNueva}>
            <span className="direcciones-favoritas-list__agregar-nueva-icono" aria-hidden="true">
              +
            </span>
            Agregar nueva dirección
          </button>
        </>
      )}
    </div>
  )
}
