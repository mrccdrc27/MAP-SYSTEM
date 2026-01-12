import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { logout as apiLogout } from '../services/authService';
import { clearAuthState, setUserType } from '../utils/storage';
import { setOnUnauthorizedCallback, apiRequest } from '../services/api';
import { USER_TYPES } from '../utils/constants';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Handle unauthorized (401) from any API call - silent on login page
  const handleUnauthorized = useCallback(() => {
    // Don't log on login pages - 401 is expected there
    const isLoginPage = window.location.pathname.includes('/employee') || 
                        window.location.pathname.includes('/login') ||
                        window.location.pathname === '/';
    if (!isLoginPage) {
      console.log('Unauthorized - clearing auth state');
    }
    clearAuthState();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Register the global 401 handler
  useEffect(() => {
    setOnUnauthorizedCallback(handleUnauthorized);
    return () => setOnUnauthorizedCallback(null);
  }, [handleUnauthorized]);

  // Check authentication status by calling the unified /api/me/ endpoint
  const checkAuth = useCallback(async () => {
    // Import here to avoid circular dependency issues
    const { UNIFIED_ME } = await import('../services/endpoints');
    setLoading(true);
    
    try {
      // Use unified /api/me/ endpoint that detects user type from cookie
      const response = await apiRequest(UNIFIED_ME, { method: 'GET' });
      
      // Must have ok response AND valid user data
      if (response.ok && response.data) {
        const { type, data } = response.data;
        
        // Store user type for subsequent API calls
        if (type === 'employee') {
          setUserType(USER_TYPES.EMPLOYEE);
        } else {
          setUserType(USER_TYPES.STAFF);
        }
        
        setUser(data);
        setIsAuthenticated(true);
      } else {
        // Not authenticated or invalid response
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      // Only log errors if not on login page (401 is expected there)
      const isLoginPage = window.location.pathname.includes('/employee') || 
                          window.location.pathname.includes('/login') ||
                          window.location.pathname === '/';
      if (!isLoginPage) {
        console.error('Auth check failed:', error);
      }
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Login handler (called after successful API login)
  const login = useCallback((userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  // Logout handler
  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthState();
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  // Update user data
  const updateUser = useCallback((userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  }, []);

  // Check auth on mount - but skip on login pages to avoid unnecessary 401 errors
  useEffect(() => {
    const path = window.location.pathname;
    // Only skip auth check on actual login pages
    const isLoginPage = path === '/employee' || 
                        path === '/login' ||
                        path === '/' ||
                        path.startsWith('/login/') ||
                        path === '/forgot-password' ||
                        path === '/reset-password';
    
    if (isLoginPage) {
      // On login pages, just mark as not authenticated without making API call
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    } else {
      checkAuth();
    }
  }, [checkAuth]);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
