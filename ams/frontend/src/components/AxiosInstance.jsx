import axios from 'axios';

// Authentication service - uses environment variable for API Gateway support
const baseUrl = import.meta.env.VITE_AUTH_API_URL || "http://127.0.0.1:8001/";

const axiosInstance = axios.create({
    baseURL: baseUrl,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        accept: 'application/json'
    },
})

export default axiosInstance;