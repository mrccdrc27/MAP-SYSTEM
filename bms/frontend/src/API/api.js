// bms/frontend/src/API/api.js
import axios from 'axios';
import { getAccessToken, setAccessToken, removeAccessToken } from './TokenUtils';

// BMS Backend API URL (for budget operations)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

// Auth service URL (for token refresh)
const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8003';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Will automatically add the JWT to every request
api.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Singleton pattern for token refresh
let refreshTokenPromise = null;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Response interceptor: Handle automatic token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Check if the error is 401 and it's not a retry request
        if (error.response?.status === 401 && !originalRequest._retry) {
            
            // If a refresh is already in progress, queue the original request
            if (refreshTokenPromise) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                .then(newAccessToken => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
                    return api(originalRequest);
                })
                .catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            
            // Start the refresh token request
            refreshTokenPromise = new Promise(async (resolve, reject) => {
                try {
                    // Call centralized auth service for token refresh
                    const response = await axios.post(
                        `${AUTH_URL}/api/v1/token/refresh/`,
                        {},
                        { withCredentials: true }
                    );
                    const newAccessToken = response.data.access;
                    
                    if (newAccessToken) {
                        setAccessToken(newAccessToken);
                        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                        processQueue(null, newAccessToken);
                        resolve(newAccessToken);
                    } else {
                        throw new Error('No access token in response');
                    }
                    
                } catch (refreshError) {
                    console.error("Token refresh failed:", refreshError);
                    removeAccessToken();
                    
                    processQueue(refreshError, null);
                    reject(refreshError);

                    window.location.href = '/login';
                } finally {
                    refreshTokenPromise = null;
                }
            });

            return refreshTokenPromise.then(() => api(originalRequest));
        }
        
        return Promise.reject(error);
    }
);

export default api;