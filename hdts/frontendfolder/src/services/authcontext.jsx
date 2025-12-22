// src/api/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { 
  hasAccessToken, 
  getAccessToken,
  setAccessToken,
  removeAccessToken,
  getUserFromToken,
  hasSystemRole,
  hasAnySystemRole
} from './TokenUtils';

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
    withCredentials: true  // Ensure cookies are sent with requests
  });
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [refreshAttempted, setRefreshAttempted] = useState(false);
  
  // Check if user has admin role for TTS system
  const isAdmin = useCallback(() => {
    return user && hasSystemRole(user, 'tts', 'Admin');
  }, [user]);
  
  // Check if user has any role for TTS system
  const hasTtsAccess = useCallback(() => {
    return user && hasAnySystemRole(user, 'tts');
  }, [user]);

  // Helper function to verify token with the auth service
  const verifyToken = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) return false;
      
      // Call the token verify endpoint with correct URL path including api/v1
      const authApi = createAuthRequest();
      const response = await authApi.post(`${AUTH_URL}/api/v1/token/verify/`, { token });
      return response.status === 200;
    } catch (error) {
      console.error("Token verification failed:", error);
      return false;
    }
  }, []);

  // Fetch user profile from token
  const fetchUserProfile = useCallback(async () => {
    try {
      // First get basic user info from token
      const tokenUser = getUserFromToken();
      if (!tokenUser) {
        throw new Error('Invalid token');
      }
      
      // Then fetch full profile from API
      const authApi = createAuthRequest();
      const response = await authApi.get(PROFILE_URL, {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`
        }
      });
      
      if (response.data) {
        // Merge token data with profile data
        return {
          ...tokenUser,
          ...response.data,
          // Ensure roles from token are preserved
          roles: tokenUser.roles
        };
      }
      throw new Error('Failed to fetch user profile');
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Fall back to token data if API call fails
      return getUserFromToken();
    }
  }, []);

  // Check auth status and update user state
  const checkAuthStatus = useCallback(async (force = false) => {
    console.log('Checking authentication status...');
    
    if (!hasAccessToken()) {
      console.log('No access token found');
      setUser(null);
      setLoading(false);
      setInitialized(true);
      return false;
    }

    try {
      // Verify token with auth service
      const isValid = await verifyToken();
      console.log('Token is valid:', isValid);
      
      if (isValid) {
        try {
          const userData = await fetchUserProfile();
          console.log('User data retrieved:', userData);
          setUser(userData);
          setLoading(false);
          setInitialized(true);
          return true;
        } catch (error) {
          // If we get a verification failure, try refreshing the token before giving up
          if (!refreshAttempted) {
            try {
              // Try to refresh token
              console.log('Attempting to refresh token...');
              const authApi = createAuthRequest();
              const refreshResponse = await authApi.post(`${AUTH_URL}/api/v1/token/refresh/`);
              
              if (refreshResponse.data && refreshResponse.data.access) {
                // Save new token to localStorage
                setAccessToken(refreshResponse.data.access);
                setRefreshAttempted(true);
                
                // Try profile again after refresh
                try {
                  const userData = await fetchUserProfile();
                  setUser(userData);
                  setLoading(false);
                  setInitialized(true);
                  return true;
                } catch (profileError) {
                  removeAccessToken();
                  setUser(null);
                  setLoading(false);
                  setInitialized(true);
                  return false;
                }
              }
            } catch (refreshError) {
              console.error("Token refresh failed:", refreshError);
              // Refresh failed, user is not authenticated
              removeAccessToken();
              setUser(null);
              setLoading(false);
              setInitialized(true);
              return false;
            }
          }
        }
      }
      
      // Token invalid or couldn't extract user data
      console.log('Token is invalid or user data extraction failed');
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
  }, [verifyToken, fetchUserProfile, refreshAttempted]);

  // Initial authentication check on component mount
  useEffect(() => {
    const initialCheck = async () => {
      // Force an immediate check
      await checkAuthStatus(true);
      setRefreshAttempted(false); // Reset for future checks
    };
    
    initialCheck();
  }, []); // Only run once on mount

  // Periodically check auth status to prevent session timeout issues
  useEffect(() => {
    // Only run this if user is already authenticated
    if (!user) return;
    
    // Set up a periodic refresh every 10 minutes
    const refreshInterval = setInterval(() => {
      const authApi = createAuthRequest();
      authApi.post(`${AUTH_URL}/api/v1/token/refresh/`)
        .then(response => {
          if (response.data && response.data.access) {
            setAccessToken(response.data.access);
          }
        })
        .catch(() => {
          // If refresh fails, check auth status
          checkAuthStatus(true); // Force check to immediately update UI
        });
    }, 10 * 60 * 1000); // 10 minutes
    
    return () => clearInterval(refreshInterval);
  }, [user, checkAuthStatus]);

  // Function to get the current token - useful for components that need direct token access
  const getToken = useCallback(() => {
    return getAccessToken();
  }, []);

  // Refresh auth data
  const refreshAuth = useCallback(async () => {
    setLoading(true);
    try {
      const result = await checkAuthStatus(true); // Force refresh
      return result;
    } finally {
      setLoading(false);
    }
  }, [checkAuthStatus]);

  // Login function
  const login = async (credentials) => {
    try {
      // Log the credentials being sent (without the password for security)
      console.log('Sending login request with email:', credentials.email);
      
      // Format the login data exactly as expected by the backend
      const loginData = {
        email: credentials.email, 
        password: credentials.password,
      };
      
      // Use the correct URL with api/v1 prefix
      const baseUrl = import.meta.env.VITE_AUTH_URL || "";
      const tokenUrl = `${baseUrl}/api/v1/token/obtain/`;
      
      console.log('Sending login request to:', tokenUrl);
      
      // Create a separate axios instance for this specific request
      const authApi = createAuthRequest();
      const response = await authApi.post(tokenUrl, loginData);
      
      // Check if we have access token in the response
      if (response.data && response.data.access) {
        // Save token to localStorage
        setAccessToken(response.data.access);
      }
      
      // Immediately verify and get user data
      await checkAuthStatus(true);
      
      // Get user data from token
      const userData = getUserFromToken();
      if (userData) {
        console.log('User authenticated successfully:', userData);
        setUser(userData);
        setInitialized(true);
        setLoading(false);
        setRefreshAttempted(false);
        return { success: true };
      } else {
        console.error("Failed to extract user data from token");
        return { 
          success: false, 
          error: "Authentication succeeded but failed to get user data" 
        };
      }
    } catch (error) {
      console.error("Login failed:", error);
      
      // Extract the most useful error message from the response
      let errorDetail = "Login failed. Please check your credentials.";
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorDetail = error.response.data;
        } else if (error.response.data.detail) {
          errorDetail = error.response.data.detail;
        } else if (error.response.data.non_field_errors) {
          errorDetail = Array.isArray(error.response.data.non_field_errors) 
            ? error.response.data.non_field_errors.join(', ') 
            : error.response.data.non_field_errors;
        } else if (error.response.data.email) {
          errorDetail = Array.isArray(error.response.data.email)
            ? error.response.data.email.join(', ')
            : error.response.data.email;
        } else if (error.response.data.username) {
          errorDetail = Array.isArray(error.response.data.username)
            ? error.response.data.username.join(', ')
            : error.response.data.username;
        } else if (error.response.data.error_code === 'otp_required') {
          errorDetail = "OTP code is required. Please provide your 2FA code.";
        }
      }
      
      return { 
        success: false, 
        error: errorDetail
      };
    }
  };

  // Logout function - currently has no logout endpoint, so just clear state
  const logout = async () => {
    try {
      // Try to call the logout endpoint if available
      const authApi = createAuthRequest();
      await authApi.post(`${AUTH_URL}/logout/`, {}, {
        withCredentials: true
      }).catch(err => console.warn('Logout API call failed:', err));
    } finally {
      // Always clean up local state
      removeAccessToken();
      setUser(null);
      setInitialized(true); // Keep initialized true to avoid infinite checks
      setLoading(false);
      setRefreshAttempted(false);
      // Redirect to login page
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
    getToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};