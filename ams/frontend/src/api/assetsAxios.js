import axios from "axios";
import { getAccessToken, removeAccessToken } from "./TokenUtils";

const assetsAxios = axios.create({
  baseURL: import.meta.env.VITE_ASSETS_API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor to add auth token
assetsAxios.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
assetsAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("[Assets API Error]", error.response || error.message);
    
    // Handle 401/403 - redirect to login
    if (error.response?.status === 401 || error.response?.status === 403) {
      removeAccessToken();
      window.location.href = "/login";
    }
    
    return Promise.reject(error);
  }
);

export default assetsAxios;
