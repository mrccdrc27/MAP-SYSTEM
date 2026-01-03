// src/api/axios.js
// Cookie-based authentication - credentials are sent via cookies automatically
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_API,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Send cookies with all requests
});

export default api;