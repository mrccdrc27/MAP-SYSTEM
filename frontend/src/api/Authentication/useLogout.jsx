// src/hooks/useLogout.js
import { useNavigate } from "react-router-dom";
import axios from "axios";

// Use the specified auth URL and endpoint
const AUTH_URL = import.meta.env.VITE_AUTH_URL || "http://localhost:8003";

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

    // Redirect to auth logout endpoint which will clear server cookies and redirect appropriately
    console.log("Redirecting to logout endpoint");
    window.location.href = `${AUTH_URL}/logout/`;
  };

  return { logout };
}
