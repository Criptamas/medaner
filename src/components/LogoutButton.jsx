import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import './LogoutButton.css'

export default function LogoutButton() {
  function handleLogout() {
    signOut(auth)
  }

  return (
    <button type="button" className="logout-button" onClick={handleLogout}>
      Cerrar sesión
    </button>
  )
}
