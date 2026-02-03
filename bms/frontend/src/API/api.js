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

    // DEBUG: Log response status and a short snapshot (avoid logging raw tokens)
    console.warn("[api.js] Interceptor caught response error:", {
      status: error.response?.status,
      url: originalRequest?.url,
      data_preview: error.response?.data
        ? Object.keys(error.response.data).slice(0, 5)
        : null,
    });

    // Handle 401 or 403 (403 often indicates cookie-auth failure / JWT verification issue)
    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      !originalRequest._retry
    ) {
      // If 403, give more specific debug advice
      if (error.response?.status === 403) {
        console.error(
          "[api.js] Received 403 - cookie-based auth may be failing (possible JWT signing key mismatch or cookie domain issue).",
          {
            suggestion:
              "Check DJANGO_JWT_SIGNING_KEY in both central auth and BMS; verify cookie domain and SameSite settings",
            response_headers: error.response?.headers,
          },
        );
      }

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
            { AUTH_URL },
          );

          // DEBUG: show document.cookie (will be empty for HttpOnly cookies) to indicate HttpOnly presence
          try {
            console.log(
              "[api.js] document.cookie (for debugging):",
              document.cookie,
            );
          } catch (e) {
            console.warn("[api.js] Could not access document.cookie:", e);
          }

          // If central auth isn't enabled, skip central logic and redirect to local login
          if (!USE_CENTRAL_AUTH) {
            console.warn(
              "[api.js] Central auth disabled (VITE_USE_CENTRAL_AUTH=false). Redirecting to centralized login (for debugging flow).",
            );
            // Clean up tokens and redirect to centralized login to force re-auth
            removeAccessToken();
            localStorage.removeItem("refreshToken");
            const centralLoginUrl =
              "https://login.ticketing.mapactive.tech/staff";
            window.location.href = centralLoginUrl;
            reject(
              new Error(
                "Central auth disabled - redirecting to centralized login",
              ),
            );
            return;
          }

          // MODIFICATION START
          // Fixed URL: Removed '/auth' prefix. Backend structure is root -> api/v1/ -> token/refresh/cookie/
          console.log(
            "[api.js] Calling cookie refresh endpoint:",
            `${AUTH_URL}/api/v1/token/refresh/cookie/`,
          );
          let response = await axios.post(
            `${AUTH_URL}/api/v1/token/refresh/cookie/`,
            {}, // Empty body to ensure Content-Type is sent
            {
              withCredentials: true,
              headers: { "Content-Type": "application/json" },
            },
          );
          // MODIFICATION END

          // DEBUG: Log cookie refresh response
          console.log("[api.js] Cookie refresh response:", {
            status: response.status,
            data_keys: Object.keys(response.data || {}),
          });

          // If succeeds, proceed (cookie refresh may not return access token body)
          if (
            response.status === 200 &&
            (response.data.message === "Token refreshed successfully" ||
              response.data.message === "Token refreshed")
          ) {
            console.log("[api.js] ✅ Cookie-based refresh succeeded");
            processQueue(null, "token_refreshed");
            resolve("token_refreshed");
            return;
          }

          // Fallback: If cookie fails or doesn't return token, try body-based if refresh_token in localStorage
          console.warn(
            "[api.js] ⚠️ Cookie refresh did not yield token, attempting body fallback...",
          );
          const refreshToken = localStorage.getItem("refreshToken");
          if (!refreshToken)
            throw new Error("No fallback refresh token in localStorage");

          response = await axios.post(
            `${AUTH_URL}/auth/api/v1/token/refresh/cookie/`, // Use same endpoint (server needs to support body fallback)
            { refresh: refreshToken }, // Body payload (they need to support this)
            {
              withCredentials: true,
              headers: { "Content-Type": "application/json" },
            },
          );

          console.log("[api.js] Body fallback response:", {
            status: response.status,
            data_keys: Object.keys(response.data || {}),
          });

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

          // Redirect to centralized login and provide a helpful debug hint
          const centralLoginUrl =
            "https://login.ticketing.mapactive.tech/staff";
          console.log(
            "[api.js] Redirecting to centralized login for re-authentication:",
            centralLoginUrl,
          );

          console.error(
            "[api.js] Debug hint: If you see 403s when cookie auth is attempted, verify DJANGO_JWT_SIGNING_KEY is identical between central auth and BMS, and check cookie domain (should be .mapactive.tech) and SameSite attributes.",
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
