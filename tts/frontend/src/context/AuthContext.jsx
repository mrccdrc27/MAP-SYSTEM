// src/context/AuthContext.jsx
// Cookie-based authentication - NO localStorage for JWT tokens
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import axios from "axios";

const AuthContext = createContext();
const AUTH_URL = import.meta.env.VITE_AUTH_URL || "";

// API endpoints
const ME_URL = `${AUTH_URL}/api/me/`; // Unified endpoint for both User and Employee
const PROFILE_URL = `${AUTH_URL}/api/v1/users/profile/`;
const LOGIN_URL = `${AUTH_URL}/api/v1/token/obtain/`;
const LOGOUT_URL = `${AUTH_URL}/api/v1/users/logout/`; // Updated to match auth service endpoint
const TOKEN_REFRESH_URL = `${AUTH_URL}/api/v1/token/refresh/cookie/`; // Cookie-based refresh

// Default refresh interval (fallback if server doesn't provide expires_in)
const DEFAULT_TOKEN_LIFETIME_SECONDS = 300; // 5 minutes
// Refresh buffer: refresh token when 80% of its lifetime has passed
const REFRESH_BUFFER_RATIO = 0.8;

// Create auth API instance for auth service requests
const createAuthRequest = () => {
  return axios.create({
    baseURL: AUTH_URL,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true, // Essential for cookie-based auth
  });
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [tokenExpiresIn, setTokenExpiresIn] = useState(DEFAULT_TOKEN_LIFETIME_SECONDS);
  const refreshTimeoutRef = useRef(null);

  const clearAuth = useCallback(() => {
    setUser(null);
    // Clear refresh timeout when logging out
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  // Calculate next refresh time based on token expiration
  const calculateRefreshInterval = useCallback((expiresInSeconds) => {
    // Refresh at 80% of token lifetime to ensure we refresh before expiry
    const refreshMs = Math.max(expiresInSeconds * REFRESH_BUFFER_RATIO * 1000, 5000); // Min 5 seconds
    if (import.meta.env.DEV) {
      console.debug(`AuthContext: Token expires in ${expiresInSeconds}s, will refresh in ${refreshMs / 1000}s`);
    }
    return refreshMs;
  }, []);

  // Schedule next token refresh
  const scheduleTokenRefresh = useCallback((expiresInSeconds) => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    const refreshMs = calculateRefreshInterval(expiresInSeconds);
    const authApi = createAuthRequest();
    
    refreshTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await authApi.post(TOKEN_REFRESH_URL);
        if (response.status === 200) {
          const newExpiresIn = response.data.expires_in || DEFAULT_TOKEN_LIFETIME_SECONDS;
          setTokenExpiresIn(newExpiresIn);
          if (import.meta.env.DEV) {
            console.debug('AuthContext: Token refreshed successfully, expires_in:', newExpiresIn);
          }
          // Schedule next refresh based on new expiration
          scheduleTokenRefresh(newExpiresIn);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.debug('AuthContext: Token refresh failed:', error.response?.status);
        }
        // If refresh fails (401), clear auth state
        if (error.response?.status === 401) {
          clearAuth();
        } else {
          // Retry sooner on network errors
          scheduleTokenRefresh(10); // Retry in ~8 seconds
        }
      }
    }, refreshMs);
    
    if (import.meta.env.DEV) {
      console.debug(`AuthContext: Token refresh scheduled in ${refreshMs / 1000}s`);
    }
  }, [clearAuth, calculateRefreshInterval]);

  // Initial token refresh to get expiration time
  const initializeTokenRefresh = useCallback(async () => {
    try {
      const authApi = createAuthRequest();
      const response = await authApi.post(TOKEN_REFRESH_URL);
      if (response.status === 200) {
        const expiresIn = response.data.expires_in || DEFAULT_TOKEN_LIFETIME_SECONDS;
        setTokenExpiresIn(expiresIn);
        if (import.meta.env.DEV) {
          console.debug('AuthContext: Initial token refresh, expires_in:', expiresIn);
        }
        // Schedule next refresh
        scheduleTokenRefresh(expiresIn);
        return true;
      }
      return false;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('AuthContext: Initial token refresh failed:', error.response?.status);
      }
      return false;
    }
  }, [scheduleTokenRefresh]);

  // Check if user has admin role for TTS system
  const isAdmin = useCallback(() => {
    if (!user || !user.system_roles || !Array.isArray(user.system_roles)) {
      return false;
    }
    return user.system_roles.some(
      (r) => r.system_slug === "tts" && r.role_name === "Admin"
    );
  }, [user]);

  // Check if user has any role for TTS system
  const hasTtsAccess = useCallback(() => {
    if (!user || !user.system_roles || !Array.isArray(user.system_roles)) {
      return false;
    }
    return user.system_roles.some((r) => r.system_slug === "tts");
  }, [user]);

  // Fetch user profile from /api/me/ endpoint
  const fetchUserProfile = useCallback(async () => {
    try {
      const authApi = createAuthRequest();
      
      // Try unified /api/me/ endpoint first
      try {
        const response = await authApi.get(ME_URL);
        if (response.status === 200 && response.data.type && response.data.data) {
          const userType = response.data.type;
          const profileData = response.data.data;
          
          if (import.meta.env.DEV) {
            console.debug('AuthContext: Fetched profile from /api/me/, type:', userType);
          }
          
          return {
            ...profileData,
            userType: userType,
          };
        }
      } catch (meError) {
        // Fallback to profile endpoint
        if (import.meta.env.DEV) {
          console.debug('AuthContext: /api/me/ failed, trying fallback');
        }
      }
      
      // Fallback to /api/v1/users/profile/
      const response = await authApi.get(PROFILE_URL);
      if (response.data) {
        return {
          ...response.data,
          userType: 'user',
        };
      }
      
      return null;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('AuthContext: Failed to fetch user profile:', error.response?.status);
      }
      return null;
    }
  }, []);

  // Central auth checker
  const checkAuthStatus = useCallback(async () => {
    try {
      const userData = await fetchUserProfile();
      
      if (userData) {
        setUser(userData);
        initializeTokenRefresh();
        setLoading(false);
        setInitialized(true);
        return true;
      }
      
      clearAuth();
      setLoading(false);
      setInitialized(true);
      return false;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('AuthContext: Auth check failed:', error);
      }
      clearAuth();
      setLoading(false);
      setInitialized(true);
      return false;
    }
  }, [fetchUserProfile, clearAuth, initializeTokenRefresh]);

  // Initial auth check on app load
  useEffect(() => {
    checkAuthStatus();
    
    // Cleanup timeout on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [checkAuthStatus]);

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
      const response = await authApi.post(LOGIN_URL, loginData);

      if (response.status === 200) {
        // Cookie set by server, fetch profile
        const success = await checkAuthStatus();
        return { success };
      }
      
      return { success: false, error: "Invalid login response" };
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
      await authApi.post(LOGOUT_URL).catch(() => {});
    } finally {
      clearAuth();
      setInitialized(true);
      setLoading(false);
      window.location.href = "/login";
    }
  };

  const value = useMemo(
    () => ({
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
      tokenExpiresIn, // Expose current token expiration for debugging
    }),
    [user, loading, initialized, isAdmin, hasTtsAccess, checkAuthStatus, refreshAuth, tokenExpiresIn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
