import { PAYMENT_LABELS } from '../utils/pedidoLabels'
import { formatUSD } from '../utils/tarifas'
import './ViajeResumenDetalle.css'

// Mismo mapa icono+label que ya vive duplicado en varios componentes de viaje
// (ver comentario en CotizacionViajeSheet): se repite acá siguiendo ese patrón
// existente en vez de extraerlo a un archivo compartido (fuera de alcance).
const VEHICULO_LABELS = { moto: 'Moto', carro: 'Carro' }

// Fallback a coordenadas para viajes viejos sin origenNombre/destinoNombre.
function formatCoords(punto) {
  if (!punto) return '—'
  return `${punto.lat?.toFixed(5)}, ${punto.lng?.toFixed(5)}`
}

// Bloque de detalles del viaje (recorrido, vehículo, método de pago y precio),
// reutilizado en las TRES pantallas que lo necesitan: el "Ver detalles" de
// "buscando conductores", el desplegable de "conductor asignado" y el resumen
// del viaje completado. Se estila para la paleta oscura de la feature heredando
// los tokens --vt-* del contenedor .viaje-track — no se usa fuera de ahí.
export default function ViajeResumenDetalle({ viaje }) {
  return (
    <div className="viaje-resumen">
      {/* Recorrido: origen y destino apilados, con los mismos colores que los
          pines del mapa (azul = origen, verde = destino) unidos por una línea
          tipo "ruta". Va a lo ancho porque los nombres pueden ser largos. */}
      <div className="viaje-resumen__recorrido">
        <div className="viaje-resumen__punto viaje-resumen__punto--origen">
          <span className="viaje-resumen__dot" aria-hidden="true" />
          <span>{viaje.origenNombre || formatCoords(viaje.origen)}</span>
        </div>
        <div className="viaje-resumen__punto viaje-resumen__punto--destino">
          <span className="viaje-resumen__dot" aria-hidden="true" />
          <span>{viaje.destinoNombre || formatCoords(viaje.destino)}</span>
        </div>
      </div>

      <dl className="viaje-resumen__filas">
        <div className="viaje-resumen__fila">
          <dt className="viaje-resumen__label">Vehículo</dt>
          <dd className="viaje-resumen__valor">
            {VEHICULO_LABELS[viaje.tipoVehiculo] ?? viaje.tipoVehiculo}
          </dd>
        </div>

        <div className="viaje-resumen__fila">
          <dt className="viaje-resumen__label">Método de pago</dt>
          <dd className="viaje-resumen__valor">
            {PAYMENT_LABELS[viaje.metodoPago] ?? viaje.metodoPago}
          </dd>
        </div>

        {/* precioFinal puede faltar en viajes creados antes de esta feature
            (ver CLAUDE.md): la fila no se muestra en vez de "$NaN". */}
        {viaje.precioFinal != null && (
          <div className="viaje-resumen__fila">
            <dt className="viaje-resumen__label">Precio acordado</dt>
            <dd className="viaje-resumen__valor viaje-resumen__precio">
              {formatUSD(viaje.precioFinal)}
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}
