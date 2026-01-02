import axios from 'axios';
import { getAccessToken, removeAccessToken } from './TokenUtils';

const AUTH_URL = (import.meta.env.VITE_AUTH_URL || "http://localhost:18001").replace(/\/$/, "");

const authApi = axios.create({
    baseURL: `${AUTH_URL}/api/v1`, // Using V1
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
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
    const response = await authApi.post('/token/obtain/', { email, password });
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