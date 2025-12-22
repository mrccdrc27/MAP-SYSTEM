import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute component for role-based route protection.
 * 
 * BMS Roles:
 * - ADMIN: Full access to all features including user management
 * - FINANCE_HEAD: Access to financial operations and reports
 * - GENERAL_USER: Basic access to view reports and own data
 * 
 * @param {Object} props
 * @param {boolean} props.requireAdmin - Require ADMIN role
 * @param {boolean} props.requireFinanceHead - Require FINANCE_HEAD role (or higher)
 * @param {string[]} props.allowedRoles - Array of specific roles allowed (e.g., ['ADMIN', 'FINANCE_HEAD'])
 */
export default function ProtectedRoute({ 
  requireAdmin = false, 
  requireFinanceHead = false,
  allowedRoles = null 
}) {
  const { user, loading, initialized, isAdmin, isFinanceHead, hasBmsAccess, getBmsRole } = useAuth();
  const location = useLocation();

  // Show loading while authentication status is being checked
  if (loading || !initialized) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '16px',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(52, 152, 219, 0.3)',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px'
        }}></div>
        <style>
          {`@keyframes spin { to { transform: rotate(360deg); } }`}
        </style>
        <p>Verifying authentication...</p>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    // Redirect to login, preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check for BMS system access first
  if (!hasBmsAccess()) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check specific role requirements
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = getBmsRole();
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check finance head requirement (ADMIN also has access to finance head routes)
  if (requireFinanceHead && !isFinanceHead() && !isAdmin()) {
    return <Navigate to="/unauthorized" replace />;
  }

  // If authenticated and meets requirements, render the protected content
  return <Outlet />;
}

/**
 * PublicRoute component - redirects authenticated users to dashboard.
 * Used for login, forgot password, etc.
 */
export function PublicRoute({ children }) {
  const { isAuthenticated, loading, initialized } = useAuth();

  if (loading || !initialized) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(52, 152, 219, 0.3)',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px'
        }}></div>
        <style>
          {`@keyframes spin { to { transform: rotate(360deg); } }`}
        </style>
        <p>Loading...</p>
      </div>
    );
  }

  // If user is already logged in, redirect them to the dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

/**
 * Unauthorized page component
 */
export function UnauthorizedPage() {
  const { logout, getBmsRole } = useAuth();
  const userRole = getBmsRole();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{ color: '#e74c3c', marginBottom: '16px' }}>Access Denied</h1>
      <p style={{ color: '#666', marginBottom: '8px' }}>
        You do not have permission to access this page.
      </p>
      {userRole && (
        <p style={{ color: '#888', marginBottom: '24px', fontSize: '14px' }}>
          Your current role: <strong>{userRole}</strong>
        </p>
      )}
      <div style={{ display: 'flex', gap: '16px' }}>
        <button
          onClick={() => window.history.back()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Go Back
        </button>
        <button
          onClick={logout}
          style={{
            padding: '10px 20px',
            backgroundColor: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
