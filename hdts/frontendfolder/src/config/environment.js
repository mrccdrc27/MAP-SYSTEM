// Configuration file to toggle between local and backend API

// Set to true for local development, false for backend API
export const USE_LOCAL_API = false;

// API Configuration
export const API_CONFIG = {
  // Local development settings
  LOCAL: {
    BASE_URL: null, // No backend URL needed for local
    ENABLE_MOCK_DELAY: true, // Simulate API delays
    MOCK_DELAY_MS: 500
  },
  
  // Backend API settings
  BACKEND: {
    BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    TIMEOUT: 10000
  },
  
  // Auth service settings
  AUTH: {
    BASE_URL: import.meta.env.VITE_AUTH_URL || 'http://localhost:8003',
    TIMEOUT: 10000
  }
};

// Environment detection
export const ENVIRONMENT = {
  IS_LOCAL: USE_LOCAL_API,
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD
};

// Feature flags for local development
export const FEATURES = {
  ENABLE_LOCAL_STORAGE: USE_LOCAL_API,
  ENABLE_MOCK_DATA: USE_LOCAL_API,
  ENABLE_FILE_UPLOAD: !USE_LOCAL_API, // Disable file upload in local mode
  ENABLE_EMAIL_NOTIFICATIONS: !USE_LOCAL_API, // Disable emails in local mode
  ENABLE_REAL_TIME_UPDATES: !USE_LOCAL_API, // Disable real-time features in local mode
  BYPASS_AUTHENTICATION: USE_LOCAL_API, // Bypass auth checks in local mode
  BYPASS_PROTECTED_ROUTES: USE_LOCAL_API, // Allow direct access to all routes
  AUTO_LOGIN: USE_LOCAL_API // Automatically log in users in local mode
};

// Logging configuration
export const LOGGING = {
  ENABLE_DEBUG: true,
  LOG_API_CALLS: true,
  LOG_LOCAL_STORAGE: USE_LOCAL_API
};
