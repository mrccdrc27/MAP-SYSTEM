// src/api/axios.js
// Kong Gateway compatible authentication - uses Bearer token in Authorization header
// Falls back to cookie-based auth for backward compatibility
import axios from "axios";
import { getAccessToken } from "./TokenUtils";

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_API,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Send cookies with all requests (backward compatibility)
});

// Request interceptor to add Bearer token from localStorage
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
  }
);

// Response interceptor to handle 401 errors (token expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      // Note: Could also implement token refresh here
      console.warn("Authentication failed - token may have expired");
    }
    return Promise.reject(error);
  }
);

export default api;