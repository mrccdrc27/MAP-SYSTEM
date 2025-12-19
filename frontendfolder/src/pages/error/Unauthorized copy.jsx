import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Unauthorized = () => {
  const { user, isAdmin, hasSystemAccess } = useAuth();

  // Determine where to redirect the user based on their permissions
  const getRedirectPath = () => {
    if (!user) {
      return "/login";
    }
    if (isAdmin) {
      return "/admin/dashboard";
    }
    if (hasSystemAccess) {
      return "/agent/dashboard";
    }
    return "/login";
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
        <div className="text-6xl text-red-500 mb-4">
          <i className="fas fa-exclamation-circle"></i>
        </div>
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page.
          This area requires specific role permissions that your account doesn't have.
        </p>
        <div className="flex flex-col space-y-2">
          <Link 
            to={getRedirectPath()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-200"
          >
            Return to Dashboard
          </Link>
          {!user && (
            <Link 
              to="/login"
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition duration-200"
            >
              Log In
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;