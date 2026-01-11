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

// Remove trailing slash
const AUTH_URL = (
  import.meta.env.VITE_AUTH_URL || "http://localhost:18001"
).replace(/\/$/, "");

// Use the API Login endpoint that returns tokens
const TOKEN_OBTAIN_URL = `${AUTH_URL}/api/v1/users/login/api/`;
const TOKEN_VERIFY_URL = `${AUTH_URL}/api/v1/token/validate/`;
const TOKEN_REFRESH_URL = `${AUTH_URL}/api/v1/token/refresh/`;
const PROFILE_URL = `${AUTH_URL}/api/v1/users/profile/`;
const LOGOUT_URL = `${AUTH_URL}/logout/`;

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
    withCredentials: true,
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

  // NEW: Check for tokens in URL (from centralized auth redirect)
  const checkUrlForTokens = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get("access_token");
    const refreshToken = urlParams.get("refresh_token");

    if (accessToken) {
      console.log("[Auth] Found access_token in URL, storing in localStorage");
      setAccessToken(accessToken);

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

      // Check if we have a token at all
      const token = getAccessToken();
      if (!token) {
        console.log("[Auth] No token found in localStorage or cookies");
        setUser(null);
        setLoading(false);
        setInitialized(true);
        return false;
      }

      console.log("[Auth] Token found, attempting to fetch profile");

      // Try fetching full profile
      const userData = await fetchUserProfile();

      if (!hasAnySystemRole(userData, "bms")) {
        console.error("[Auth] No BMS Access.");
        setUser(null);
        setLoading(false);
        setInitialized(true);
        return false;
      }

      console.log("[Auth] ✅ User authenticated with BMS access");
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

  // Login Function
  const login = async (credentials) => {
    try {
      console.log("[Auth] Logging in via Public API...", credentials.email);
      const authApi = createAuthRequest();

      const payload = {
        email: credentials.email,
        password: credentials.password,
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

        // Store the access token in localStorage
        if (response.data.access_token) {
          console.log("[Auth] Storing access_token in localStorage");
          setAccessToken(response.data.access_token);
        }

        // CRITICAL FIX: Decode the token to get user data with roles
        // The login response might not have all the data we need
        const decodedUser = getUserFromToken();

        if (!decodedUser) {
          console.error("[Auth] Failed to decode token after login");
          return { success: false, error: "Invalid token received" };
        }

        console.log("[Auth] Decoded user from token:", decodedUser);

        // Verify BMS Access using the decoded token data
        if (!hasAnySystemRole(decodedUser, "bms")) {
          console.error("[Auth] No BMS Access after login");
          return { success: false, error: "No BMS Access." };
        }

        // Set User State using decoded token data
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
          msg;
      } else if (errorData?.detail) {
        msg = errorData.detail;
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
      removeAccessToken();
      setUser(null);
      setInitialized(true);
      setLoading(false);
      window.location.href = "/login";
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
