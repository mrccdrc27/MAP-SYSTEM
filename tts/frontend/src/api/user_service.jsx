// src/api/axios.jsx

import axios from 'axios';

const baseURL = import.meta.env.VITE_USER_SERVER_API;

const userService_api = axios.create({
  baseURL: baseURL,
});

export default userService_api;