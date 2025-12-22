import axios from "axios";

const helpDeskAxios = axios.create({
  baseURL: import.meta.env.VITE_INTEGRATION_HELP_DESK_API_URL,
  timeout: 10000,
});

helpDeskAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("[Help Desk API Error]", error.response || error.message);
    return Promise.reject(error);
  }
);

export default helpDeskAxios;
