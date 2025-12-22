import axios from "axios";
import { getAccessToken, removeAccessToken } from "./TokenUtils";

// Auth axios points to centralized auth service
const authAxios = axios.create({
  baseURL: import.meta.env.VITE_AUTH_URL || "http://localhost:8000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    accept: "application/json",
  },
  withCredentials: true,
});

// Request interceptor to add auth token
authAxios.interceptors.request.use(
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
authAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("[Authentication API Error]", error.response || error.message);
    
    // Handle 401 - token expired
    if (error.response?.status === 401) {
      removeAccessToken();
      window.location.href = "/login";
    }
    
    return Promise.reject(error);
  }
);

export default authAxios;