import axios from "axios";

const authAxios = axios.create({
  baseURL: import.meta.env.VITE_INTEGRATION_AUTH_API_URL,
  timeout: 10000,
});

authAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("[Authentication API Error]", error.response || error.message);
    return Promise.reject(error);
  }
);

export default authAxios;
