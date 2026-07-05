import { Route, Routes } from 'react-router-dom'
import StoreListPage from './pages/StoreListPage'
import StoreCatalogPage from './pages/StoreCatalogPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<StoreListPage />} />
      <Route path="/tienda/:storeId" element={<StoreCatalogPage />} />
    </Routes>
  )
}

export default App
