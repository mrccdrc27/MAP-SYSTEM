import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ requireAdmin = false, requireAgent = false }) {
  const { user, loading, initialized, isAdmin, hasSystemAccess, isTicketCoordinator } = useAuth();
  const location = useLocation();

  // Debug: log auth state when ProtectedRoute evaluates
  // eslint-disable-next-line no-console
  console.debug('[ProtectedRoute] auth state:', { user, loading, initialized, isAdmin, hasSystemAccess, isTicketCoordinator, pathname: location.pathname });

  // Show loading while authentication status is being checked
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
          border: '4px solid rgba(59, 130, 246, 0.3)',
          borderTop: '4px solid #3b82f6',
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

  // Check for TTS system access first
  if (!hasSystemAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check admin requirements
  if (requireAdmin && !(isAdmin || isTicketCoordinator)) {
    return <Navigate to="/employee/home" replace />;
  }

  // Check agent requirements (non-admin users)
  if (requireAgent && (isAdmin || isTicketCoordinator)) {
    // If agent-only route and user is admin or ticket coordinator, redirect to admin area
    return <Navigate to="/admin/dashboard" replace />;
  }

  // If authenticated and meets requirements, render the protected content
  return <Outlet />;
}