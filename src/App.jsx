import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import StoreCatalogPage from './pages/StoreCatalogPage'
import SerConductorPage from './pages/SerConductorPage'
import PerfilPage from './pages/PerfilPage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import ConductorPage from './pages/ConductorPage'
import ConductorViajeDetallePage from './pages/ConductorViajeDetallePage'
import OrderTrackingPage from './pages/OrderTrackingPage'
import ViajeTrackingPage from './pages/ViajeTrackingPage'
import RutaRolProtegida from './components/RutaRolProtegida'
import RutaClienteProtegida from './components/RutaClienteProtegida'
import RedireccionPorRol from './components/RedireccionPorRol'
import PwaInstallModal from './components/PwaInstallModal'
import StatusMessage from './components/StatusMessage'
import { useFirebaseBridge } from './hooks/useFirebaseBridge'

// mapbox-gl es pesado (~1.5MB). Las páginas que lo usan se cargan de forma
// lazy para que NO entre en el bundle principal, que descargan todos los
// usuarios (incluido el cliente que solo pide comida) con conexión que en
// Falcón puede ser inestable. Solo se baja al abrir estas rutas.
const PedirViajePage = lazy(() => import('./pages/PedirViajePage'))
const TestMapaPage = lazy(() => import('./pages/TestMapaPage'))

function App() {
  // Mantiene la sesión de Firebase sincronizada con la de Supabase para
  // conductor/admin (Firestore sigue exigiendo auth de Firebase). Se monta
  // una sola vez acá — ver src/hooks/useFirebaseBridge.js.
  useFirebaseBridge()

  return (
    <>
      {/* Modal "Descarga la app": global, decide solo si mostrarse (no
          instalada + no descartada hace poco). Fuera de <Routes> para que
          pueda aparecer en cualquier landing. */}
      <PwaInstallModal />
      {/* Sin UI: manda a conductor/admin a su panel apenas se resuelve el rol,
          si están parados en la Home o en /login. */}
      <RedireccionPorRol />
      <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/tienda/:storeId" element={<StoreCatalogPage />} />
      <Route path="/pedido/:pedidoId" element={<OrderTrackingPage />} />
      {/* Pedir un viaje es "usar la app": requiere sesión de cliente. El gate
          cubre tanto el CTA del hero como el acceso directo por URL. */}
      <Route
        path="/pedir-viaje"
        element={
          <RutaClienteProtegida>
            <Suspense fallback={<StatusMessage variant="loading" title="Cargando..." />}>
              <PedirViajePage />
            </Suspense>
          </RutaClienteProtegida>
        }
      />
      <Route path="/viaje/:viajeId" element={<ViajeTrackingPage />} />
      {/* Perfil del cliente (ver/editar cuenta). Protegido: sin sesión no hay
          perfil que mostrar. */}
      <Route
        path="/perfil"
        element={
          <RutaClienteProtegida>
            <PerfilPage />
          </RutaClienteProtegida>
        }
      />
      {/* Sin lazy: a diferencia de /pedir-viaje, esta página no trae mapbox
          ni ninguna dependencia pesada — solo formulario + Supabase. */}
      <Route path="/ser-conductor" element={<SerConductorPage />} />
      <Route path="/login" element={<LoginPage />} />
      {/* TODO: borrar esta ruta antes de mergear a producción — es solo para probar SelectorUbicacion */}
      <Route
        path="/test-mapa"
        element={
          <Suspense fallback={<StatusMessage variant="loading" title="Cargando mapa..." />}>
            <TestMapaPage />
          </Suspense>
        }
      />
      <Route
        path="/admin"
        element={
          <RutaRolProtegida rol="admin">
            <AdminPage />
          </RutaRolProtegida>
        }
      />
      <Route
        path="/conductor"
        element={
          <RutaRolProtegida rol="conductor">
            <ConductorPage />
          </RutaRolProtegida>
        }
      />
      <Route
        path="/conductor/viaje/:viajeId"
        element={
          <RutaRolProtegida rol="conductor">
            <ConductorViajeDetallePage />
          </RutaRolProtegida>
        }
      />
      </Routes>
    </>
  )
}

export default App
