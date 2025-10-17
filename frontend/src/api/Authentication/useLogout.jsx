// src/hooks/useLogout.js
import { useNavigate } from "react-router-dom";
import axios from "axios";

// Use the specified auth URL and endpoint
const AUTH_URL = import.meta.env.VITE_AUTH_URL || "http://localhost:8003";

export function useLogout() {
  const navigate = useNavigate();

  const logout = async () => {
    try {
      console.log("Attempting logout to", `${AUTH_URL}/logout/`);
      
      // Make the logout request with withCredentials to handle cookies properly
      await axios.post(`${AUTH_URL}/logout/`, {}, {
        withCredentials: true
      });
      
      console.log("Logout API call successful");
    } catch (err) {
      console.error("Logout API call failed:", err.response?.data || err.message);
      // Continue with local cleanup regardless of API success/failure
    }

    // Clear all tokens from localStorage
    console.log("Clearing local storage tokens");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("tempToken");
    
    // Also clear cookies (in case they're being used for auth)
    console.log("Clearing cookies");
    document.cookie = 'access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';

    // First navigate to the root/login page
    navigate("/", { replace: true });
    
    // Then refresh the page to ensure complete reset of application state
    console.log("Refreshing page to complete logout");
    setTimeout(() => {
      window.location.reload();
    }, 100); // Small delay to ensure navigation completes first
  };

  return { logout };
}
