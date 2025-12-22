import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import api from "../api";
import { REFRESH_TOKEN, ACCESS_TOKEN } from "../constants";
import { useState, useEffect } from "react";
import SystemLoading from "./Loading/SystemLoading";
import { selectUser } from "../features/counter/userSlice";
import { useSelector } from "react-redux";
import authService from "../services/auth-service";

function ProtectedRoute({ roles }) {
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const token = sessionStorage.getItem(ACCESS_TOKEN);

  // const role = currentUser?.role?.toLowerCase() || "";
  const role = user?.role?.toLowerCase() || "";
  const isAuthenticated = token ? true : false;

  // Redirect the user back to the previous page.
  useEffect(() => {
    // Redirect user back to the previous page if authenticated and not authorized.
    if (isAuthenticated && !roles.includes(role)) {
      navigate(-1);
    }
  }, [isAuthenticated, roles, role]);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!roles.includes(role)) {
    return null;
  }

  return <Outlet />;
}

export default ProtectedRoute;
