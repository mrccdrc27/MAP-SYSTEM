// src/api/axios.js
import axios from "axios";
import { getAccessToken } from "./TokenUtils";

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_API,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Attach Authorization header when token is available
api.interceptors.request.use((config) => {
  try {
    const token = getAccessToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore
  }
  return config;
});

export default api;