import { Navigate, Outlet, useLocation } from "react-router-dom";
import NotFoundPage from "../not-found-page/NotFoundPage";
import { USE_LOCAL_API } from "../../config/environment.js";

const ProtectedRoute = ({ role }) => {
  const location = useLocation();
  
  // For local development, bypass authentication checks
  if (USE_LOCAL_API) {
    console.log(`🔓 Local development: Bypassing authentication for ${role} route`);
    return <Outlet />;
  }
  
  // Original authentication logic for backend API
  let token = null;
  if (role === "admin") {
    token = localStorage.getItem("admin_access_token");
  } else if (role === "employee") {
    token = localStorage.getItem("employee_access_token");
  }

  if (!token) {
    return <NotFoundPage />;
  }

  return <Outlet />;
};

export default ProtectedRoute;