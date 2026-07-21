import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RequireAuth from './components/RequireAuth'
import NavBar from './components/NavBar'
import LoginPage from './pages/LoginPage'
import CheckOutForm from './pages/CheckOutForm'
import CheckInForm from './pages/CheckInForm'
import VisitHistory from './pages/VisitHistory'
import InventoryView from './pages/InventoryView'
import DiscrepancyList from './pages/DiscrepancyList'
import ReportView from './pages/ReportView'
import DriversAdmin from './pages/DriversAdmin'
import StoresAdmin from './pages/StoresAdmin'
import BagScanPage from './pages/BagScanPage'
import BagRegistrationPage from './pages/BagRegistrationPage'
import BagHistoryPage from './pages/BagHistoryPage'
import AccountabilityDashboard from './pages/AccountabilityDashboard'
import DriverBagDetail from './pages/DriverBagDetail'
import EndOfDaySummary from './pages/EndOfDaySummary'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <NavBar />

        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected — all authenticated users */}
          <Route path="/dashboard" element={<RequireAuth><div className="mx-auto max-w-2xl px-4 py-8"><h1 className="text-xl font-bold text-gray-800">Welcome to Bag Reconciliation</h1><p className="mt-2 text-gray-600">Use the navigation menu to check bags in/out or view reports.</p></div></RequireAuth>} />
          <Route path="/checkout" element={<RequireAuth><CheckOutForm /></RequireAuth>} />
          <Route path="/checkin" element={<RequireAuth><CheckInForm /></RequireAuth>} />
          <Route path="/history/:type/:id" element={<RequireAuth><VisitHistory /></RequireAuth>} />

          {/* Protected — manager only */}
          <Route path="/inventory" element={<RequireAuth requiredRole="MANAGER"><InventoryView /></RequireAuth>} />
          <Route path="/discrepancies" element={<RequireAuth requiredRole="MANAGER"><DiscrepancyList /></RequireAuth>} />
          <Route path="/reports" element={<RequireAuth requiredRole="MANAGER"><ReportView /></RequireAuth>} />
          <Route path="/admin/drivers" element={<RequireAuth requiredRole="MANAGER"><DriversAdmin /></RequireAuth>} />
          <Route path="/admin/stores" element={<RequireAuth requiredRole="MANAGER"><StoresAdmin /></RequireAuth>} />

          {/* Bag tracking v2 — DRIVER */}
          <Route path="/bags/scan" element={<RequireAuth requiredRole="DRIVER"><BagScanPage /></RequireAuth>} />

          {/* Bag tracking v2 — MANAGER */}
          <Route path="/bags/register" element={<RequireAuth requiredRole="MANAGER"><BagRegistrationPage /></RequireAuth>} />
          <Route path="/bags/:barcode/history" element={<RequireAuth requiredRole="MANAGER"><BagHistoryPage /></RequireAuth>} />
          <Route path="/dashboard/accountability" element={<RequireAuth requiredRole="MANAGER"><AccountabilityDashboard /></RequireAuth>} />
          <Route path="/dashboard/drivers/:id" element={<RequireAuth requiredRole="MANAGER"><DriverBagDetail /></RequireAuth>} />
          <Route path="/dashboard/end-of-day" element={<RequireAuth requiredRole="MANAGER"><EndOfDaySummary /></RequireAuth>} />

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App
