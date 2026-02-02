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

          const response = await axios.post(
            `${AUTH_URL}/auth/api/v1/token/refresh/cookie/`,
            {},
            {
              withCredentials: true,
              headers: { "Content-Type": "application/json" },
            },
          );

          console.log("[api.js] Token refresh response:", response.data);

          // FIX: Backend sets new access_token cookie automatically
          // The new access_token is now in cookies, browser handles it
          if (
            response.data.message === "Token refreshed successfully" ||
            response.status === 200
          ) {
            console.log("[api.js] ✅ Token refreshed successfully via cookies");

            // Signal that refresh succeeded
            processQueue(null, "token_refreshed");
            resolve("token_refreshed");
          } else {
            throw new Error("Token refresh failed");
          }
        } catch (refreshError) {
          console.error("[api.js] ❌ Token refresh failed:", refreshError);

          // Clean up both tokens
          removeAccessToken();
          localStorage.removeItem("refreshToken");

          processQueue(refreshError, null);
          reject(refreshError);

          // ✅ FIX: Redirect to CENTRALIZED login page, not BMS login
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
