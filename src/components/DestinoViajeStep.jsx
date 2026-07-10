import { useState } from 'react'
import SelectorUbicacion from './SelectorUbicacion'
import { useClienteAuth } from '../hooks/useClienteAuth'
import { useDireccionesFavoritas } from '../hooks/useDireccionesFavoritas'
import './DestinoViajeStep.css'

const ICONOS_TITULO = { Hogar: '🏠', Trabajo: '💼', Universidad: '🎓', Personalizado: '❤️' }
const OPCIONES_TITULO = ['Hogar', 'Trabajo', 'Universidad', 'Personalizado']

function nombreFavorita(favorita) {
  return favorita.titulo === 'Personalizado' ? favorita.etiqueta_personalizada : favorita.titulo
}

// Reemplaza a UbicacionViajeStep SOLO para el paso de destino: además del
// mapa libre (mismo flujo de siempre), agrega una lista de "direcciones
// favoritas" guardadas por el cliente logueado (Hogar/Trabajo/Universidad/
// Personalizado) para no tener que repetir pin + referencia en cada viaje.
// El paso de origen sigue usando UbicacionViajeStep tal cual — decisión de
// producto ya tomada, no se toca acá.
//
// Misma interfaz de entrada/salida que UbicacionViajeStep (titulo/value/
// onConfirmar) para que el punto de enganche en PedirViajePage sea mínimo.
//
// Navegación interna en 3 vistas (no son pasos del wizard, viven y mueren
// acá): 'lista' (favoritas + accesos a mapa) -> 'mapa' (SelectorUbicacion,
// reusado tal cual) -> 'formulario' (guardar/editar una favorita).
export default function DestinoViajeStep({ titulo, value, onConfirmar }) {
  const { user, loading: authLoading } = useClienteAuth()
  const { favoritas, loading: favoritasLoading, error: favoritasError, crear, actualizar, eliminar, refetch } =
    useDireccionesFavoritas()

  // Si ya había una selección previa (el cliente volvió atrás en el wizard),
  // arrancamos directo en el mapa con ese pin restaurado — mismo comportamiento
  // que tenía UbicacionViajeStep, para no perder la selección al ir y volver.
  const [vista, setVista] = useState(value ? 'mapa' : 'lista')
  // 'usar-directo': el resultado del mapa se confirma tal cual como destino.
  // 'guardar-nueva': el resultado del mapa pasa al formulario para guardarse
  // como favorita antes de (opcionalmente) usarse.
  const [mapaModo, setMapaModo] = useState('usar-directo')
  const [seleccionMapa, setSeleccionMapa] = useState(value ?? null)

  const [menuAbiertoId, setMenuAbiertoId] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)

  const [modoFormulario, setModoFormulario] = useState('crear') // 'crear' | 'editar'
  const [editandoId, setEditandoId] = useState(null)
  const [campoTitulo, setCampoTitulo] = useState('Hogar')
  const [campoEtiqueta, setCampoEtiqueta] = useState('')
  const [campoDescripcion, setCampoDescripcion] = useState('')
  const [campoDireccionTexto, setCampoDireccionTexto] = useState('')
  const [campoLat, setCampoLat] = useState(null)
  const [campoLng, setCampoLng] = useState(null)
  const [avisoDuplicado, setAvisoDuplicado] = useState(null)
  const [errorFormulario, setErrorFormulario] = useState(null)
  const [guardando, setGuardando] = useState(false)

  function seleccionarFavorita(favorita) {
    // La favorita ya trae su propia descripción cargada por el usuario al
    // guardarla: no hace falta pasar por un botón "Confirmar" aparte, tocar
    // la tarjeta ya alcanza (mismo shape que espera PedirViajePage/useCreateViaje).
    onConfirmar({
      lat: favorita.lat,
      lng: favorita.lng,
      nombre: favorita.direccion_texto,
      referencia: favorita.descripcion,
    })
  }

  function irAAgregarNueva() {
    setMapaModo('guardar-nueva')
    setSeleccionMapa(null)
    setVista('mapa')
  }

  function irAMapaLibre() {
    setMapaModo('usar-directo')
    setSeleccionMapa(value ?? null)
    setVista('mapa')
  }

  function prepararFormularioNuevo(seleccion) {
    setModoFormulario('crear')
    setEditandoId(null)
    setCampoTitulo('Hogar')
    setCampoEtiqueta('')
    setCampoDescripcion(seleccion?.referencia ?? '')
    setCampoDireccionTexto(seleccion?.nombre ?? '')
    setCampoLat(seleccion?.lat ?? null)
    setCampoLng(seleccion?.lng ?? null)
    setAvisoDuplicado(null)
    setErrorFormulario(null)
    setVista('formulario')
  }

  function iniciarEdicion(favorita) {
    setModoFormulario('editar')
    setEditandoId(favorita.id)
    setCampoTitulo(favorita.titulo)
    setCampoEtiqueta(favorita.etiqueta_personalizada ?? '')
    setCampoDescripcion(favorita.descripcion)
    setCampoDireccionTexto(favorita.direccion_texto)
    setCampoLat(favorita.lat)
    setCampoLng(favorita.lng)
    setAvisoDuplicado(null)
    setErrorFormulario(null)
    setMenuAbiertoId(null)
    setVista('formulario')
  }

  function handleConfirmarMapa() {
    if (mapaModo === 'guardar-nueva') {
      prepararFormularioNuevo(seleccionMapa)
    } else {
      onConfirmar(seleccionMapa)
    }
  }

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

  async function handleGuardarFormulario(event) {
    event.preventDefault()
    setErrorFormulario(null)
    setAvisoDuplicado(null)

    if (campoTitulo === 'Personalizado' && !campoEtiqueta.trim()) {
      setErrorFormulario('Escribí un nombre para esta dirección personalizada.')
      return
    }
    if (!campoDescripcion.trim()) {
      setErrorFormulario('La descripción es obligatoria: tu conductor no ve mapa, depende de este texto.')
      return
    }

    setGuardando(true)
    try {
      if (modoFormulario === 'editar') {
        await actualizar(editandoId, {
          titulo: campoTitulo,
          etiquetaPersonalizada: campoTitulo === 'Personalizado' ? campoEtiqueta.trim() : null,
          descripcion: campoDescripcion.trim(),
          direccionTexto: campoDireccionTexto.trim(),
        })
      } else {
        await crear({
          titulo: campoTitulo,
          etiquetaPersonalizada: campoEtiqueta.trim(),
          descripcion: campoDescripcion.trim(),
          direccionTexto: campoDireccionTexto.trim(),
          lat: campoLat,
          lng: campoLng,
        })
      }
      // Guardar y seleccionar son acciones separadas a propósito: el usuario
      // vuelve a la lista y tiene que tocar la tarjeta si quiere usarla ahora.
      setVista('lista')
    } catch (err) {
      if (err.code === 'DUPLICADO') {
        setAvisoDuplicado(err)
      } else {
        console.error('No se pudo guardar la dirección favorita:', err)
        setErrorFormulario('No se pudo guardar la dirección. Intentá de nuevo.')
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="destino-viaje-step">
      {vista !== 'lista' && (
        <button type="button" className="destino-viaje-step__volver" onClick={() => setVista('lista')}>
          ← Volver
        </button>
      )}

      {/* En 'formulario' el prompt del wizard ("¿A dónde vas?") no aplica —
          ahí el objetivo es guardar/editar una favorita, no elegir destino —
          así que se reemplaza por un título propio de esa vista. */}
      {vista !== 'formulario' && <p className="destino-viaje-step__prompt">{titulo}</p>}
      {vista === 'formulario' && (
        <p className="destino-viaje-step__prompt">
          {modoFormulario === 'editar' ? 'Editar dirección' : 'Guardar dirección'}
        </p>
      )}

      {vista === 'lista' && (
        <div className="destino-viaje-step__lista">
          {authLoading && (
            <div className="destino-viaje-step__skeleton" aria-hidden="true">
              <div className="destino-viaje-step__skeleton-item" />
              <div className="destino-viaje-step__skeleton-item" />
            </div>
          )}

          {!authLoading && !user && (
            <p className="destino-viaje-step__sin-sesion">
              Iniciá sesión para guardar tus direcciones favoritas y elegirlas en un toque.
            </p>
          )}

          {!authLoading && user && favoritasLoading && (
            <div className="destino-viaje-step__skeleton" aria-hidden="true">
              <div className="destino-viaje-step__skeleton-item" />
              <div className="destino-viaje-step__skeleton-item" />
            </div>
          )}

          {!authLoading && user && !favoritasLoading && favoritasError && (
            <div className="destino-viaje-step__error-carga">
              <p>No pudimos cargar tus direcciones guardadas.</p>
              <button type="button" onClick={refetch}>
                Reintentar
              </button>
            </div>
          )}

          {!authLoading && user && !favoritasLoading && !favoritasError && (
            <>
              {favoritas.map((favorita) => (
                <div
                  key={favorita.id}
                  className="destino-viaje-step__tarjeta"
                  role="button"
                  tabIndex={0}
                  onClick={() => seleccionarFavorita(favorita)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      seleccionarFavorita(favorita)
                    }
                  }}
                >
                  <span className="destino-viaje-step__tarjeta-icono" aria-hidden="true">
                    {ICONOS_TITULO[favorita.titulo]}
                  </span>
                  <span className="destino-viaje-step__tarjeta-info">
                    <span className="destino-viaje-step__tarjeta-nombre">{nombreFavorita(favorita)}</span>
                    <span className="destino-viaje-step__tarjeta-direccion">{favorita.direccion_texto}</span>
                  </span>
                  <button
                    type="button"
                    className="destino-viaje-step__tarjeta-menu-btn"
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
                    <div className="destino-viaje-step__menu-popover" onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => iniciarEdicion(favorita)}>
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
                  className="destino-viaje-step__menu-backdrop"
                  aria-label="Cerrar menú"
                  onClick={() => setMenuAbiertoId(null)}
                />
              )}

              {errorAccion && (
                <p className="destino-viaje-step__error" role="alert">
                  {errorAccion}
                </p>
              )}

              <button type="button" className="destino-viaje-step__agregar-nueva" onClick={irAAgregarNueva}>
                <span className="destino-viaje-step__agregar-nueva-icono" aria-hidden="true">
                  +
                </span>
                Agregar nueva dirección
              </button>
            </>
          )}

          <button type="button" className="destino-viaje-step__mapa-libre" onClick={irAMapaLibre}>
            📍 Establecer ubicación en el mapa
          </button>
        </div>
      )}

      {vista === 'mapa' && (
        <div className="destino-viaje-step__mapa-vista">
          <SelectorUbicacion
            initialLat={seleccionMapa?.lat}
            initialLng={seleccionMapa?.lng}
            initialNombre={seleccionMapa?.nombre}
            initialReferencia={seleccionMapa?.referencia}
            onLocationSelected={(lat, lng, nombre, referencia) => setSeleccionMapa({ lat, lng, nombre, referencia })}
          />

          {/* Mismo criterio de habilitación que UbicacionViajeStep: sin
              referencia manual no hay confirmación posible, el conductor no
              ve mapa y depende de ese texto. */}
          <div className="destino-viaje-step__mapa-acciones">
            <button
              type="button"
              className="destino-viaje-step__confirmar"
              disabled={!seleccionMapa || !seleccionMapa.referencia?.trim()}
              onClick={handleConfirmarMapa}
            >
              Confirmar ubicación
            </button>

            {user && mapaModo === 'usar-directo' && (
              <button
                type="button"
                className="destino-viaje-step__guardar-secundario"
                disabled={!seleccionMapa || !seleccionMapa.referencia?.trim()}
                onClick={() => prepararFormularioNuevo(seleccionMapa)}
              >
                Guardar como favorita
              </button>
            )}
          </div>
        </div>
      )}

      {vista === 'formulario' && (
        <form className="destino-viaje-step__formulario" onSubmit={handleGuardarFormulario}>
          <label className="destino-viaje-step__campo">
            <span>Tipo</span>
            <select value={campoTitulo} onChange={(event) => setCampoTitulo(event.target.value)}>
              {OPCIONES_TITULO.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {ICONOS_TITULO[opcion]} {opcion}
                </option>
              ))}
            </select>
          </label>

          {campoTitulo === 'Personalizado' && (
            <label className="destino-viaje-step__campo">
              <span>Nombre</span>
              <input
                type="text"
                value={campoEtiqueta}
                onChange={(event) => setCampoEtiqueta(event.target.value)}
                placeholder="Ej: Casa de mamá"
                maxLength={40}
                required
              />
            </label>
          )}

          <label className="destino-viaje-step__campo">
            <span>Descripción (para el conductor)</span>
            <textarea
              value={campoDescripcion}
              onChange={(event) => setCampoDescripcion(event.target.value)}
              placeholder="Calle, avenida, punto conocido..."
              rows={3}
              maxLength={160}
              required
            />
          </label>

          <label className="destino-viaje-step__campo">
            <span>Dirección</span>
            <input
              type="text"
              value={campoDireccionTexto}
              onChange={(event) => setCampoDireccionTexto(event.target.value)}
              placeholder="Dirección geocodificada"
              maxLength={160}
            />
          </label>

          {avisoDuplicado && (
            <div className="destino-viaje-step__aviso-duplicado" role="alert">
              <p>
                Ya tenés una dirección de tipo &quot;{campoTitulo}&quot; guardada
                {avisoDuplicado.favoritaExistente?.direccion_texto
                  ? ` (${avisoDuplicado.favoritaExistente.direccion_texto})`
                  : ''}
                . ¿Querés editarla en su lugar?
              </p>
              <button
                type="button"
                onClick={() => avisoDuplicado.favoritaExistente && iniciarEdicion(avisoDuplicado.favoritaExistente)}
              >
                Editar esa dirección
              </button>
            </div>
          )}

          {errorFormulario && (
            <p className="destino-viaje-step__error" role="alert">
              {errorFormulario}
            </p>
          )}

          <div className="destino-viaje-step__formulario-acciones">
            <button type="button" onClick={() => setVista('lista')} disabled={guardando}>
              Cancelar
            </button>
            <button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
