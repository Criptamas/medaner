import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { leerPedidosActivos, eliminarPedidoActivo } from '../utils/seguimientoLocal'
import { ESTADO_BADGE_LABELS, VIAJE_ESTADO_LABELS } from '../utils/pedidoLabels'
import './MisPedidosRecientes.css'

const COLECCION_POR_TIPO = { pedido: 'pedidos', viaje: 'viajes' }
// Estados terminales por tipo: al alcanzar cualquiera de ellos, la entrada se
// autolimpia del localStorage. Es un Set (no un solo valor) porque un viaje
// tiene DOS finales posibles: "completado" (recorrido cumplido) y "cancelado"
// (cancelado por el cliente antes de que un conductor lo tomara).
const ESTADOS_FINALES_POR_TIPO = {
  pedido: new Set(['entregado']),
  viaje: new Set(['completado', 'cancelado']),
}
const TIPO_INFO = {
  pedido: { icono: '🛵', label: 'Pedido' },
  viaje: { icono: '🚕', label: 'Viaje' },
}

function etiquetaEstado(tipo, estado) {
  const labels = tipo === 'viaje' ? VIAJE_ESTADO_LABELS : ESTADO_BADGE_LABELS
  return labels[estado] ?? estado
}

// Sin cuentas de cliente, el ancla de seguimiento es este navegador
// (ver src/utils/seguimientoLocal.js). Este componente muestra en tiempo
// real los pedidos/viajes que siguen activos según ese registro local.
export default function MisPedidosRecientes() {
  // Se lee una sola vez al montar: un pedido/viaje creado después (en esta
  // misma sesión) aparece cuando el componente se vuelve a montar (por ej.
  // al volver a la pantalla de inicio).
  const [entradas] = useState(() => leerPedidosActivos())
  const [tarjetas, setTarjetas] = useState({})
  const unsubscribersRef = useRef({})

  useEffect(() => {
    entradas.forEach(({ id, tipo }) => {
      const unsubscribe = onSnapshot(
        doc(db, COLECCION_POR_TIPO[tipo], id),
        (snap) => {
          const estado = snap.exists() ? snap.data().estado : null
          const llegoAEstadoFinal = !snap.exists() || ESTADOS_FINALES_POR_TIPO[tipo].has(estado)

          if (llegoAEstadoFinal) {
            // Ya cumplió su ciclo (o el doc no existe): se saca del registro
            // local y se cancela su propio listener, no hace falta seguir
            // escuchando cambios en un pedido/viaje ya finalizado.
            eliminarPedidoActivo(id)
            unsubscribersRef.current[id]?.()
            delete unsubscribersRef.current[id]
            setTarjetas((prev) => {
              const next = { ...prev }
              delete next[id]
              return next
            })
            return
          }

          setTarjetas((prev) => ({ ...prev, [id]: { tipo, estado } }))
        },
        () => {
          // Error del listener (permisos, red): a diferencia del caso "doc
          // no existe", acá NO se elimina la entrada de localStorage — puede
          // ser un fallo transitorio de red y el pedido/viaje seguir vivo.
          // Simplemente no se muestra su card en este montaje; si el
          // usuario recarga y la conexión volvió, se vuelve a intentar.
        },
      )

      unsubscribersRef.current[id] = unsubscribe
    })

    // Al desmontar cancelamos los listeners que sigan activos (los que ya
    // llegaron a estado final se cancelan a sí mismos más arriba).
    return () => {
      Object.values(unsubscribersRef.current).forEach((unsubscribe) => unsubscribe())
      unsubscribersRef.current = {}
    }
    // Solo se ejecuta al montar: "entradas" es el snapshot inicial del
    // localStorage y no debe volver a suscribir en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mantiene el orden original del localStorage en vez del orden en que
  // resolvió cada onSnapshot (que puede variar entre cargas).
  const idsConDatos = entradas.map((entrada) => entrada.id).filter((id) => tarjetas[id])

  if (idsConDatos.length === 0) return null

  return (
    <section className="mis-pedidos-recientes" aria-label="Mis pedidos y viajes recientes">
      <h2 className="mis-pedidos-recientes__titulo">Tus pedidos y viajes activos</h2>
      <ul className="mis-pedidos-recientes__list">
        {idsConDatos.map((id) => {
          const tarjeta = tarjetas[id]
          // Guard defensivo: entre el cálculo de idsConDatos y este render
          // la entrada pudo eliminarse (ej. llegó a estado final). Sin esto
          // se rompería al desestructurar un valor undefined.
          if (!tarjeta) return null

          const { tipo, estado } = tarjeta
          const info = TIPO_INFO[tipo]
          return (
            <li key={id}>
              <Link to={`/${tipo}/${id}`} className="mis-pedidos-recientes__card">
                <span className="mis-pedidos-recientes__tipo">
                  {info.icono} {info.label}
                </span>
                <span className="mis-pedidos-recientes__badge">
                  {etiquetaEstado(tipo, estado)}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
