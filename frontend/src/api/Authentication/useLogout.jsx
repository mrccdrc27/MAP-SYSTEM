// src/hooks/useLogout.js
import { useNavigate } from "react-router-dom";
import axios from "axios";

const logoutURL = import.meta.env.VITE_LOGOUT_API;

export function useLogout() {
  const navigate = useNavigate();

  const logout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");

    try {
      if (refreshToken) {
        await axios.post(logoutURL, { refresh: refreshToken });
      }
    } catch (err) {
      console.error("Logout failed:", err.response?.data || err.message);
      // continue to clear tokens anyway
    }

    // Clear all tokens and redirect
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("tempToken");

    navigate("/", { replace: true });
  };

  return { logout };
}
