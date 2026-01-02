import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import axios from "axios";
import {
  hasAccessToken,
  getAccessToken,
  setAccessToken,
  removeAccessToken,
  getUserFromToken,
  hasSystemRole,
  hasAnySystemRole,
  isTokenExpired,
  getSystemRole,
} from "../API/TokenUtils";
import { AuthProvider as LocalAuthProvider } from './AuthContextLocal';

const AuthContext = createContext();

// Remove trailing slash
const AUTH_URL = (import.meta.env.VITE_AUTH_URL || "http://localhost:18001").replace(/\/$/, "");

// === UPDATED ENDPOINTS ===
// CRITICAL CHANGE: Use the specific API Login view that doesn't redirect
const TOKEN_OBTAIN_URL = `${AUTH_URL}/api/v1/users/login/api/`; 

const TOKEN_VERIFY_URL = `${AUTH_URL}/api/v1/token/validate/`; 
const TOKEN_REFRESH_URL = `${AUTH_URL}/api/v1/token/refresh/`;
const PROFILE_URL = `${AUTH_URL}/api/v1/users/profile/`; 
const LOGOUT_URL = `${AUTH_URL}/logout/`;

const createAuthRequest = () => {
  return axios.create({
    baseURL: AUTH_URL,
    headers: { 
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest"
    },
    withCredentials: true, // IMPORTANT: Allows sending/receiving cookies
  });
};

const CentralAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // ... (Role Helpers remain the same) ...
  const isAdmin = useCallback(() => user && hasSystemRole(user, "bms", "ADMIN"), [user]);
  const isFinanceHead = useCallback(() => user && hasSystemRole(user, "bms", "FINANCE_HEAD"), [user]);
  const hasBmsAccess = useCallback(() => user && hasAnySystemRole(user, "bms"), [user]);
  const getBmsRole = useCallback(() => user ? getSystemRole(user, "bms") : null, [user]);

  // 1. Fetch Profile (Acts as Verify)
  // Since tokens are HttpOnly/Lax cookies, we can't read them in JS easily to verify signature.
  // We rely on the API returning 200 OK or 401 Unauthorized.
  const fetchUserProfile = useCallback(async () => {
    try {
      const authApi = createAuthRequest();
      const response = await authApi.get(PROFILE_URL);
      
      const apiData = response.data;

      // MAP Profile API format (system_slug) to Token format (system)
      if (apiData.system_roles) {
          apiData.roles = apiData.system_roles.map(r => ({
              system: r.system_slug || r.system, // Handle both formats
              role: r.role_name || r.role
          }));
      }

      return apiData;
    } catch (error) {
      throw error;
    }
  }, []);

  // 2. Check Status
  const checkAuthStatus = useCallback(async () => {
    try {
      // Try to fetch profile. If cookies are valid, it works.
      const userData = await fetchUserProfile();
      
      console.log("[Auth] User:", userData.email);
      
      if (!hasAnySystemRole(userData, "bms")) {
        console.error("[Auth] No BMS Access.");
        setUser(null);
        setLoading(false);
        setInitialized(true);
        return false;
      }

      // Store basic info in localStorage for non-sensitive checks if needed
      // But rely on cookies for API calls
      setUser(userData);
      setLoading(false);
      setInitialized(true);
      return true;

    } catch (error) {
      // If 401, cookies are missing/invalid
      setUser(null);
      setLoading(false);
      setInitialized(true);
      return false;
    }
  }, [fetchUserProfile]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // 3. Login Function (Updated to handle LoginAPIView response format)
  const login = async (credentials) => {
    try {
      console.log("[Auth] Logging in via Public API...", credentials.email);
      const authApi = createAuthRequest();
      
      // The LoginAPIView expects this payload structure
      const payload = {
        email: credentials.email,
        password: credentials.password,
        // g_recaptcha_response: "" // Optional if disabled in backend
      };

      const response = await authApi.post(TOKEN_OBTAIN_URL, payload);

      console.log("[Auth] API Response:", response.data);

      // Handle OTP Requirement
      if (response.data.otp_required) {
          return { 
              success: false, 
              error: "OTP Required. Please login via the main portal for 2FA support.",
              otp_required: true 
          };
      }

      // Handle Success
      if (response.data.success) {
          console.log("[Auth] Login Successful. Cookies should be set.");
          
          // Verify immediately
          const authSuccess = await checkAuthStatus();
          
          if (!authSuccess) {
              return { success: false, error: "Login successful, but role check failed." };
          }
          return { success: true };
      } 
      
      // Handle Failure (if 200 OK but success=false)
      return { success: false, error: "Invalid credentials" };

    } catch (error) {
      console.error("[Auth] Login error:", error);
      
      // LoginAPIView returns 400 Bad Request on failure with specific error structure
      const errorData = error.response?.data;
      let msg = "Login failed.";
      
      if (errorData?.errors) {
          // Flatten error object
          const errs = errorData.errors;
          msg = errs.non_field_errors?.[0] || errs.email?.[0] || errs.password?.[0] || msg;
      } else if (errorData?.detail) {
          msg = errorData.detail;
      } else if (typeof error.response?.data === 'string' && error.response.data.includes('<!DOCTYPE html>')) {
          msg = "Server redirected to HTML (Endpoint mismatch).";
      }

      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      const authApi = createAuthRequest();
      await authApi.post(LOGOUT_URL); // This clears cookies on server
    } finally {
      setUser(null);
      setInitialized(true);
      setLoading(false);
      window.location.href = "/login";
    }
  };

  const updateUserContext = (updatedUserData) => {
    setUser(prevUser => ({ ...prevUser, ...updatedUserData }));
  };

  const value = {
    user, setUser, loading, logout, login, 
    refreshAuth: checkAuthStatus, initialized, 
    isAuthenticated: !!user, isAdmin, isFinanceHead, 
    hasBmsAccess, getBmsRole, updateUserContext, checkAuthStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

const USE_CENTRAL_AUTH = import.meta.env.VITE_USE_CENTRAL_AUTH === 'true';
export const AuthProvider = USE_CENTRAL_AUTH ? CentralAuthProvider : LocalAuthProvider;