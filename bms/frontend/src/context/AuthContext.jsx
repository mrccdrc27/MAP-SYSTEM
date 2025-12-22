// src/context/AuthContext.jsx
// Updated to use centralized auth service (matching TTS pattern)
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

const AuthContext = createContext();
const AUTH_URL = import.meta.env.VITE_AUTH_URL || "http://localhost:8003";

// API endpoints
const PROFILE_URL = `${AUTH_URL}/api/v1/users/profile/`;
const TOKEN_OBTAIN_URL = `${AUTH_URL}/api/v1/token/obtain/`;
const TOKEN_VERIFY_URL = `${AUTH_URL}/api/v1/token/verify/`;
const TOKEN_REFRESH_URL = `${AUTH_URL}/api/v1/token/refresh/`;
const LOGOUT_URL = `${AUTH_URL}/logout/`;

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

  // Check if user has ADMIN role for BMS system
  const isAdmin = useCallback(() => {
    return user && hasSystemRole(user, "bms", "ADMIN");
  }, [user]);

  // Check if user has FINANCE_HEAD role for BMS system
  const isFinanceHead = useCallback(() => {
    return user && hasSystemRole(user, "bms", "FINANCE_HEAD");
  }, [user]);

  // Check if user has any role for BMS system
  const hasBmsAccess = useCallback(() => {
    return user && hasAnySystemRole(user, "bms");
  }, [user]);

  // Get user's BMS role
  const getBmsRole = useCallback(() => {
    return user ? getSystemRole(user, "bms") : null;
  }, [user]);

  // Verify token with auth service
  const verifyToken = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) return false;

      // First check if token is expired locally
      if (isTokenExpired(token)) {
        return false;
      }

      const authApi = createAuthRequest();
      const response = await authApi.post(TOKEN_VERIFY_URL, {
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
      // If profile fetch fails, at least return token user data
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
        
        // Check if user has BMS access
        if (!hasAnySystemRole(userData, "bms")) {
          console.warn("User does not have BMS access");
          removeAccessToken();
          setUser(null);
          setLoading(false);
          setInitialized(true);
          return false;
        }

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
    };
    init();
  }, [checkAuthStatus]);

  // Periodic token refresh
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const authApi = createAuthRequest();
      authApi
        .post(TOKEN_REFRESH_URL)
        .then((res) => {
          if (res.data?.access) {
            setAccessToken(res.data.access);
          }
        })
        .catch(() => {
          checkAuthStatus();
        });
    }, 10 * 60 * 1000); // Refresh every 10 minutes

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

  // Login function
  const login = async (credentials) => {
    try {
      const loginData = {
        email: credentials.email,
        password: credentials.password,
      };

      const authApi = createAuthRequest();
      const response = await authApi.post(TOKEN_OBTAIN_URL, loginData);

      if (response.data?.access) {
        setAccessToken(response.data.access);
      }

      // Let checkAuthStatus fetch & set FULL user
      const authSuccess = await checkAuthStatus();
      
      if (!authSuccess) {
        return { 
          success: false, 
          error: "You do not have access to the Budget Management System." 
        };
      }

      setInitialized(true);
      setLoading(false);

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

  // Logout function
  const logout = async () => {
    try {
      const authApi = createAuthRequest();
      await authApi.post(LOGOUT_URL).catch(() => {});
    } finally {
      removeAccessToken();
      setUser(null);
      setInitialized(true);
      setLoading(false);
      window.location.href = "/login";
    }
  };

  /**
   * Updates the user state in the context.
   * This is called after a successful profile update.
   * @param {object} updatedUserData - The updated user object.
   */
  const updateUserContext = (updatedUserData) => {
    setUser(prevUser => ({
      ...prevUser,
      ...updatedUserData,
      roles: prevUser?.roles, // Preserve roles from token
    }));
  };

  const value = {
    user,
    setUser,
    loading,
    logout,
    login,
    refreshAuth,
    initialized,
    isAuthenticated: !!user,
    hasAuth: !!user,
    isAdmin,
    isFinanceHead,
    hasBmsAccess,
    getBmsRole,
    checkAuthStatus,
    getToken,
    updateUserContext,
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