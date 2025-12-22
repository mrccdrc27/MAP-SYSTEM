import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SystemLoading from "./Loading/SystemLoading";

function ProtectedRoute({ roles = [] }) {
  const { user, loading, initialized, hasAmsAccess, getAmsRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Show loading while checking auth status
  if (loading || !initialized) {
    return <SystemLoading />;
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has AMS access
  if (!hasAmsAccess()) {
    return <Navigate to="/login" state={{ error: "No AMS access" }} replace />;
  }

  // Get user's AMS role
  const userRole = getAmsRole()?.toLowerCase() || "";

  // Check if user has required role (if roles are specified)
  if (roles.length > 0 && !roles.includes(userRole)) {
    // User doesn't have required role - redirect to dashboard or back
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
