import { Route, Routes } from 'react-router-dom'
import StoreListPage from './pages/StoreListPage'
import StoreCatalogPage from './pages/StoreCatalogPage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import ConductorPage from './pages/ConductorPage'
import OrderTrackingPage from './pages/OrderTrackingPage'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<StoreListPage />} />
      <Route path="/tienda/:storeId" element={<StoreCatalogPage />} />
      <Route path="/pedido/:pedidoId" element={<OrderTrackingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/conductor"
        element={
          <ProtectedRoute>
            <ConductorPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
