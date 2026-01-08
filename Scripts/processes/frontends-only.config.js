const path = require('path');

/**
 * Frontend-Only Configuration
 * 
 * This configuration runs only the three frontend applications:
 *   - Auth Frontend (Port 3001)
 *   - TTS Frontend (Port 1000)
 *   - HDTS Frontend (dynamic Vite port)
 * 
 * No backend services, workers, or Docker containers are started.
 * This is useful for frontend-only development.
 * 
 * Usage:
 *   pm2 start Scripts/processes/frontends-only.config.js
 */

module.exports = {
  apps: [
    // -------------------
    // Auth Frontend (Port 3001)
    // -------------------
    {
      name: 'auth-frontend',
      cwd: path.resolve(__dirname, '../../auth/frontend'),
      script: './node_modules/vite/bin/vite.js',
      interpreter: 'node',
      watch: false,
      windowsHide: true,
      env: {
        VITE_API_BASE_URL: "http://localhost:8080",
        VITE_ENV: "development",
        VITE_DEBUG: "true",
        VITE_AUTH_LOGIN_ENDPOINT: "/auth/api/v1/users/login/api",
        VITE_AUTH_REGISTER_ENDPOINT: "/auth/api/v1/users/register",
        VITE_AUTH_LOGOUT_ENDPOINT: "/auth/api/v1/users/logout",
        VITE_AUTH_REFRESH_ENDPOINT: "/auth/api/v1/users/token/refresh",
        VITE_AUTH_PROFILE_ENDPOINT: "/auth/api/v1/users/profile",
        VITE_ENABLE_REGISTRATION: "true",
        VITE_ENABLE_PASSWORD_RESET: "true",
        VITE_ENABLE_RECAPTCHA: "false"
      }
    },

    // -------------------
    // TTS Frontend (Port 1000)
    // -------------------
    {
      name: 'tts-frontend',
      cwd: path.resolve(__dirname, '../../tts/frontend'),
      script: './node_modules/vite/bin/vite.js',
      interpreter: 'node',
      watch: false,
      windowsHide: true,
      env: {
        VITE_AUTH_URL: "http://localhost:8003",
        VITE_WORKFLOW_API: "http://localhost:8080/workflow",
        VITE_BACKEND_API: "http://localhost:8080/workflow",
        VITE_NOTIFICATION_API: "http://localhost:8080/notification",
        VITE_NOTIFICATION_WS: "ws://localhost:8080/notification/ws",
        VITE_MESSAGING_API: "http://localhost:8080/messaging",
        VITE_MESSAGING_WS: "ws://localhost:8080/messaging/ws",
        VITE_HELPDESK_SERVICE_URL: "http://localhost:8080/helpdesk"
      }
    },

    // -------------------
    // HDTS Frontend
    // -------------------
    {
      name: 'hdts-frontend',
      cwd: path.resolve(__dirname, '../../hdts/frontendfolder'),
      script: './node_modules/vite/bin/vite.js',
      interpreter: 'node',
      watch: false,
      windowsHide: true
    }
  ]
};
