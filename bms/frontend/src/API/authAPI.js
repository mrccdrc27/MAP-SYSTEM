import axios from 'axios';
import { getAccessToken, removeAccessToken } from './TokenUtils';

// Auth service URL - centralized authentication
const AUTH_URL = import.meta.env.VITE_AUTH_URL || "http://localhost:8003";

// Create axios instance for auth service
const authApi = axios.create({
    baseURL: `${AUTH_URL}/api/v1`,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Add auth header to requests
authApi.interceptors.request.use(
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

/**
 * Logs in a user using email.
 * Note: Login is handled by AuthContext directly, this is for backwards compatibility.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @returns {Promise<object>} - The response data from the API.
 */
export const login = async (email, password) => {
    const response = await authApi.post('/token/obtain/', { email, password });
    return response.data;
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

/**
 * Logs out the user by telling the auth service to invalidate the session.
 * @returns {Promise<object>} - The success message from the API.
 */
export const logout = async () => {
    try {
        const response = await authApi.post('/logout/');
        return response.data;
    } finally {
        // Always clear local tokens
        removeAccessToken();
    }
};

/**
 * Verifies if the current token is valid.
 * @param {string} token - The access token to verify.
 * @returns {Promise<boolean>} - True if token is valid.
 */
export const verifyToken = async (token) => {
    const response = await authApi.post('/token/verify/', { token });
    return response.status === 200;
};

/**
 * Uses the refresh token to get a new access token.
 * @returns {Promise<object>} - The response containing the new access token.
 */
export const refreshToken = async () => {
    const response = await authApi.post('/token/refresh/');
    return response.data;
};