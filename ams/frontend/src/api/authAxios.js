import axios from "axios";

const authAxios = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    accept: "application/json",
  }
});

authAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("[Authentication API Error]", error.response || error.message);
    return Promise.reject(error);
  }
);

export default authAxios;