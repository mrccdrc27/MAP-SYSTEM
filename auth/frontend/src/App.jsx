import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SuperAdminProvider } from './context/SuperAdminContext'
import Login from './pages/Login/Login'
import Register from './pages/Register/Register'
import ForgotPassword from './pages/ForgotPassword/ForgotPassword'
import ResetPassword from './pages/ResetPassword/ResetPassword'
import Profile from './pages/Profile/Profile'
import ChangePassword from './pages/ChangePassword/ChangePassword'
import SystemSelect from './pages/SystemSelect/SystemSelect'
import AgentManagement from './pages/AgentManagement'
import InviteAgent from './pages/InviteAgent'
import ManageRoles from './pages/ManageRoles'
import ManageAssignments from './pages/ManageAssignments'
import SuperAdminLogin from './pages/SuperAdminLogin'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import UserMasterlist from './pages/UserMasterlist'
import UserForm from './pages/UserForm'
import UserImport from './pages/UserImport'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import SuperAdminProtectedRoute from './components/SuperAdminProtectedRoute'
import Layout from './components/Layout'

function App() {
  return (
    <Router basename="/" future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Superuser Routes - Separate from staff auth */}
        <Route path="/superadmin/login" element={
          <SuperAdminProvider>
            <SuperAdminLogin />
          </SuperAdminProvider>
        } />
        <Route path="/superadmin/dashboard" element={
          <SuperAdminProvider>
            <SuperAdminProtectedRoute>
              <SuperAdminDashboard />
            </SuperAdminProtectedRoute>
          </SuperAdminProvider>
        } />
        <Route path="/superadmin/users" element={
          <SuperAdminProvider>
            <SuperAdminProtectedRoute>
              <UserMasterlist />
            </SuperAdminProtectedRoute>
          </SuperAdminProvider>
        } />
        <Route path="/superadmin/users/create" element={
          <SuperAdminProvider>
            <SuperAdminProtectedRoute>
              <UserForm />
            </SuperAdminProtectedRoute>
          </SuperAdminProvider>
        } />
        <Route path="/superadmin/users/:userId/edit" element={
          <SuperAdminProvider>
            <SuperAdminProtectedRoute>
              <UserForm />
            </SuperAdminProtectedRoute>
          </SuperAdminProvider>
        } />
        <Route path="/superadmin/users/import" element={
          <SuperAdminProvider>
            <SuperAdminProtectedRoute>
              <UserImport />
            </SuperAdminProtectedRoute>
          </SuperAdminProvider>
        } />
        
        {/* Staff Login Routes */}
        <Route path="/login" element={<Login userType="staff" />} />
        <Route path="/staff/login" element={<Login userType="staff" />} />
        <Route path="/register" element={<Register userType="staff" />} />
        <Route path="/staff/register" element={<Register userType="staff" />} />
        
        {/* Employee (HDTS) Login Routes */}
        <Route path="/employee/login" element={<Login userType="employee" />} />
        <Route path="/employee/register" element={<Register userType="employee" />} />
        
        {/* Shared Password Reset Routes */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/staff/forgot-password" element={<ForgotPassword userType="staff" />} />
        <Route path="/employee/forgot-password" element={<ForgotPassword userType="employee" />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/staff/reset-password" element={<ResetPassword userType="staff" />} />
        <Route path="/employee/reset-password" element={<ResetPassword userType="employee" />} />
        
        {/* Protected Routes with Layout */}
        <Route path="/profile" element={
          <AuthProvider>
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          </AuthProvider>
        } />
        <Route path="/change-password" element={
          <AuthProvider>
            <ProtectedRoute>
              <Layout>
                <ChangePassword />
              </Layout>
            </ProtectedRoute>
          </AuthProvider>
        } />
        <Route path="/systems" element={
          <AuthProvider>
            <ProtectedRoute>
              <SystemSelect />
            </ProtectedRoute>
          </AuthProvider>
        } />
        
        {/* Admin Management Routes */}
        <Route path="/agents" element={
          <AuthProvider>
            <ProtectedRoute>
              <Layout>
                <AgentManagement />
              </Layout>
            </ProtectedRoute>
          </AuthProvider>
        } />
        <Route path="/invite-agent" element={
          <AuthProvider>
            <ProtectedRoute>
              <Layout>
                <InviteAgent />
              </Layout>
            </ProtectedRoute>
          </AuthProvider>
        } />
        <Route path="/roles" element={
          <AuthProvider>
            <ProtectedRoute>
              <Layout>
                <ManageRoles />
              </Layout>
            </ProtectedRoute>
          </AuthProvider>
        } />
        <Route path="/manage-assignments" element={
          <AuthProvider>
            <ProtectedRoute>
              <Layout>
                <ManageAssignments />
              </Layout>
            </ProtectedRoute>
          </AuthProvider>
        } />
        
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App
