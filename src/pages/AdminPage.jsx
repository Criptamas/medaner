import LogoutButton from '../components/LogoutButton'
import './AdminPage.css'

export default function AdminPage() {
  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <h1>Panel de administración</h1>
        <LogoutButton />
      </header>
      <p>Próximamente: gestión de tiendas, productos y pedidos.</p>
    </div>
  )
}
