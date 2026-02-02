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
import { AuthProvider as LocalAuthProvider } from "./AuthContextLocal";

const AuthContext = createContext();

// Auth service base URL - controlled by environment variable
// Production: https://api.ticketing.mapactive.tech
// Docker: http://localhost:8001
const AUTH_URL = (
  import.meta.env.VITE_AUTH_URL || "http://localhost:8001"
).replace(/\/$/, "");

// ONLY the endpoints actually used by AuthContext
// Token refresh happens in api.js interceptor, not here
const TOKEN_OBTAIN_URL = `${AUTH_URL}/api/v1/users/login/api/`;
const PROFILE_URL = `${AUTH_URL}/api/v1/users/profile/`;
const LOGOUT_URL = `${AUTH_URL}/api/v1/users/logout/`;

const createAuthRequest = () => {
  const token = getAccessToken();

  const headers = {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return axios.create({
    baseURL: AUTH_URL,
    headers: headers,
    withCredentials: true, // Enable cookies for cross-origin requests
  });
};

const CentralAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const isAdmin = useCallback(
    () => user && hasSystemRole(user, "bms", "ADMIN"),
    [user]
  );
  const isFinanceHead = useCallback(
    () => user && hasSystemRole(user, "bms", "FINANCE_HEAD"),
    [user]
  );
  const hasBmsAccess = useCallback(
    () => user && hasAnySystemRole(user, "bms"),
    [user]
  );
  const getBmsRole = useCallback(
    () => (user ? getSystemRole(user, "bms") : null),
    [user]
  );

  // Check for tokens in URL (from centralized auth redirect)
  const checkUrlForTokens = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get("access_token");
    const refreshToken = urlParams.get("refresh_token");

    if (accessToken) {
      console.log("[Auth] Found access_token in URL, storing in localStorage");
      setAccessToken(accessToken);
      
      if (refreshToken) {
        console.log("[Auth] Found refresh_token in URL, storing in localStorage");
        localStorage.setItem('refreshToken', refreshToken);
      }

      // Clean URL to remove tokens
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);

      return true;
    }

    return false;
  }, []);

  // Fetch Profile
  const fetchUserProfile = useCallback(async () => {
    try {
      const authApi = createAuthRequest();
      const response = await authApi.get(PROFILE_URL);

      const apiData = response.data;

      // Map system_roles to roles format
      if (apiData.system_roles) {
        apiData.roles = apiData.system_roles.map((r) => ({
          system: r.system_slug || r.system,
          role: r.role_name || r.role,
        }));
      }

      return apiData;
    } catch (error) {
      throw error;
    }
  }, []);

  // Check Auth Status
  const checkAuthStatus = useCallback(async () => {
    try {
      // FIRST: Check if tokens are in URL (from centralized auth redirect)
      const foundInUrl = checkUrlForTokens();

      if (foundInUrl) {
        console.log("[Auth] Tokens found in URL, will fetch profile");
      }

      const token = getAccessToken();
      
      // Always attempt to fetch profile (works with cookies OR localStorage token)
      if (!token && !foundInUrl) {
        console.log("[Auth] No local token. Attempting Cookie/SSO validation...");
      } else {
        console.log("[Auth] Token found or in URL, attempting to fetch profile");
      }

      // Always try fetching profile. If cookie exists (SSO) or token exists, it will succeed.
      const userData = await fetchUserProfile();

      if (!hasAnySystemRole(userData, "bms")) {
        console.error("[Auth] No BMS Access.");
        setUser(null);
        setLoading(false);
        setInitialized(true);
        return false;
      }

      console.log("[Auth] User authenticated with BMS access");
      setUser(userData);
      setLoading(false);
      setInitialized(true);
      return true;

    } catch (error) {
      console.warn("[Auth] Profile fetch failed:", error);

      // FALLBACK: Try to use token directly if profile fetch fails
      const localUser = getUserFromToken();

      if (
        localUser &&
        !isTokenExpired(getAccessToken()) &&
        hasAnySystemRole(localUser, "bms")
      ) {
        console.log("[Auth] Recovering session from local token");
        setUser(localUser);
        setLoading(false);
        setInitialized(true);
        return true;
      }

      // Failed
      console.log("[Auth] Authentication failed completely");
      setUser(null);
      setLoading(false);
      setInitialized(true);
      return false;
    }
  }, [fetchUserProfile, checkUrlForTokens]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Login Function (for local BMS login page - Docker mode)
  const login = async (credentials) => {
    try {
      console.log("[Auth] Logging in via API...", credentials.email);
      const authApi = createAuthRequest();

      const payload = {
        email: credentials.email,
        password: credentials.password,
        g_recaptcha_response: credentials.g_recaptcha_response || ''
      };

      const response = await authApi.post(TOKEN_OBTAIN_URL, payload);

      console.log("[Auth] API Response:", response.data);

      // Handle OTP Requirement
      if (response.data.otp_required) {
        return {
          success: false,
          error:
            "OTP Required. Please login via the main portal for 2FA support.",
          otp_required: true,
        };
      }

      // Handle Success
      if (response.data.success) {
        console.log("[Auth] Login Successful. Response:", response.data);

        // Store BOTH access and refresh tokens if provided
        if (response.data.access_token) {
          console.log("[Auth] Storing access_token in localStorage");
          setAccessToken(response.data.access_token);
        }
        
        if (response.data.refresh_token) {
          console.log("[Auth] Storing refresh_token in localStorage");
          localStorage.setItem('refreshToken', response.data.refresh_token);
        }

        // Decode the token to get user data with roles
        const decodedUser = getUserFromToken();

        if (!decodedUser) {
          console.error("[Auth] Failed to decode token after login");
          return { success: false, error: "Invalid token received" };
        }

        console.log("[Auth] Decoded user from token:", decodedUser);

        // Verify BMS Access
        if (!hasAnySystemRole(decodedUser, "bms")) {
          console.error("[Auth] No BMS Access after login. User roles:", decodedUser?.roles);
          return { success: false, error: "No BMS Access." };
        }

        // Set User State
        console.log("[Auth] Setting user state from token");
        setUser(decodedUser);
        setLoading(false);
        setInitialized(true);

        return { success: true };
      }

      return { success: false, error: "Invalid credentials" };
    } catch (error) {
      console.error("[Auth] Login error:", error);

      const errorData = error.response?.data;
      let msg = "Login failed.";

      if (errorData?.errors) {
        const errs = errorData.errors;
        msg =
          errs.non_field_errors?.[0] ||
          errs.email?.[0] ||
          errs.password?.[0] ||
          errs.g_recaptcha_response?.[0] ||
          msg;
      } else if (errorData?.detail) {
        msg = errorData.detail;
      } else if (errorData?.message) {
        msg = errorData.message;
      }

      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      const authApi = createAuthRequest();
      await authApi.post(LOGOUT_URL);
    } catch (error) {
      console.error("[Auth] Logout error:", error);
    } finally {
      // Clean up both tokens
      removeAccessToken();
      localStorage.removeItem('refreshToken');
      setUser(null);
      setInitialized(true);
      setLoading(false);
      
      // Determine redirect URL based on environment
      // Production: centralized login
      // Docker: BMS login page
      const isProduction = import.meta.env.VITE_USE_CENTRAL_AUTH === "true";
      const logoutUrl = isProduction 
        ? "https://login.ticketing.mapactive.tech/staff"
        : "/login";
      
      console.log('[Auth] Redirecting to login:', logoutUrl);
      
      if (isProduction) {
        window.location.href = logoutUrl;
      } else {
        window.location.pathname = logoutUrl;
      }
    }
  };

  const updateUserContext = (updatedUserData) => {
    setUser((prevUser) => ({ ...prevUser, ...updatedUserData }));
  };

  const value = {
    user,
    setUser,
    loading,
    logout,
    login,
    refreshAuth: checkAuthStatus,
    initialized,
    isAuthenticated: !!user,
    isAdmin,
    isFinanceHead,
    hasBmsAccess,
    getBmsRole,
    updateUserContext,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

const USE_CENTRAL_AUTH = import.meta.env.VITE_USE_CENTRAL_AUTH === "true";
export const AuthProvider = USE_CENTRAL_AUTH
  ? CentralAuthProvider
  : LocalAuthProvider;