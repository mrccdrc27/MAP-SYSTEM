import axios from "axios";

const ticketTrackingAxios = axios.create({
  baseURL: import.meta.env.VITE_INTEGRATION_TICKET_TRACKING_API_URL,
  timeout: 10000,
});

ticketTrackingAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("[Ticket Tracking API Error]", error.response || error.message);
    return Promise.reject(error);
  }
);

export default ticketTrackingAxios;
