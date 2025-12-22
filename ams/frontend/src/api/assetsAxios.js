import axios from "axios";

const assetsAxios = axios.create({
  baseURL: import.meta.env.VITE_ASSETS_API_URL,
  timeout: 10000,
});

assetsAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("[Assets API Error]", error.response || error.message);
    return Promise.reject(error);
  }
);

export default assetsAxios;
