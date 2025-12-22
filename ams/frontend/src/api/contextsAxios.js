import axios from "axios";

const contextsAxios = axios.create({
  baseURL: import.meta.env.VITE_CONTEXTS_API_URL,
  timeout: 10000,
});

contextsAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("[Contexts API Error]", error.response || error.message);
    return Promise.reject(error);
  }
);

export default contextsAxios;
