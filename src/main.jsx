import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ClienteAuthProvider } from './context/ClienteAuthProvider.jsx'

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* AuthProvider (Firebase) sigue exclusivo de admin/conductor.
          ClienteAuthProvider (Supabase) es el sistema paralelo para clientes —
          ambos conviven sin interferir, el orden de anidación no importa. */}
      <AuthProvider>
        <ClienteAuthProvider>
          <App />
        </ClienteAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
