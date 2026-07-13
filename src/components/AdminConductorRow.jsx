import { useState } from 'react'
import ToggleSwitch from './ToggleSwitch'
import './AdminConductorRow.css'

const VEHICULOS = [
  { value: 'moto', label: 'Moto' },
  { value: 'carro', label: 'Carro' },
]

// Perfil público editable del conductor (placa, fotos, tipo de vehículo —
// spec/08 §1). Es un form desplegable con estado propio (no sube por props al
// padre) porque no necesita coordinarse con el resto del tab admin: al
// guardar, useAllConductores (onSnapshot) refleja el cambio solo, sin pedirle
// un refetch a AdminPage.
export default function AdminConductorRow({ conductor, updating, onToggle }) {
  const [editando, setEditando] = useState(false)
  const [placa, setPlaca] = useState(conductor.placa ?? '')
  const [fotoPerfilUrl, setFotoPerfilUrl] = useState(conductor.fotoPerfilUrl ?? '')
  const [motoFotoUrl, setMotoFotoUrl] = useState(conductor.motoFotoUrl ?? '')
  const [vehiculo, setVehiculo] = useState(conductor.vehiculo ?? 'moto')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState(null)
  const [guardadoOk, setGuardadoOk] = useState(false)

  async function handleGuardar(event) {
    event.preventDefault()
    setGuardando(true)
    setErrorGuardar(null)
    setGuardadoOk(false)
    try {
      const response = await fetch('/api/admin-editar-conductor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conductorUid: conductor.id,
          placa: placa.trim(),
          fotoPerfilUrl: fotoPerfilUrl.trim(),
          motoFotoUrl: motoFotoUrl.trim(),
          vehiculo,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || `POST /api/admin-editar-conductor respondió ${response.status}`)
      }
      setGuardadoOk(true)
      setEditando(false)
    } catch {
      setErrorGuardar('No pudimos guardar los cambios. Revisá tu conexión e intentá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <li className="admin-conductor-row">
      <div className="admin-conductor-row__principal">
        <div className="admin-conductor-row__info">
          <h3>{conductor.nombre ?? conductor.id}</h3>
          {conductor.telefono && <p className="admin-conductor-row__telefono">{conductor.telefono}</p>}
        </div>
        <ToggleSwitch
          checked={!!conductor.cuotaSemanalPagada}
          disabled={updating}
          onChange={onToggle}
          label={conductor.cuotaSemanalPagada ? 'Cuota pagada' : 'Cuota pendiente'}
        />
      </div>

      <button
        type="button"
        className="admin-conductor-row__editar-toggle"
        onClick={() => setEditando((v) => !v)}
        aria-expanded={editando}
      >
        {editando ? 'Ocultar perfil' : 'Editar perfil (foto, placa, vehículo)'}
      </button>

      {guardadoOk && !editando && (
        <p className="admin-conductor-row__ok" role="status">
          Perfil actualizado.
        </p>
      )}

      {editando && (
        <form className="admin-conductor-row__form" onSubmit={handleGuardar}>
          <label className="admin-conductor-row__campo">
            <span>Placa</span>
            <input
              type="text"
              value={placa}
              onChange={(event) => setPlaca(event.target.value)}
              placeholder="Ej: AB123CD"
              maxLength={12}
              disabled={guardando}
            />
          </label>

          <label className="admin-conductor-row__campo">
            <span>Foto de perfil (URL)</span>
            <div className="admin-conductor-row__campo-fila">
              <input
                type="url"
                value={fotoPerfilUrl}
                onChange={(event) => setFotoPerfilUrl(event.target.value)}
                placeholder="https://..."
                disabled={guardando}
              />
              {/* Preview inmediato: le ahorra al admin cargar la pantalla del
                  conductor solo para descubrir que pegó una URL rota. */}
              {fotoPerfilUrl && (
                <img
                  className="admin-conductor-row__preview"
                  src={fotoPerfilUrl}
                  alt="Vista previa de la foto de perfil"
                  onError={(e) => {
                    e.currentTarget.style.visibility = 'hidden'
                  }}
                  onLoad={(e) => {
                    e.currentTarget.style.visibility = 'visible'
                  }}
                />
              )}
            </div>
          </label>

          <label className="admin-conductor-row__campo">
            <span>Foto de la moto/carro (URL)</span>
            <div className="admin-conductor-row__campo-fila">
              <input
                type="url"
                value={motoFotoUrl}
                onChange={(event) => setMotoFotoUrl(event.target.value)}
                placeholder="https://..."
                disabled={guardando}
              />
              {motoFotoUrl && (
                <img
                  className="admin-conductor-row__preview admin-conductor-row__preview--vehiculo"
                  src={motoFotoUrl}
                  alt="Vista previa del vehículo"
                  onError={(e) => {
                    e.currentTarget.style.visibility = 'hidden'
                  }}
                  onLoad={(e) => {
                    e.currentTarget.style.visibility = 'visible'
                  }}
                />
              )}
            </div>
          </label>

          <label className="admin-conductor-row__campo">
            <span>Vehículo</span>
            <select
              value={vehiculo}
              onChange={(event) => setVehiculo(event.target.value)}
              disabled={guardando}
            >
              {VEHICULOS.map((opcion) => (
                <option key={opcion.value} value={opcion.value}>
                  {opcion.label}
                </option>
              ))}
            </select>
          </label>

          {errorGuardar && (
            <p className="admin-conductor-row__error" role="alert">
              {errorGuardar}
            </p>
          )}

          <div className="admin-conductor-row__form-acciones">
            <button type="button" onClick={() => setEditando(false)} disabled={guardando}>
              Cancelar
            </button>
            <button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}
    </li>
  )
}
