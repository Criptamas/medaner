import { useState } from 'react'
import './FavoritaForm.css'

const ICONOS_TITULO = { Hogar: '🏠', Trabajo: '💼', Universidad: '🎓', Personalizado: '❤️' }
const OPCIONES_TITULO = ['Hogar', 'Trabajo', 'Universidad', 'Personalizado']

// Form de crear/editar una dirección favorita, extraído de DestinoViajeStep
// (vista interna 'formulario' de ese componente viejo). Ahora es la vista de
// nivel página 'favorita-form' de PedirViajePage: se llega acá desde
// DireccionesFavoritasList tocando "Editar" (favoritaInicial con datos ya
// cargados) o "Agregar nueva dirección" (pasa primero por la vista 'mapa'
// para fijar el pin — puntoInicial trae esas coordenadas ya elegidas).
export default function FavoritaForm({
  modo,
  favoritaInicial,
  puntoInicial,
  crear,
  actualizar,
  onGuardado,
  onCancelar,
  onEditarExistente,
}) {
  const [campoTitulo, setCampoTitulo] = useState(favoritaInicial?.titulo ?? 'Hogar')
  const [campoEtiqueta, setCampoEtiqueta] = useState(favoritaInicial?.etiqueta_personalizada ?? '')
  const [campoDescripcion, setCampoDescripcion] = useState(
    favoritaInicial?.descripcion ?? puntoInicial?.referencia ?? '',
  )
  const [campoDireccionTexto, setCampoDireccionTexto] = useState(
    favoritaInicial?.direccion_texto ?? puntoInicial?.nombre ?? '',
  )
  const [campoLat] = useState(favoritaInicial?.lat ?? puntoInicial?.lat ?? null)
  const [campoLng] = useState(favoritaInicial?.lng ?? puntoInicial?.lng ?? null)
  const [avisoDuplicado, setAvisoDuplicado] = useState(null)
  const [errorFormulario, setErrorFormulario] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function handleGuardar(event) {
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
      if (modo === 'editar') {
        await actualizar(favoritaInicial.id, {
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
      onGuardado()
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
    <form className="favorita-form" onSubmit={handleGuardar}>
      <label className="favorita-form__campo">
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
        <label className="favorita-form__campo">
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

      <label className="favorita-form__campo">
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

      <label className="favorita-form__campo">
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
        <div className="favorita-form__aviso-duplicado" role="alert">
          <p>
            Ya tenés una dirección de tipo &quot;{campoTitulo}&quot; guardada
            {avisoDuplicado.favoritaExistente?.direccion_texto
              ? ` (${avisoDuplicado.favoritaExistente.direccion_texto})`
              : ''}
            . ¿Querés editarla en su lugar?
          </p>
          {avisoDuplicado.favoritaExistente && onEditarExistente && (
            <button type="button" onClick={() => onEditarExistente(avisoDuplicado.favoritaExistente)}>
              Editar esa dirección
            </button>
          )}
        </div>
      )}

      {errorFormulario && (
        <p className="favorita-form__error" role="alert">
          {errorFormulario}
        </p>
      )}

      <div className="favorita-form__acciones">
        <button type="button" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </button>
        <button type="submit" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
