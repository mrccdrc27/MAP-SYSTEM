// src/api/interceptors.js
import api from "../axios";
import axios from "axios";

const refreshURL = import.meta.env.VITE_REFRESH_API; // e.g., /api/token/refresh/

export const setupInterceptors = (navigate) => {
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Prevent infinite loop
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const refreshToken = localStorage.getItem("refreshToken");
          const response = await axios.post(refreshURL, {
            refresh: refreshToken,
          });

          const newAccessToken = response.data.access;
          localStorage.setItem("accessToken", newAccessToken);

          // Retry the failed request with the new access token
          originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (err) {
          console.error("Token refresh failed. Logging out.");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("tempToken");
          navigate("/", { replace: true }); // Redirect to login
        }
      }

      return Promise.reject(error);
    }
  );
};
