import axios from "axios";

const ticketTrackingAxios = axios.create({
  baseURL: "http://localhost:8010/", // Pointing to mock server
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
