import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSuperAdmin } from '../../context/SuperAdminContext';

const SuperAdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useSuperAdmin();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#1a1a2e',
        color: '#eaeaea'
      }}>
        <i className="fa fa-spinner fa-spin" style={{ marginRight: '10px' }}></i>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/superadmin/login" replace />;
  }

  return children;
};

export default SuperAdminProtectedRoute;
