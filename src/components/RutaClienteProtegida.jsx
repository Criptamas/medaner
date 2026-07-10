import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClienteAuth } from '../hooks/useClienteAuth'
import ClienteAuthSheet from './home/ClienteAuthSheet'
import StatusMessage from './StatusMessage'
import './RutaClienteProtegida.css'

// Gate de rutas que requieren sesión de CLIENTE (Supabase Auth): pedir viaje,
// checkout de pedido, perfil. Regla de negocio: "para usar la app hay que
// estar registrado" (ver header). Si no hay sesión, muestra un login
// bloqueante en vez de dejar entrar.
//
// El truco del ref: ClienteAuthSheet llama onCerrar TANTO al cerrar a mano
// COMO justo después de autenticar (llama onAutenticado y luego onCerrar). Sin
// distinguir, un login exitoso rebotaría al inicio en vez de dejar pasar a la
// página pedida. Con el ref, onCerrar solo navega al home cuando el usuario
// canceló; si autenticó, no hace nada y el re-render (user ya seteado) muestra
// los children.
export default function RutaClienteProtegida({ children }) {
  const { user, loading } = useClienteAuth()
  const navigate = useNavigate()
  const autenticoRef = useRef(false)

  if (loading) {
    return <StatusMessage variant="loading" title="Cargando..." />
  }

  if (!user) {
    return (
      <div className="ruta-protegida">
        <div className="ruta-protegida__aviso">
          <span className="ruta-protegida__icono" aria-hidden="true">🔒</span>
          <h1>Inicia sesión para continuar</h1>
          <p>Para pedir un servicio en Medaner necesitas una cuenta. Es rápido.</p>
        </div>
        <ClienteAuthSheet
          onAutenticado={() => {
            autenticoRef.current = true
          }}
          onCerrar={() => {
            if (!autenticoRef.current) navigate('/')
          }}
        />
      </div>
    )
  }

  return children
}
