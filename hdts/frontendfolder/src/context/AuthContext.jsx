// src/api/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import axios from "axios";

const AuthContext = createContext();
// Default to backend running on localhost:8003 when VITE_AUTH_URL is not provided
// This prevents the frontend dev server from answering API requests with HTML
// during local development.
const AUTH_URL = import.meta.env.VITE_AUTH_URL || "http://localhost:8003";
const ME_URL = `${AUTH_URL}/api/me/`; // New unified endpoint
const PROFILE_URL = `${AUTH_URL}/api/v1/users/profile/`; // Fallback
const LOGIN_URL = `${AUTH_URL}/api/v1/token/obtain/`;
const LOGOUT_URL = `${AUTH_URL}/api/v1/token/logout/`; // optional

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // ✅ Keep axios instance stable with useMemo
  const api = useMemo(() => {
    return axios.create({
      baseURL: AUTH_URL,
      headers: { "Content-Type": "application/json" },
      withCredentials: true, // crucial for cookie-based auth
    });
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  const fetchUserProfile = useCallback(async () => {
    try {
      if (import.meta.env.DEV) {
        console.debug('AuthContext: Fetching user profile from:', ME_URL);
        console.debug('AuthContext: Cookies:', typeof document !== 'undefined' ? document.cookie : 'n/a');
      }
      
      let response;
      let userType = 'user'; // default to staff user
      let profileData;
      
      try {
        // Try new unified endpoint first (/api/me/)
        response = await api.get(ME_URL);
        if (response.status === 200 && response.data.type && response.data.data) {
          userType = response.data.type; // 'user' or 'employee'
          profileData = response.data.data;
          if (import.meta.env.DEV) {
            console.debug('AuthContext: Fetched from /api/me/, type:', userType);
            console.debug('AuthContext: Profile response:', profileData);
          }
        }
      } catch (meError) {
        // Fallback to old endpoint if /api/me/ fails
        if (import.meta.env.DEV) {
          console.debug('AuthContext: /api/me/ failed, trying fallback:', PROFILE_URL);
        }
        response = await api.get(PROFILE_URL);
        profileData = response.data;
        userType = 'user'; // assume staff user for legacy endpoint
        if (import.meta.env.DEV) {
          console.debug('AuthContext: Fetched from fallback endpoint');
        }
      }
      
      if (response.status === 200) {
        // Extract role for hdts system
        let hdtsRole = null;
        
        if (userType === 'employee') {
          // Employee type: set role to 'Employee'
          hdtsRole = 'Employee';
          if (import.meta.env.DEV) console.debug('AuthContext: Employee user, role set to Employee');
        } else if (userType === 'user') {
          // User (staff) type: extract from system_roles
          if (profileData && Array.isArray(profileData.system_roles)) {
            if (import.meta.env.DEV) console.debug('AuthContext: System roles:', profileData.system_roles);
            const hdts = profileData.system_roles.find(r => r.system_slug === "hdts");
            if (hdts) {
              hdtsRole = hdts.role_name;
              if (import.meta.env.DEV) console.debug('AuthContext: Found HDTS role:', hdtsRole);
            } else {
              console.warn('AuthContext: No HDTS system role found in:', profileData.system_roles);
            }
          } else if (profileData && profileData.system_roles !== undefined) {
            console.warn('AuthContext: system_roles is not an array:', profileData.system_roles);
          }
        }
        
        // Normalize role label for UI: map backend 'Admin' to 'System Admin'
        const normalizedRole = (hdtsRole && typeof hdtsRole === 'string' && hdtsRole.trim().toLowerCase() === 'admin') ? 'System Admin' : hdtsRole;
        
        // Save user with hdtsRole and userType
        const userWithRole = { 
          ...profileData, 
          role: normalizedRole,
          userType: userType // track whether they're a 'user' or 'employee'
        };
        localStorage.setItem("user", JSON.stringify(userWithRole));
        setUser(userWithRole);
        if (import.meta.env.DEV) console.debug('AuthContext: User set with role:', normalizedRole, 'type:', userType);
      }
    } catch (error) {
      console.error("AuthContext: Failed to fetch user profile:", error);
      if (error?.response) {
        console.error("AuthContext: Error response:", error.response?.data);
        console.error("AuthContext: Error status:", error.response?.status);
      }
      clearAuth();
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [api, clearAuth]);

  // 🔁 Always check session on mount
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const login = async (email, password) => {
    try {
      const response = await api.post(LOGIN_URL, { email, password });
      if (response.status === 200) {
        // Cookie set by server, just fetch profile
        await fetchUserProfile();
        return { success: true };
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
      console.warn("Logout endpoint not available:", e);
    }
    clearAuth();
    window.location.href = "/login";
  };

  // --- HasSystemAccess is the access to the system (i.e. agent access)
  // --- isAdmin checks the designated Admin role for the system (i.e. responsible for the admin functionalities)
  // --- if a much more nuanced role system is needed, this logic can be expanded,

  // Check if user has Admin role for HDTS (staff users only)
  const isAdmin = useMemo(() => {
    if (!user) return false;
    
    // For employee type, they don't have admin access
    if (user.userType === 'employee') return false;
    
    // For staff users, check system_roles
    if (!user.system_roles || !Array.isArray(user.system_roles)) return false;
  
    return user.system_roles.some(
      (r) =>
        r.system_slug === "hdts" &&
        r.role_name === "Admin"
    );
  }, [user]);

  const isTicketCoordinator = useMemo(() => {
    if (!user) return false;
    
    // For employee type, they're not ticket coordinators
    if (user.userType === 'employee') return false;
    
    // For staff users, check system_roles
    if (!user.system_roles || !Array.isArray(user.system_roles)) return false;
  
    return user.system_roles.some(
      (r) =>
        r.system_slug === "hdts" &&
        r.role_name === "Ticket Coordinator"
    );
  }, [user]);

  // Check if user is an HDTS employee
  const isEmployee = useMemo(() => {
    if (!user) return false;
    
    // Employee type: always true
    if (user.userType === 'employee') return true;
    
    // Staff user: check system_roles for Employee role
    if (!user.system_roles || !Array.isArray(user.system_roles)) return false;
  
    return user.system_roles.some(
      (r) =>
        r.system_slug === "hdts" &&
        r.role_name === "Employee"
    );
  }, [user]);
  
  // Check system access - employees have access via userType, staff users via system_roles
  const hasSystemAccess = useMemo(() => {
    if (!user) return false;
  
    // Employee type always has system access
    if (user.userType === 'employee') return true;
    
    // Staff user: check for any HDTS system role
    if (!user.system_roles || !Array.isArray(user.system_roles)) return false;
  
    return user.system_roles.some(
      (r) => r.system_slug === "hdts"
    );
  }, [user]);

  // ✅ Memoize the context value
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
    }),
    [user, loading, isAdmin, isTicketCoordinator, isEmployee, hasSystemAccess]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};