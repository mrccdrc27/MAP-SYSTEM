import React, { useContext, useEffect, useState, useCallback } from "react";
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
import budgetApi from "../API/budgetAPI";
import { AuthProvider as LocalAuthProvider } from "./AuthContextLocal";
import { AuthContext } from "./AuthContextDefinition"; // Import shared context

// Remove trailing slash
const AUTH_URL = (
  import.meta.env.VITE_AUTH_URL || "http://localhost:18001"
).replace(/\/$/, "");

const TOKEN_OBTAIN_URL = `${AUTH_URL}/api/v1/users/login/api/`;
const PROFILE_URL = `${AUTH_URL}/api/v1/users/profile/`;
const LOGOUT_URL = `${AUTH_URL}/logout/`;

const createAuthRequest = () => {
  return axios.create({
    baseURL: AUTH_URL,
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
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

  const fetchUserProfile = useCallback(async () => {
    try {
      const authApi = createAuthRequest();
      const response = await authApi.get(PROFILE_URL);
      const apiData = response.data;

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

  const checkAuthStatus = useCallback(async () => {
    try {
      const userData = await fetchUserProfile();

      if (!hasAnySystemRole(userData, "bms")) {
        console.error("[Auth] No BMS Access.");
        setUser(null);
        setLoading(false);
        setInitialized(true);
        return false;
      }

      setUser(userData);
      setLoading(false);
      setInitialized(true);
      return true;
    } catch (error) {
      console.warn("[Auth] Profile fetch failed:", error);
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

      setUser(null);
      setLoading(false);
      setInitialized(true);
      return false;
    }
  }, [fetchUserProfile]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (credentials) => {
    try {
      console.log("[Auth] Logging in via Proxy...");
      const response = await budgetApi.post("/auth/proxy-login/", {
        email: credentials.email,
        password: credentials.password,
      });

      if (response.data.success) {
        const userData = response.data.user;
        if (!hasAnySystemRole(userData, "bms")) {
          return { success: false, error: "No BMS Access." };
        }
        setUser(userData);
        setLoading(false);
        setInitialized(true);
        return { success: true };
      }
      return { success: false, error: "Invalid credentials" };
    } catch (error) {
      console.error("[Auth] Login error:", error);
      const errorData = error.response?.data;
      let msg = errorData?.error || errorData?.detail || "Login failed.";
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      const authApi = createAuthRequest();
      await authApi.post(LOGOUT_URL);
    } finally {
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

// Export useAuth to use the shared context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

const USE_CENTRAL_AUTH = import.meta.env.VITE_USE_CENTRAL_AUTH === "true";
export const AuthProvider = USE_CENTRAL_AUTH
  ? CentralAuthProvider
  : LocalAuthProvider;
