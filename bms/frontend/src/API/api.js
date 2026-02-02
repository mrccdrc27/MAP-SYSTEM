// bms/frontend/src/API/api.js
import axios from "axios";
import {
  getAccessToken,
  setAccessToken,
  removeAccessToken,
} from "./TokenUtils";

// BMS Backend API URL (for budget operations)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8001/api";

// Auth service URL (for token refresh)
const AUTH_URL = import.meta.env.VITE_AUTH_URL || "http://localhost:8003";
const USE_CENTRAL_AUTH = import.meta.env.VITE_USE_CENTRAL_AUTH === "true";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // CRITICAL: Enable credentials for cookie-based auth
  headers: {
    "Content-Type": "application/json",
  },
});

// Will automatically add the JWT to every request
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Singleton pattern for token refresh
let refreshTokenPromise = null;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor: Handle automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if the error is 401 and it's not a retry request
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If a refresh is already in progress, queue the original request
      if (refreshTokenPromise) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newAccessToken) => {
            originalRequest.headers["Authorization"] =
              "Bearer " + newAccessToken;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;

      // Start the refresh token request
      refreshTokenPromise = new Promise(async (resolve, reject) => {
        try {
          console.log(
            "[api.js] Attempting token refresh via centralized auth service...",
          );

          // If central auth isn't enabled, skip central logic and redirect to local login
          if (!USE_CENTRAL_AUTH) {
            console.warn(
              "[api.js] Central auth disabled (VITE_USE_CENTRAL_AUTH=false). Redirecting to local login.",
            );
            // Clean up tokens and redirect to local login route handled by LocalAuthProvider
            removeAccessToken();
            localStorage.removeItem("refreshToken");
            window.location.href = "/login";
            reject(new Error("Central auth disabled - redirecting to local login"));
            return;
          }

          // Primary: Cookie-based (current)
          let response = await axios.post(
            `${AUTH_URL}/auth/api/v1/token/refresh/cookie/`,
            {}, // Empty body
            { withCredentials: true, headers: { "Content-Type": "application/json" } },
          );

          // If succeeds, proceed (cookie refresh may not return access token body)
          if (response.status === 200 &&
            (response.data.message === "Token refreshed successfully" || response.data.message === "Token refreshed")) {
            console.log("[api.js] ✅ Cookie-based refresh succeeded");
            processQueue(null, "token_refreshed");
            resolve("token_refreshed");
            return;
          }

          // Fallback: If cookie fails or doesn't return token, try body-based if refresh_token in localStorage
          console.warn("[api.js] ⚠️ Cookie refresh did not yield token, attempting body fallback...");
          const refreshToken = localStorage.getItem("refreshToken");
          if (!refreshToken) throw new Error("No fallback refresh token in localStorage");

          response = await axios.post(
            `${AUTH_URL}/auth/api/v1/token/refresh/cookie/`, // Use same endpoint (server needs to support body fallback)
            { refresh: refreshToken }, // Body payload (they need to support this)
            { withCredentials: true, headers: { "Content-Type": "application/json" } },
          );

          if (response.status === 200 && response.data.access) {
            console.log("[api.js] ✅ Body fallback refresh succeeded");
            setAccessToken(response.data.access);
            processQueue(null, response.data.access);
            resolve(response.data.access);
            return;
          } else {
            throw new Error("Fallback refresh failed");
          }
        } catch (refreshError) {
          console.error("[api.js] ❌ Token refresh failed:", refreshError);

          // Clean up both tokens
          removeAccessToken();
          localStorage.removeItem("refreshToken");

          processQueue(refreshError, null);
          reject(refreshError);

          // ✅ FIX: Redirect to CENTRALIZED login page
          const centralLoginUrl =
            "https://login.ticketing.mapactive.tech/staff";
          console.log(
            "[api.js] Redirecting to centralized login:",
            centralLoginUrl,
          );
          window.location.href = centralLoginUrl;
        } finally {
          refreshTokenPromise = null;
        }
      });

      return refreshTokenPromise.then(() => api(originalRequest));
    }

    return Promise.reject(error);
  },
);

export default api;
