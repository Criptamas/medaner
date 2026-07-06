import ToggleSwitch from './ToggleSwitch'
import './AdminTiendaRow.css'

export default function AdminTiendaRow({ tienda, updating, onToggle }) {
  return (
    <li className="admin-tienda-row">
      <div className="admin-tienda-row__info">
        <h3>{tienda.nombre}</h3>
        {tienda.categoria && <span className="admin-tienda-row__categoria">{tienda.categoria}</span>}
      </div>
      <ToggleSwitch
        checked={!!tienda.activa}
        disabled={updating}
        onChange={onToggle}
        label={tienda.activa ? 'Activa' : 'Inactiva'}
      />
    </li>
  )
}
