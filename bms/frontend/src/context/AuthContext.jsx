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

// Auth service base URL - controlled by environment variable
// Production: https://api.ticketing.mapactive.tech
// Docker: http://localhost:8001
const AUTH_URL = (
  import.meta.env.VITE_AUTH_URL || "http://localhost:8001"
).replace(/\/$/, "");

const TOKEN_OBTAIN_URL = `${AUTH_URL}/api/v1/users/login/api/`;
const PROFILE_URL = `${AUTH_URL}/api/v1/users/profile/`;
const LOGOUT_URL = `${AUTH_URL}/api/v1/users/logout/`;

const extractDepartmentInfo = (userData) => {
  // Handle multiple possible department field names from JWT/API
  const departmentName = 
    userData.department_name || 
    userData.department || 
    userData.dept_name || 
    null;
    
  const departmentId = 
    userData.department_id || 
    userData.dept_id || 
    null;

  return {
    ...userData,
    department_name: departmentName,
    department: departmentName, // Backwards compatibility
    department_id: departmentId,
    dept_id: departmentId, // Backwards compatibility
  };
};


// MODIFICATION START
// URL for manual refresh within Context (matches api.js correction)
const REFRESH_URL = `${AUTH_URL}/api/v1/token/refresh/cookie/`;
// MODIFICATION END

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
    withCredentials: true, // Enable cookies for cross-origin requests
  });
};

const CentralAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const isAdmin = useCallback(
    () => user && hasSystemRole(user, "bms", "ADMIN"),
    [user],
  );
  const isFinanceHead = useCallback(
    () => user && hasSystemRole(user, "bms", "FINANCE_HEAD"),
    [user],
  );
  const hasBmsAccess = useCallback(
    () => user && hasAnySystemRole(user, "bms"),
    [user],
  );
  const getBmsRole = useCallback(
    () => (user ? getSystemRole(user, "bms") : null),
    [user],
  );

  // Check for tokens in URL (from centralized auth redirect)
  const checkUrlForTokens = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get("access_token");
    const refreshToken = urlParams.get("refresh_token");

    // DEBUG: show whether tokens exist in URL (do NOT print raw tokens)
    console.log("[Auth] URL params found:", {
      has_access_token: !!accessToken,
      has_refresh_token: !!refreshToken,
      raw_search: window.location.search,
    });

    if (accessToken) {
      setAccessToken(accessToken);
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }

      // 🔍 DEBUG - Verify storage worked (presence-only)
      console.log("[Auth] Stored tokens - verify:", {
        accessInStorage: !!localStorage.getItem("accessToken"),
        refreshInStorage: !!localStorage.getItem("refreshToken"),
      });

      // DEBUG: log decoded user info from token (non-sensitive fields only)
      try {
        const decoded = getUserFromToken();
        console.log("[Auth] Decoded token user (if available):", {
          username: decoded?.username,
          email: decoded?.email,
          roles: decoded?.roles,
        });
      } catch (e) {
        console.warn("[Auth] Failed to decode token for debug:", e);
      }

      // Clean URL to remove tokens
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);

      // DEBUG: confirm URL cleaned
      console.log("[Auth] Cleaned URL ->", window.location.href);

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

  // MODIFICATION START
  // Check Auth Status
  const checkAuthStatus = useCallback(async () => {
    try {
      // FIRST: Check if tokens are in URL (from centralized auth redirect)
      const foundInUrl = checkUrlForTokens();

      if (foundInUrl) {
        console.log("[Auth] Tokens found in URL, will fetch profile");
      }

      const token = getAccessToken();

      // DEBUG: token presence / expiry
      console.log("[Auth] Token presence / expiry:", {
        token_present: !!token,
        token_expired: token ? isTokenExpired(token) : null,
      });

      // Always attempt to fetch profile (works with cookies OR localStorage token)
      if (!token && !foundInUrl) {
        console.log(
          "[Auth] No local token. Attempting Cookie/SSO validation...",
        );
      } else {
        console.log(
          "[Auth] Token found or in URL, attempting to fetch profile",
        );
      }

      // Logic: Wrap profile fetch to handle 401s manually since this axios instance lacks interceptors
      let userData;
      try {
        const response = await createAuthRequest().get(PROFILE_URL);
        userData = response.data;
      } catch (err) {
        // If 401 Unauthorized, try to refresh the token manually
        if (err.response && err.response.status === 401) {
          console.log(
            "[Auth] Profile returned 401. Attempting one-time refresh via Context...",
          );

          // Attempt Manual Refresh
          await axios.post(
            REFRESH_URL,
            {}, // Empty body
            {
              withCredentials: true,
              headers: { "Content-Type": "application/json" },
            },
          );

          console.log("[Auth] Refresh successful. Retrying profile fetch...");
          // Retry Profile Fetch
          const retryResponse = await createAuthRequest().get(PROFILE_URL);
          userData = retryResponse.data;
        } else {
          // Throw other errors to be caught by the outer catch
          throw err;
        }
      }

      // Map system_roles to roles format
      if (userData.system_roles) {
        userData.roles = userData.system_roles.map((r) => ({
          system: r.system_slug || r.system,
          role: r.role_name || r.role,
        }));
      }

      if (!hasAnySystemRole(userData, "bms")) {
        console.error("[Auth] No BMS Access.");
        setUser(null);
        setLoading(false);
        setInitialized(true);
        return false;
      }

      const enhancedUserData = extractDepartmentInfo(userData);
      console.log('[Auth] Enhanced user data with department:', {
        department_name: enhancedUserData.department_name,
        department_id: enhancedUserData.department_id,
      });

      console.log("[Auth] User authenticated with BMS access");
      setUser(enhancedUserData);
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
        const enhancedLocalUser = extractDepartmentInfo(localUser);
        console.log('[Auth] Enhanced local token user with department:', {
          department_name: enhancedLocalUser.department_name,
          department_id: enhancedLocalUser.department_id,
        });
        console.log("[Auth] Recovering session from local token");
        setUser(enhancedLocalUser);
        setLoading(false);
        setInitialized(true);
        return true;
      }

      // Failed
      console.log("[Auth] Authentication failed completely");
      setUser(null);
      setLoading(false);
      setInitialized(true);

      // Force redirect to Central Login if auth fails (prevents showing local 404/Login)
      const USE_CENTRAL_AUTH = import.meta.env.VITE_USE_CENTRAL_AUTH === "true";
      if (USE_CENTRAL_AUTH) {
        console.log(
          "[Auth] Redirecting to Centralized Login due to session expiry...",
        );
        window.location.href = "https://login.ticketing.mapactive.tech/staff";
      }

      return false;
    }
  }, [fetchUserProfile, checkUrlForTokens]);
  // MODIFICATION END

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Login Function (for local BMS login page - Docker mode)
  const login = async (credentials) => {
    try {
      console.log("[Auth] Logging in via API...", credentials.email);
      const authApi = createAuthRequest();

      const payload = {
        email: credentials.email,
        password: credentials.password,
        g_recaptcha_response: credentials.g_recaptcha_response || "",
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

        // Store BOTH access and refresh tokens if provided
        if (response.data.access_token) {
          console.log("[Auth] Storing access_token in localStorage");
          setAccessToken(response.data.access_token);
        }

        if (response.data.refresh_token) {
          console.log("[Auth] Storing refresh_token in localStorage");
          localStorage.setItem("refreshToken", response.data.refresh_token);
        }

        // Decode the token to get user data with roles
        const decodedUser = getUserFromToken();

        if (!decodedUser) {
          console.error("[Auth] Failed to decode token after login");
          return { success: false, error: "Invalid token received" };
        }

        console.log("[Auth] Decoded user from token:", decodedUser);

        // Verify BMS Access
        if (!hasAnySystemRole(decodedUser, "bms")) {
          console.error(
            "[Auth] No BMS Access after login. User roles:",
            decodedUser?.roles,
          );
          return { success: false, error: "No BMS Access." };
        }

        // Set User State
        const enhancedDecodedUser = extractDepartmentInfo(decodedUser);
        console.log('[Auth] Enhanced decoded user with department:', {
          department_name: enhancedDecodedUser.department_name,
          department_id: enhancedDecodedUser.department_id,
        });
        console.log("[Auth] Setting user state from token");
        setUser(enhancedDecodedUser);
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
          errs.g_recaptcha_response?.[0] ||
          msg;
      } else if (errorData?.detail) {
        msg = errorData.detail;
      } else if (errorData?.message) {
        msg = errorData.message;
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
      // Clean up both tokens
      removeAccessToken();
      localStorage.removeItem("refreshToken");
      setUser(null);
      setInitialized(true);
      setLoading(false);

      // Determine redirect URL based on environment
      // Production: centralized login
      // Docker: BMS login page
      const isProduction = import.meta.env.VITE_USE_CENTRAL_AUTH === "true";
      const logoutUrl = isProduction
        ? "https://login.ticketing.mapactive.tech/staff"
        : "/login";

      console.log("[Auth] Redirecting to login:", logoutUrl);

      if (isProduction) {
        window.location.href = logoutUrl;
      } else {
        window.location.pathname = logoutUrl;
      }
    }
  };

  const updateUserContext = (updatedUserData) => {
    setUser((prevUser) => ({ ...prevUser, ...updatedUserData }));
  };

  const getDepartmentInfo = useCallback(() => {
    if (!user) return null;

    return {
      id: user.department_id || user.dept_id || null,
      name: user.department_name || user.department || 'Unknown Department',
    };
  }, [user]);

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
    getDepartmentInfo, // ✅ NEW
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
