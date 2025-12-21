import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8001/api/auth',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Will automatically add the JWT to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// MODIFICATION START: Singleton pattern for token refresh

// This variable will hold the promise of the ongoing refresh token request
// if it's not null, it means a refresh is in progress
let refreshTokenPromise = null;

// This array will store subscribers that are waiting for the new token
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

// --- MODIFICATION END ---

// Response interceptor: Handle automatic token refresh
api.interceptors.response.use(
    (response) => response, // On success, just return the response
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

            originalRequest._retry = true; // Mark as a retry to prevent infinite loops on the original request
            
            const refreshToken = localStorage.getItem('refresh_token');

            if (refreshToken) {
                // Start the refresh token request and store the promise
                refreshTokenPromise = new Promise(async (resolve, reject) => {
                    try {
                        // Use a direct axios call to the refresh endpoint to avoid interceptor loop
                        const response = await axios.post(`${api.defaults.baseURL}/token/refresh/`, { refresh: refreshToken });
                        const newAccessToken = response.data.access;
                        
                        // NOTE: Your backend rotates refresh tokens. Ensure the new refresh token is also saved.
                        // Assuming the refresh endpoint sends back both `access` and `refresh`.
                        if (response.data.refresh) {
                            localStorage.setItem('refresh_token', response.data.refresh);
                        }
                        localStorage.setItem('access_token', newAccessToken);

                        // Update the header for the current original request
                        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                        
                        // Resolve the promise with the new token
                        processQueue(null, newAccessToken);
                        resolve(newAccessToken);
                        
                    } catch (refreshError) {
                        // If refresh fails, the refresh token is invalid/expired. Log the user out.
                        console.error("Token refresh failed:", refreshError);
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('refresh_token');
                        
                        // Reject all waiting requests and the main promise
                        processQueue(refreshError, null);
                        reject(refreshError);

                        // Force a redirect to the login page
                        window.location.href = '/login';
                    } finally {
                        // Reset the promise holder after the refresh attempt is complete
                        refreshTokenPromise = null;
                    }
                });

                // Retry the original request after the refresh promise resolves
                return refreshTokenPromise.then(() => api(originalRequest));

            } else {
                 // No refresh token found, redirect to login
                console.log("No refresh token, redirecting to login.");
                window.location.href = '/login';
                return Promise.reject(error);
            }
        }
        
        // For any other error, just reject the promise
        return Promise.reject(error);
    }
);

export default api;