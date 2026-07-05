import LogoutButton from '../components/LogoutButton'
import './ConductorPage.css'

export default function ConductorPage() {
  return (
    <div className="conductor-page">
      <header className="conductor-page__header">
        <h1>Vista del conductor</h1>
        <LogoutButton />
      </header>
      <p>Próximamente: pedidos asignados y estado de entregas.</p>
    </div>
  )
}
