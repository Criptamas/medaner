import { useState } from 'react'
import { agregarPedidoActivo } from '../utils/seguimientoLocal'
import './RecuperarPedidos.css'

// Red de respaldo para clientes sin cuenta: "Mis pedidos recientes" (ver
// MisPedidosRecientes / utils/seguimientoLocal) vive en localStorage, así
// que si el cliente cambia de dispositivo o borra caché pierde el rastro
// aunque el pedido/viaje siga activo en Firestore. Esta sección lo busca
// por teléfono contra /api/recuperar-pedidos y lo reinyecta en el registro
// local para que vuelva a aparecer.
//
// El teléfono se manda tal cual lo escribió el cliente: el server es quien
// normaliza y valida (contrato de /api/recuperar-pedidos), acá no se toca.
export default function RecuperarPedidos({ onRecuperados }) {
  const [abierto, setAbierto] = useState(false)
  const [telefono, setTelefono] = useState('')
  // idle | cargando | error | invalido | vacio | exito
  const [estado, setEstado] = useState('idle')

  const cargando = estado === 'cargando'

  function handleAbrir() {
    setAbierto(true)
    setEstado('idle')
  }

  function handleCancelar() {
    setAbierto(false)
    setEstado('idle')
  }

  function handleBuscarOtro() {
    setTelefono('')
    setEstado('idle')
    setAbierto(true)
  }

  async function handleBuscar(event) {
    event.preventDefault()
    if (cargando || telefono.trim() === '') return

    setEstado('cargando')
    try {
      const respuesta = await fetch('/api/recuperar-pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono }),
      })

      if (respuesta.status === 400) {
        setEstado('invalido')
        return
      }
      if (!respuesta.ok) {
        setEstado('error')
        return
      }

      const data = await respuesta.json()
      const resultados = Array.isArray(data?.resultados) ? data.resultados : []

      if (resultados.length === 0) {
        setEstado('vacio')
        return
      }

      // Reinyecta cada resultado en el registro local: MisPedidosRecientes
      // solo lee localStorage al montar, por eso StoreListPage necesita
      // forzar su remount vía onRecuperados (ver prop `key`).
      resultados.forEach(({ id, tipo }) => agregarPedidoActivo({ id, tipo }))
      setEstado('exito')
      setAbierto(false)
      onRecuperados?.()
    } catch {
      // Sin conexión, timeout u otra falla de red: no rompemos la página,
      // solo mostramos el error inline y dejamos reintentar.
      setEstado('error')
    }
  }

  if (!abierto) {
    if (estado === 'exito') {
      return (
        <div className="recuperar-pedidos recuperar-pedidos--colapsado">
          <p className="recuperar-pedidos__exito">¡Listo! Acá están tus pedidos.</p>
          <button type="button" className="recuperar-pedidos__link" onClick={handleBuscarOtro}>
            Buscar otro número
          </button>
        </div>
      )
    }

    return (
      <div className="recuperar-pedidos recuperar-pedidos--colapsado">
        <button type="button" className="recuperar-pedidos__link" onClick={handleAbrir}>
          ¿Hiciste un pedido y no lo ves acá? Buscalo con tu teléfono
        </button>
      </div>
    )
  }

  return (
    <form className="recuperar-pedidos" onSubmit={handleBuscar}>
      <label className="recuperar-pedidos__field">
        <span>Buscar por teléfono</span>
        <input
          type="tel"
          inputMode="tel"
          placeholder="0412-1234567"
          value={telefono}
          onChange={(event) => setTelefono(event.target.value)}
          disabled={cargando}
          autoFocus
        />
      </label>

      <div className="recuperar-pedidos__acciones">
        <button
          type="submit"
          className="recuperar-pedidos__submit"
          disabled={cargando || telefono.trim() === ''}
        >
          {cargando ? 'Buscando...' : 'Buscar'}
        </button>
        <button
          type="button"
          className="recuperar-pedidos__cancelar"
          onClick={handleCancelar}
          disabled={cargando}
        >
          Cancelar
        </button>
      </div>

      {estado === 'error' && (
        <p className="recuperar-pedidos__mensaje recuperar-pedidos__mensaje--error" role="alert">
          No pudimos buscar tus pedidos. Revisá tu conexión e intentá de nuevo.
        </p>
      )}
      {estado === 'invalido' && (
        <p className="recuperar-pedidos__mensaje recuperar-pedidos__mensaje--error" role="alert">
          Ese número no parece válido. Escribilo como 0412-1234567.
        </p>
      )}
      {estado === 'vacio' && (
        <p className="recuperar-pedidos__mensaje" role="status">
          No encontramos pedidos activos con ese número.
        </p>
      )}
    </form>
  )
}
