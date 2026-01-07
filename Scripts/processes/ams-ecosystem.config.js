const path = require('path');

// Go up two directories from Scripts/processes to project root
const projectRoot = path.resolve(__dirname, '../..');
// Use AMS specific virtual environment
const venvPath = path.join(projectRoot, 'ams', 'amsenv', 'Scripts');
// Use python.exe for console output and reliability with PM2
const pythonInterpreter = path.join(venvPath, 'python.exe');

/**
 * AMS Ecosystem Configuration (Kong-less)
 * 
 * Services:
 *   - Auth Service: 8000
 *   - Auth Frontend: 3001
 *   - AMS Assets: 8002
 *   - AMS Contexts: 8003
 *   - AMS Frontend: 5173
 */

module.exports = {
  apps: [
    // -------------------
    // Auth Service
    // -------------------
    {
      name: 'auth-service',
      cwd: path.join(projectRoot, 'auth'),
      script: pythonInterpreter,
      args: 'manage.py runserver 0.0.0.0:8000',
      interpreter: 'none',
      windowsHide: false,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        DJANGO_ALLOWED_HOSTS: "localhost,127.0.0.1,auth-service",
        DJANGO_SECRET_KEY: "signing-key-1234",
        DJANGO_JWT_SIGNING_KEY: "signing-key-1234",
        KONG_TRUSTED: "false",
        RECAPTCHA_ENABLED: "False",
        DJANGO_CORS_ALLOWED_ORIGINS: "http://localhost:3001,http://localhost:5173",
        DJANGO_CSRF_TRUSTED_ORIGINS: "http://localhost:3001,http://localhost:5173",
        AMS_SYSTEM_URL: "http://localhost:5173/ams",
        DEFAULT_SYSTEM_URL: "http://localhost:5173/dashboard",
        DJANGO_EMAIL_BACKEND: "django.core.mail.backends.smtp.EmailBackend",
        DJANGO_EMAIL_HOST: "localhost",
        DJANGO_EMAIL_PORT: "1025",
        DJANGO_EMAIL_USE_TLS: "False",
      }
    },

    // -------------------
    // Auth Frontend
    // -------------------
    {
      name: 'auth-frontend',
      cwd: path.join(projectRoot, 'auth/frontend'),
      script: path.join(projectRoot, 'auth/frontend/node_modules/vite/bin/vite.js'),
      interpreter: 'node',
      args: ['--port', '3001'],
      watch: false,
      windowsHide: false,
      env: {
        VITE_API_BASE_URL: "http://localhost:8000",
        VITE_ENV: "development",
        VITE_DEBUG: "true",
        VITE_AUTH_LOGIN_ENDPOINT: "/api/v1/users/login/api/",
        VITE_AUTH_REGISTER_ENDPOINT: "/api/v1/users/register/",
        VITE_AUTH_LOGOUT_ENDPOINT: "/api/v1/users/logout/",
        VITE_AUTH_REFRESH_ENDPOINT: "/api/v1/users/token/refresh/",
        VITE_AUTH_PROFILE_ENDPOINT: "/api/v1/users/profile/",
        VITE_ENABLE_REGISTRATION: "true",
        VITE_ENABLE_PASSWORD_RESET: "true",
        VITE_ENABLE_RECAPTCHA: "false"
      }
    },

    // -------------------
    // AMS Assets Service
    // -------------------
    {
      name: 'ams-assets',
      cwd: path.join(projectRoot, 'ams/backend/assets'),
      script: pythonInterpreter,
      args: 'manage.py runserver 0.0.0.0:8002',
      interpreter: 'none',
      windowsHide: false,
      env: {
        ASSETS_DEBUG: "True",
        ASSETS_SECRET_KEY: "insecure-assets-dev-key-12345",
        ASSETS_USE_SQLITE: "True",
        DJANGO_JWT_SIGNING_KEY: "signing-key-1234",
        AUTH_SERVICE_URL: "http://localhost:8000",
        CONTEXTS_API_URL: "http://localhost:8003",
        DJANGO_CORS_ALLOWED_ORIGINS: "http://localhost:5173",
        DJANGO_ALLOWED_HOSTS: "localhost,127.0.0.1"
      }
    },

    // -------------------
    // AMS Contexts Service
    // -------------------
    {
      name: 'ams-contexts',
      cwd: path.join(projectRoot, 'ams/backend/contexts'),
      script: pythonInterpreter,
      args: 'manage.py runserver 0.0.0.0:8003',
      interpreter: 'none',
      windowsHide: false,
      env: {
        CONTEXTS_DEBUG: "True",
        CONTEXTS_SECRET_KEY: "insecure-contexts-dev-key-12345",
        CONTEXTS_USE_SQLITE: "True",
        DJANGO_JWT_SIGNING_KEY: "signing-key-1234",
        AUTH_SERVICE_URL: "http://localhost:8000",
        IMPORT_API_KEY: "cookieeater11",
        ASSETS_API_URL: "http://localhost:8002",
        DJANGO_CORS_ALLOWED_ORIGINS: "http://localhost:5173",
        DJANGO_ALLOWED_HOSTS: "localhost,127.0.0.1"
      }
    },

    // -------------------
    // AMS Frontend
    // -------------------
    {
      name: 'ams-frontend',
      cwd: path.join(projectRoot, 'ams/frontend'),
      script: path.join(projectRoot, 'ams/frontend/node_modules/vite/bin/vite.js'),
      interpreter: 'node',
      args: ['--port', '5173'],
      watch: false,
      windowsHide: false,
      env: {
        VITE_AUTH_URL: "http://localhost:8000",
        VITE_API_URL: "http://localhost:8000/api",
        VITE_AUTH_API_URL: "http://localhost:8000/",
        VITE_ASSETS_API_URL: "http://localhost:8002/",
        VITE_CONTEXTS_API_URL: "http://localhost:8003/",
        VITE_INTEGRATION_HELP_DESK_API_URL: "http://localhost:8000/",
        VITE_INTEGRATION_TICKET_TRACKING_API_URL: "http://localhost:8000/"
      }
    }
  ]
};
