// src/hooks/useLogout.js
import { useNavigate } from "react-router-dom";
import axios from "axios";

// Use the specified auth URL and endpoint
const AUTH_URL = import.meta.env.VITE_AUTH_NEW_URL || "http://localhost:3001";

export function useLogout() {
  const navigate = useNavigate();

  const logout = async () => {
    // Clear all tokens from localStorage first
    console.log("Clearing local storage tokens");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("tempToken");
    
    // Clear cookies manually
    console.log("Clearing cookies");
    try {
      const cookies = document.cookie ? document.cookie.split(';').map(c => c.split('=')[0].trim()) : [];
      cookies.forEach((name) => {
        try {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
        } catch (e) {
          // ignore
        }
      });
    } catch (e) {
      console.error("Failed to clear cookies:", e);
    }

    // Redirect directly to staff login page (admin/staff logout)
    console.log("Redirecting to staff login page");
    window.location.href = `${AUTH_URL}/staff/login/?logout=1`;
  };

  return { logout };
}
