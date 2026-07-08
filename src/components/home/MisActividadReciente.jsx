import { useState } from 'react'
import MisPedidosRecientes from '../MisPedidosRecientes'
import RecuperarPedidos from '../RecuperarPedidos'
import './MisActividadReciente.css'

// Wrapper de Home para el seguimiento de actividad del cliente (sin login).
// Reutiliza TAL CUAL la lógica existente:
//  - MisPedidosRecientes: lee medaner_pedidos_activos de localStorage (TTL 24h)
//    y escucha en vivo el estado de cada pedido/viaje. Se auto-oculta si no hay
//    nada activo.
//  - RecuperarPedidos: recupera pedidos/viajes por teléfono si se perdió el
//    localStorage.
// La única glue acá es el refreshKey: MisPedidosRecientes solo lee localStorage
// al montar, así que cuando RecuperarPedidos reinyecta resultados forzamos su
// remount vía `key`. (Antes vivía en StoreListPage.)
export default function MisActividadReciente() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="mis-actividad">
      <MisPedidosRecientes key={refreshKey} />
      <RecuperarPedidos onRecuperados={() => setRefreshKey((key) => key + 1)} />
    </div>
  )
}
