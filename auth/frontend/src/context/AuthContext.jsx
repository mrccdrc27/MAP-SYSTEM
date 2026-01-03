import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, logout as apiLogout } from '../api/auth';
import { clearAuthState, setOnUnauthorizedCallback } from '../api/config';

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

  // Handle unauthorized (401) from any API call
  const handleUnauthorized = useCallback(() => {
    console.log('Unauthorized - clearing auth state');
    clearAuthState();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Register the global 401 handler
  useEffect(() => {
    setOnUnauthorizedCallback(handleUnauthorized);
    return () => setOnUnauthorizedCallback(null);
  }, [handleUnauthorized]);

  // Check authentication status by calling /api/me
  const checkAuth = useCallback(async () => {
    setLoading(true);
    
    try {
      // Call /api/me - the browser will automatically include cookies
      const response = await getMe();
      
      // Must have ok response AND valid user data (with id or email)
      if (response.ok && response.data && (response.data.id || response.data.email)) {
        setUser(response.data);
        setIsAuthenticated(true);
      } else {
        // Not authenticated or invalid response
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
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

  // Check auth on mount
  useEffect(() => {
    checkAuth();
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
