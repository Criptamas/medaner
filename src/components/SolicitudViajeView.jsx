import DireccionesFavoritasList from './DireccionesFavoritasList'
import { formatUbicacionCorta } from '../utils/ubicacionTexto'
import './SolicitudViajeView.css'

// Vista inicial de PedirViajePage (sección 3.1 del spec): card de origen/
// destino + direcciones favoritas + botón "Continuar". Los inputs son
// read-only a propósito (actúan como botones): tocarlos no edita texto acá,
// abren la vista 'mapa' (SelectorUbicacion) en PedirViajePage.
export default function SolicitudViajeView({
  origen,
  destino,
  origenResolviendo,
  onEditarOrigen,
  onEditarDestino,
  favoritas,
  favoritasLoading,
  favoritasError,
  favoritasRefetch,
  eliminarFavorita,
  onSeleccionarFavorita,
  onEditarFavorita,
  onAgregarFavorita,
  onContinuar,
}) {
  // Origen: si ya hay lat/lng pero todavía no volvió el reverse geocode (o
  // directamente falló), mostramos "Tu ubicación actual" en vez de coordenadas
  // crudas o dejar el campo vacío — es la misma etiqueta mientras se está
  // resolviendo la posición por GPS. Ver decisión de producto en el resumen:
  // esto ya cuenta como "origen definido" para habilitar Continuar, aunque
  // todavía no tenga una referencia manual escrita (esa se completa si el
  // usuario entra al mapa a precisar el punto).
  const textoOrigen = formatUbicacionCorta(origen) ?? (origen || origenResolviendo ? 'Tu ubicación actual' : null)
  const textoDestino = formatUbicacionCorta(destino)

  const puedeContinuar = origen?.lat != null && origen?.lng != null && destino?.lat != null && destino?.lng != null

  return (
    <div className="solicitud-viaje-view">
      <div className="solicitud-viaje-view__card">
        <button type="button" className="solicitud-viaje-view__campo" onClick={onEditarOrigen}>
          <span className="solicitud-viaje-view__pin solicitud-viaje-view__pin--origen" aria-hidden="true" />
          <span className="solicitud-viaje-view__campo-texto">
            <span className="solicitud-viaje-view__campo-label">Origen</span>
            <span
              className={
                textoOrigen
                  ? 'solicitud-viaje-view__campo-valor'
                  : 'solicitud-viaje-view__campo-valor solicitud-viaje-view__campo-valor--placeholder'
              }
            >
              {textoOrigen ?? 'Punto de partida'}
            </span>
          </span>
        </button>

        <div className="solicitud-viaje-view__conector" aria-hidden="true" />

        <button type="button" className="solicitud-viaje-view__campo" onClick={onEditarDestino}>
          <span className="solicitud-viaje-view__pin solicitud-viaje-view__pin--destino" aria-hidden="true" />
          <span className="solicitud-viaje-view__campo-texto">
            <span className="solicitud-viaje-view__campo-label">Destino</span>
            <span
              className={
                textoDestino
                  ? 'solicitud-viaje-view__campo-valor'
                  : 'solicitud-viaje-view__campo-valor solicitud-viaje-view__campo-valor--placeholder'
              }
            >
              {textoDestino ?? '¿A dónde vas?'}
            </span>
          </span>
        </button>
      </div>

      <DireccionesFavoritasList
        favoritas={favoritas}
        loading={favoritasLoading}
        error={favoritasError}
        refetch={favoritasRefetch}
        eliminar={eliminarFavorita}
        onSeleccionar={onSeleccionarFavorita}
        onEditar={onEditarFavorita}
        onAgregarNueva={onAgregarFavorita}
      />

      <div className="solicitud-viaje-view__spacer" />

      <div className="solicitud-viaje-view__acciones">
        <button
          type="button"
          className="solicitud-viaje-view__continuar"
          disabled={!puedeContinuar}
          onClick={onContinuar}
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
