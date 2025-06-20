// src/api/axios.jsx

import axios from 'axios';

const baseURL = import.meta.env.VITE_BACKEND_API;

const api = axios.create({
  baseURL: baseURL,
});

export default api;