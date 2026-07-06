import ToggleSwitch from './ToggleSwitch'
import './AdminConductorRow.css'

export default function AdminConductorRow({ conductor, updating, onToggle }) {
  return (
    <li className="admin-conductor-row">
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
    </li>
  )
}
