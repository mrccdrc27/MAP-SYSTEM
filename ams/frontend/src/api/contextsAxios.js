import axios from "axios";
import { getAccessToken, removeAccessToken } from "./TokenUtils";

const contextsAxios = axios.create({
  baseURL: import.meta.env.VITE_CONTEXTS_API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor to add auth token
contextsAxios.interceptors.request.use(
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
contextsAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("[Contexts API Error]", error.response || error.message);
    
    // Handle 401/403 - redirect to login
    if (error.response?.status === 401 || error.response?.status === 403) {
      removeAccessToken();
      window.location.href = "/login";
    }
    
    return Promise.reject(error);
  }
);

export default contextsAxios;
