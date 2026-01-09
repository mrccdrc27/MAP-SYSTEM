// bms\frontend\src\API\authAPI.js
import axios from 'axios';
import { getAccessToken, removeAccessToken } from './TokenUtils';

// 1. Config
const USE_CENTRAL_AUTH = import.meta.env.VITE_USE_CENTRAL_AUTH === 'true';
const CENTRAL_AUTH_URL = (import.meta.env.VITE_AUTH_URL || "http://localhost:8001").replace(/\/$/, "");
const LOCAL_BMS_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(/\/$/, "");

// 2. Select Base URL
const BASE_URL = USE_CENTRAL_AUTH ? `${CENTRAL_AUTH_URL}/api/v1` : LOCAL_BMS_URL;
const AUTH_URL = (import.meta.env.VITE_AUTH_URL || "http://localhost:18001").replace(/\/$/, "");


const authApi = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    // Only use credentials (cookies) if using Central Auth
    withCredentials: USE_CENTRAL_AUTH, 
});



authApi.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

export const login = async (email, password) => {
    // 3. Select Endpoint
    // Central Auth -> /users/login/api/ (Cookies)
    // Local BMS -> /token/ (JSON Response)
    const endpoint = USE_CENTRAL_AUTH ? '/users/login/api/' : '/token/';
    
    // SimpleJWT standard serializer expects 'username'
    const payload = { 
        email, 
        password,
        username: email 
    };

    const response = await authApi.post(endpoint, payload);
    return response.data;
};

export const verifyToken = async (token) => {
    try {
        const response = await authApi.post('/token/verify/', { token });
        return response.status === 200;
    } catch (e) {
        return false;
    }
};

export const refreshToken = async () => {
    const response = await authApi.post('/token/refresh/');
    return response.data;
};

export const logout = async () => {
    try {
        // Logout is at root /logout/
        const response = await axios.post(`${AUTH_URL}/logout/`, {}, { withCredentials: true });
        return response.data;
    } finally {
        removeAccessToken();
    }
};

/**
 * Requests a password reset link to be sent to the user's email.
 * @param {string} email - The user's email address.
 * @returns {Promise<object>} - The confirmation message from the API.
 */
export const requestPasswordReset = async (email) => {
    const response = await authApi.post('/users/password/request-reset/', { email });
    return response.data;
};

/**
 * Submits the new password along with the UID and token from the reset link.
 * @param {string} uid - The user's base64 encoded ID from the URL.
 * @param {string} token - The password reset token from the URL.
 * @param {string} password - The new password.
 * @returns {Promise<object>} - The success message from the API.
 */
export const confirmPasswordReset = async (uid, token, password) => {
    const response = await authApi.post('/users/password/reset/confirm/', { uid, token, password });
    return response.data;
};

/**
 * Updates the authenticated user's profile
 * Only sends fields that the user is allowed to change
 * @param {object} profileData - An object containing fields like first_name, last_name, phone_number
 * @returns {Promise<object>} - The updated user object from the API
 */
export const updateProfile = async (profileData) => {
    const response = await authApi.patch('/users/profile/', profileData);
    return response.data;
};