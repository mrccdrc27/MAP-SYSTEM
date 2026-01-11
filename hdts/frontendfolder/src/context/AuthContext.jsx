// src/context/AuthContext.jsx
// Cookie-based authentication - NO localStorage for JWT tokens
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import axios from "axios";

const AuthContext = createContext(undefined);
// Use relative URLs to go through Vite proxy (makes cookies same-origin)
// In production, set VITE_AUTH_URL to the actual backend URL
const AUTH_URL = import.meta.env.VITE_AUTH_URL || "";
const ME_URL = `${AUTH_URL}/api/me/`; // Unified endpoint for both User and Employee
const LOGIN_URL = `${AUTH_URL}/api/v1/token/obtain/`;
const LOGOUT_URL = `${AUTH_URL}/api/v1/token/logout/`;
const TOKEN_REFRESH_URL = `${AUTH_URL}/api/v1/token/refresh/cookie/`; // New unified refresh endpoint

// Default refresh interval (fallback if server doesn't provide expires_in)
const DEFAULT_TOKEN_LIFETIME_SECONDS = 300; // 5 minutes
// Refresh buffer: refresh token when 80% of its lifetime has passed
const REFRESH_BUFFER_RATIO = 0.8;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [tokenExpiresIn, setTokenExpiresIn] = useState(DEFAULT_TOKEN_LIFETIME_SECONDS);
  const refreshTimeoutRef = useRef(null);

  // Stable axios instance with credentials (cookies)
  const api = useMemo(() => {
    return axios.create({
      baseURL: AUTH_URL,
      headers: { "Content-Type": "application/json" },
      withCredentials: true, // crucial for cookie-based auth
    });
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    // Clear localStorage sync
    try {
      localStorage.removeItem('user');
    } catch (e) {
      // Ignore storage errors
    }
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
    
    refreshTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await api.post(TOKEN_REFRESH_URL);
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
  }, [api, clearAuth, calculateRefreshInterval]);

  // Initial token refresh to get expiration time
  const initializeTokenRefresh = useCallback(async () => {
    try {
      const response = await api.post(TOKEN_REFRESH_URL);
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
  }, [api, scheduleTokenRefresh]);

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await api.get(ME_URL);
      
      if (response.status === 200 && response.data.type && response.data.data) {
        const userType = response.data.type; // 'user' or 'employee'
        const profileData = response.data.data;
        
        // Extract role for HDTS system
        let hdtsRole = null;
        
        if (userType === 'employee') {
          hdtsRole = 'Employee';
        } else if (userType === 'user') {
          if (profileData && Array.isArray(profileData.system_roles)) {
            const hdts = profileData.system_roles.find(r => r.system_slug === "hdts");
            if (hdts) {
              hdtsRole = hdts.role_name;
            }
          }
        }
        
        // Normalize role label for UI: map backend 'Admin' to 'System Admin'
        const normalizedRole = (hdtsRole && typeof hdtsRole === 'string' && hdtsRole.trim().toLowerCase() === 'admin') 
          ? 'System Admin' 
          : hdtsRole;
        
        const userWithRole = { 
          ...profileData, 
          role: normalizedRole,
          userType: userType
        };
        
        setUser(userWithRole);
        
        // Sync to localStorage so authService.getCurrentUser() works
        try {
          localStorage.setItem('user', JSON.stringify(userWithRole));
        } catch (e) {
          // Ignore storage errors
        }
        
        // Initialize dynamic token refresh when user is authenticated
        initializeTokenRefresh();
        
        if (import.meta.env.DEV) {
          console.debug('AuthContext: User set with role:', normalizedRole, 'type:', userType);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('AuthContext: Failed to fetch user profile:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
      }
      clearAuth();
      return false;
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [api, clearAuth, initializeTokenRefresh]);

  // Check session on mount
  useEffect(() => {
    fetchUserProfile();
    
    // Cleanup timeout on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [fetchUserProfile]);

  const login = async (email, password) => {
    try {
      const response = await api.post(LOGIN_URL, { email, password });
      if (response.status === 200) {
        // Cookie set by server, fetch profile
        const success = await fetchUserProfile();
        return { success };
      }
      return { success: false, error: "Invalid login response" };
    } catch (error) {
      console.error("Login failed:", error);
      return {
        success: false,
        error: error.response?.data?.detail || "Login failed",
      };
    }
  };

  const logout = async () => {
    try {
      await api.post(LOGOUT_URL);
    } catch (e) {
      console.warn("Logout endpoint error:", e);
    }
    clearAuth();
    // Redirect to auth-frontend login page
    const authFrontendUrl = import.meta.env.VITE_AUTH_FRONTEND_URL || 'http://localhost:3001';
    window.location.href = `${authFrontendUrl}/employee`;
  };

  // Check if user has Admin role for HDTS (staff users only)
  const isAdmin = useMemo(() => {
    if (!user) return false;
    if (user.userType === 'employee') return false;
    if (!user.system_roles || !Array.isArray(user.system_roles)) return false;
    return user.system_roles.some(
      (r) => r.system_slug === "hdts" && r.role_name === "Admin"
    );
  }, [user]);

  const isTicketCoordinator = useMemo(() => {
    if (!user) return false;
    if (user.userType === 'employee') return false;
    if (!user.system_roles || !Array.isArray(user.system_roles)) return false;
    return user.system_roles.some(
      (r) => r.system_slug === "hdts" && r.role_name === "Ticket Coordinator"
    );
  }, [user]);

  const isEmployee = useMemo(() => {
    if (!user) return false;
    if (user.userType === 'employee') return true;
    if (!user.system_roles || !Array.isArray(user.system_roles)) return false;
    return user.system_roles.some(
      (r) => r.system_slug === "hdts" && r.role_name === "Employee"
    );
  }, [user]);
  
  const hasSystemAccess = useMemo(() => {
    if (!user) return false;
    if (user.userType === 'employee') return true;
    if (!user.system_roles || !Array.isArray(user.system_roles)) return false;
    return user.system_roles.some((r) => r.system_slug === "hdts");
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      setUser,
      login,
      logout,
      isTicketCoordinator,
      isAdmin,
      isEmployee,
      hasSystemAccess,
      loading,
      initialized,
      hasAuth: !!user,
      tokenExpiresIn, // Expose current token expiration for debugging
    }),
    [user, loading, initialized, isAdmin, isTicketCoordinator, isEmployee, hasSystemAccess, tokenExpiresIn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider. Make sure your component is wrapped by <AuthProvider>.");
  }
  return context;
};