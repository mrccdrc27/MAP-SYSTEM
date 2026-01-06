import { Navigate, Outlet, useLocation } from "react-router-dom";
import NotFoundPage from "../not-found-page/NotFoundPage";
import { USE_LOCAL_API } from "../../config/environment.js";
import { useAuth } from "../../context/AuthContext";

const ProtectedRoute = ({ role }) => {
  const location = useLocation();
  const { hasAuth, user, loading, initialized } = useAuth();
  
  // For local development, bypass authentication checks
  if (USE_LOCAL_API) {
    console.log(`🔓 Local development: Bypassing authentication for ${role} route`);
    return <Outlet />;
  }
  
  // Wait for auth to initialize
  if (!initialized || loading) {
    return null; // or a loading spinner
  }
  
  // Check if user is authenticated via cookie-based auth
  if (!hasAuth) {
    return <NotFoundPage />;
  }

  return <Outlet />;
};

export default ProtectedRoute;