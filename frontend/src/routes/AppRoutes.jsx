import { Routes, Route, Navigate } from 'react-router-dom'
import PrivateRoute from './PrivateRoute'
import Login from '../pages/auth/Login'
import Dashboard from '../pages/dashboard/Dashboard'
import SuppliersList from '../pages/suppliers/SuppliersList'
import ProductsList from '../pages/products/ProductsList'
import PurchasesList from '../pages/purchases/PurchasesList'
import TransfersList from '../pages/transfers/TransfersList'
import WriteOffsList from '../pages/writeoffs/WriteOffsList'
import InventoryPage from '../pages/inventory/InventoryPage'
import ReportsPage from '../pages/reports/ReportsPage'
import UsersList from '../pages/users/UsersList'
import TransportPage from '../pages/transport/TransportPage'
import InventoryCountsPage from '../pages/inventory_counts/InventoryCountsPage'
import MainLayout from '../components/layout/MainLayout'

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="suppliers" element={<SuppliersList />} />
        <Route path="products" element={<ProductsList />} />
        <Route path="purchases" element={<PurchasesList />} />
        <Route path="transfers" element={<TransfersList />} />
        <Route path="writeoffs" element={<WriteOffsList />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="users" element={<UsersList />} />
        <Route path="transport" element={<TransportPage />} />
        <Route path="inventory-counts" element={<InventoryCountsPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
