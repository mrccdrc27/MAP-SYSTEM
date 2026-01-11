import { Routes, Route, Navigate } from 'react-router-dom';
import SmartSupportLogIn from '../authentication/pages/log-in/SmartSupportLogIn';
import SmartSupportEmployeeCreateAccount from '../authentication/pages/employee-create-account/SmartSupportEmployeeCreateAccount';
import SmartSupportForgotPassword from '../authentication/pages/forgot-password/SmartSupportForgotPassword';
import Unauthorized from "../pages/error/Unauthorized";
import SSOCallback from '../authentication/pages/sso-callback/SSOCallback';
import { useAuth } from '../context/AuthContext';

// Root route handler - redirects authenticated users to their home page
const RootRedirect = () => {
  const { user, loading, initialized, isAdmin, isTicketCoordinator } = useAuth();
  
  // Show loading while checking auth
  if (loading || !initialized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '16px'
      }}>
        <p>Loading...</p>
      </div>
    );
  }
  
  // Not authenticated - redirect to auth-frontend
  if (!user) {
    const authFrontendUrl = import.meta.env.VITE_AUTH_FRONTEND_URL || 'http://localhost:3001';
    window.location.href = `${authFrontendUrl}/employee`;
    return null;
  }
  
  // Authenticated admin/coordinator - go to admin dashboard
  if (isAdmin || isTicketCoordinator) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  // Authenticated employee - go to employee home
  return <Navigate to="/employee/home" replace />;
};

const AuthRoutes = () => (
  <Routes>
    <Route path="/" element={<RootRedirect />} />
    <Route path="/unauthorized" element={<Unauthorized />} />
    <Route path="/hdts" element={<SSOCallback />} />
    <Route path="/create-account" element={<SmartSupportEmployeeCreateAccount />} />
    <Route path="/forgot-password" element={<SmartSupportForgotPassword />} />
    {/* Intentionally no top-level catch-all here so other route groups (e.g. /employee, /admin) can match. */}
  </Routes>
);

export default AuthRoutes;
