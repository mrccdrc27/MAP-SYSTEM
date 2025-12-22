// src/context/AuthContext.jsx
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
} from "../api/TokenUtils";

const AuthContext = createContext();
const AUTH_URL = import.meta.env.VITE_AUTH_URL || "";

// API endpoints
const PROFILE_URL = `${AUTH_URL}/api/v1/users/profile/`;

// Create auth API instance for auth service requests
const createAuthRequest = () => {
  return axios.create({
    baseURL: AUTH_URL,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true,
  });
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [refreshAttempted, setRefreshAttempted] = useState(false);

  // Check if user has admin role for TTS system
  const isAdmin = useCallback(() => {
    return user && hasSystemRole(user, "tts", "Admin");
  }, [user]);

  // Check if user has any role for TTS system
  const hasTtsAccess = useCallback(() => {
    return user && hasAnySystemRole(user, "tts");
  }, [user]);

  // Verify token with auth service
  const verifyToken = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) return false;

      const authApi = createAuthRequest();
      const response = await authApi.post(`${AUTH_URL}/api/v1/token/verify/`, {
        token,
      });

      return response.status === 200;
    } catch (error) {
      console.error("Token verification failed:", error);
      return false;
    }
  }, []);

  // Fetch user profile (token + full profile)
  const fetchUserProfile = useCallback(async () => {
    try {
      const tokenUser = getUserFromToken();
      if (!tokenUser) throw new Error("Invalid token");

      const authApi = createAuthRequest();
      const response = await authApi.get(PROFILE_URL, {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      });

      if (response.data) {
        return {
          ...tokenUser,
          ...response.data,
          roles: tokenUser.roles, // preserve roles from token
        };
      }

      throw new Error("Failed to fetch user profile");
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return getUserFromToken();
    }
  }, []);

  // Central auth checker (single source of truth)
  const checkAuthStatus = useCallback(async () => {
    if (!hasAccessToken()) {
      setUser(null);
      setLoading(false);
      setInitialized(true);
      return false;
    }

    try {
      const isValid = await verifyToken();

      if (isValid) {
        const userData = await fetchUserProfile();
        setUser(userData);
        setLoading(false);
        setInitialized(true);
        return true;
      }

      removeAccessToken();
      setUser(null);
      setLoading(false);
      setInitialized(true);
      return false;
    } catch (error) {
      console.error("Auth check failed:", error);
      removeAccessToken();
      setUser(null);
      setLoading(false);
      setInitialized(true);
      return false;
    }
  }, [verifyToken, fetchUserProfile]);

  // Initial auth check on app load
  useEffect(() => {
    const init = async () => {
      await checkAuthStatus();
      setRefreshAttempted(false);
    };
    init();
  }, [checkAuthStatus]);

  // Periodic token refresh
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const authApi = createAuthRequest();
      authApi
        .post(`${AUTH_URL}/api/v1/token/refresh/`)
        .then((res) => {
          if (res.data?.access) {
            setAccessToken(res.data.access);
          }
        })
        .catch(() => {
          checkAuthStatus();
        });
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, checkAuthStatus]);

  const getToken = useCallback(() => {
    return getAccessToken();
  }, []);

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    try {
      return await checkAuthStatus();
    } finally {
      setLoading(false);
    }
  }, [checkAuthStatus]);

  // FIXED LOGIN FUNCTION
  const login = async (credentials) => {
    try {
      const loginData = {
        email: credentials.email,
        password: credentials.password,
      };

      const tokenUrl = `${AUTH_URL}/api/v1/token/obtain/`;
      const authApi = createAuthRequest();
      const response = await authApi.post(tokenUrl, loginData);

      if (response.data?.access) {
        setAccessToken(response.data.access);
      }

      // CHANGE: let checkAuthStatus fetch & set FULL user
      await checkAuthStatus();

      // CHANGE: DO NOT overwrite user with token-only data
      setInitialized(true);
      setLoading(false);
      setRefreshAttempted(false);

      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);

      let errorDetail = "Login failed. Please check your credentials.";

      if (error.response?.data?.detail) {
        errorDetail = error.response.data.detail;
      }

      return { success: false, error: errorDetail };
    }
  };

  // Logout
  const logout = async () => {
    try {
      const authApi = createAuthRequest();
      await authApi.post(`${AUTH_URL}/logout/`).catch(() => {});
    } finally {
      removeAccessToken();
      setUser(null);
      setInitialized(true);
      setLoading(false);
      setRefreshAttempted(false);
      window.location.href = "/login";
    }
  };

  const value = {
    user,
    setUser,
    loading,
    logout,
    login,
    refreshAuth,
    initialized,
    hasAuth: !!user,
    isAdmin,
    hasTtsAccess,
    checkAuthStatus,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
