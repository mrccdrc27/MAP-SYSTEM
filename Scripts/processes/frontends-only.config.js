
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
      args: '--host',
      interpreter: 'node',
      watch: false,
      windowsHide: true,
      env: {
        VITE_API_BASE_URL: "https://api.ticketing.mapactive.tech",
        VITE_TTS_SYSTEM_URL: "https://ticketflow.ticketing.mapactive.tech",
        VITE_HDTS_SYSTEM_URL: "https://hdts.ticketing.mapactive.tech",
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
      args: '--host',
      interpreter: 'node',
      watch: false,
      windowsHide: true,
      env: {
        VITE_AUTH_URL: "https://api.ticketing.mapactive.tech/auth",
        VITE_AUTH_NEW_URL: "https://login.ticketing.mapactive.tech",
        VITE_AUTH_LOGIN: "https://login.ticketing.mapactive.tech/staff/login",
        VITE_WORKFLOW_API: "https://api.ticketing.mapactive.tech/workflow",
        VITE_BACKEND_API: "https://api.ticketing.mapactive.tech/workflow",
        VITE_NOTIFICATION_API: "https://api.ticketing.mapactive.tech/notification",
        VITE_NOTIFICATION_WS: "wss://api.ticketing.mapactive.tech/notification",
        VITE_MESSAGING_API: "https://api.ticketing.mapactive.tech/messaging",
        VITE_MESSAGING_WS: "wss://api.ticketing.mapactive.tech/messaging/ws",
        VITE_HELPDESK_SERVICE_URL: "https://api.ticketing.mapactive.tech/helpdesk",
        VITE_USER_SERVER_API: "https://api.ticketing.mapactive.tech/auth"
      }
    },

    // -------------------
    // HDTS Frontend
    // -------------------
    {
      name: 'hdts-frontend',
      cwd: path.resolve(__dirname, '../../hdts/frontendfolder'),
      script: './node_modules/vite/bin/vite.js',
      args: '--host',
      interpreter: 'node',
      watch: false,
      windowsHide: true,
      env: {
        VITE_AUTH_URL: "https://api.ticketing.mapactive.tech/auth",
        VITE_AUTH_FRONTEND_URL: "https://login.ticketing.mapactive.tech",
        VITE_HDTS_BACKEND_URL: "https://api.ticketing.mapactive.tech/helpdesk",
        VITE_WORKFLOW_API_URL: "https://api.ticketing.mapactive.tech/workflow",
        VITE_MESSAGING_API_URL: "https://api.ticketing.mapactive.tech/messaging",
        VITE_MESSAGING_WS_URL: "wss://api.ticketing.mapactive.tech/messaging/ws",
        VITE_NOTIFICATION_API_URL: "https://api.ticketing.mapactive.tech/notification",
        VITE_NOTIFICATION_WS_URL: "wss://api.ticketing.mapactive.tech/notification",
        VITE_MEDIA_URL: "https://api.ticketing.mapactive.tech",
        VITE_TTS_SYSTEM_URL: "https://ticketflow.ticketing.mapactive.tech",
        VITE_HDTS_SYSTEM_URL: "https://hdts.ticketing.mapactive.tech"
      }
    }
  ]
};
