const path = require('path');

// Go up two directories from Scripts/processes to project root
const projectRoot = path.resolve(__dirname, '../..');
const venvPath = path.join(projectRoot, 'venv', 'Scripts');
const pythonInterpreter = path.join(venvPath, 'pythonw.exe');
const celeryScript = path.join(projectRoot, 'venv', 'Lib', 'site-packages', 'celery', '__main__.py');

/**
 * TTS Ecosystem Configuration with Kong API Gateway
 * 
 * This configuration runs all services with Kong as the API gateway.
 * All traffic flows through Kong (port 8000) which handles:
 *   - JWT validation at the edge (reads JWT from cookies, not HTTP headers)
 *   - Rate limiting
 *   - CORS
 *   - Request routing with path rewriting
 * 
 * Key Configuration:
 *   - KONG_TRUSTED=true: Services trust Kong's pre-validated JWT
 *   - All API endpoints require authentication (no public endpoints)
 *   - JWT is read from 'access_token' cookie by Kong
 * 
 * Architecture:
 *   Frontend (1000) -> Kong (8000) -> Backend Services
 *   
 * To run without Kong, use tts-ecosystem.config.js instead.
 */

module.exports = {
  apps: [
    // -------------------
    // Kong API Gateway
    // -------------------
    // Kong runs via Docker, NOT as a PM2 process.
    // Start Kong BEFORE running this ecosystem:
    //   node Scripts/cli/index.js run docker:kong
    // Or:
    //   .\Scripts\docker\start_kong.ps1 -Detached -Config local

    // -------------------
    // Auth Service
    // -------------------
    {
      name: 'auth-service',
      cwd: path.join(projectRoot, 'auth'),
      script: 'manage.py',
      args: 'runserver 0.0.0.0:8003',
      interpreter: pythonInterpreter,
      windowsHide: true,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        DJANGO_ALLOWED_HOSTS: "localhost,127.0.0.1,auth-service,host.docker.internal",
        DJANGO_SECRET_KEY: "signing-key-1234",
        DJANGO_JWT_SIGNING_KEY: "signing-key-1234",
        // Kong gateway integration - services trust Kong's JWT validation from cookies
        KONG_TRUSTED: "true",  // Services trust Kong's pre-validated JWT
        RECAPTCHA_ENABLED: "False",
        CELERY_BROKER_URL: "amqp://admin:admin@localhost:5672/",
        // Media files served through Kong gateway
        MEDIA_BASE_URL: "http://localhost:8080/auth",
        DJANGO_CORS_ALLOWED_ORIGINS: "http://localhost:1000,http://127.0.0.1:1000,http://localhost:8080,http://localhost:3001,http://127.0.0.1:3001,http://localhost:5173,http://127.0.0.1:5173",
        DJANGO_CSRF_TRUSTED_ORIGINS: "http://localhost:8080,http://localhost:3001,http://127.0.0.1:3001,http://localhost:3000,http://127.0.0.1:3000",
        TTS_SYSTEM_URL: "http://localhost:1000/",
        AMS_SYSTEM_URL: "http://localhost:3000/ams",
        HDTS_SYSTEM_URL: "http://localhost:5173/hdts",
        BMS_SYSTEM_URL: "http://localhost:3000/bms",
        DEFAULT_SYSTEM_URL: "http://localhost:3000/dashboard",
        DJANGO_EMAIL_BACKEND: "django.core.mail.backends.smtp.EmailBackend",
        DJANGO_EMAIL_HOST: "localhost",
        DJANGO_EMAIL_PORT: "1025",
        DJANGO_EMAIL_HOST_USER: "",
        DJANGO_EMAIL_HOST_PASSWORD: "",
        DJANGO_EMAIL_USE_TLS: "False",
        DJANGO_DEFAULT_FROM_EMAIL: "noreply@tickettracking.local"
      }
    },

    // -------------------
    // Workflow API Service
    // -------------------
    {
      name: 'workflow-api',
      cwd: path.join(projectRoot, 'tts/workflow_api'),
      script: 'manage.py',
      args: 'runserver 0.0.0.0:1001',
      interpreter: pythonInterpreter,
      windowsHide: true,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        DJANGO_ALLOWED_HOSTS: "localhost,127.0.0.1,workflow-api,host.docker.internal",
        DJANGO_SECRET_KEY: "signing-key-1234",
        DJANGO_JWT_SIGNING_KEY: "signing-key-1234",
        KONG_TRUSTED: "true",  // Trust Kong's pre-validated JWT from cookies
        DJANGO_CELERY_BROKER_URL: "amqp://admin:admin@localhost:5672/",
        DJANGO_NOTIFICATION_SERVICE_BROKER_URL: "amqp://admin:admin@localhost:5672/",
        DJANGO_NOTIFICATION_QUEUE: "notification-queue-default",
        DJANGO_TICKET_STATUS_QUEUE: "ticket_status-default",
        DJANGO_INAPP_NOTIFICATION_QUEUE: "inapp-notification-queue",
        // Service URLs - Going through Kong gateway with prefix-based routing
        // Kong routes: /helpdesk/*, /workflow/*, /notification/*, /messaging/*
        DJANGO_AUTH_SERVICE_URL: "http://localhost:8003",  // Auth is direct (not through Kong for backend calls)
        DJANGO_NOTIFICATION_SERVICE_URL: "http://localhost:8080/notification",  // Through Kong
        DJANGO_TTS_SERVICE_URL: "http://localhost:8080/workflow",  // Through Kong
        DJANGO_HELPDESK_SERVICE_URL: "http://localhost:8080/helpdesk",  // Through Kong
        DJANGO_USER_SERVICE_URL: "http://localhost:3000",
        DJANGO_BASE_URL: "http://localhost:8080/workflow",  // External base URL through Kong
        DJANGO_FRONTEND_URL: "http://localhost:1000/register",
        DJANGO_CORS_ALLOWED_ORIGINS: "http://localhost:1000,http://127.0.0.1:1000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080"
      }
    },
    {
      name: 'workflow-worker',
      cwd: path.join(projectRoot, 'tts/workflow_api'),
      script: pythonInterpreter,
      args: '-m celery -A workflow_api worker --pool=solo --loglevel=info -Q role_send-default,TICKET_TASKS_PRODUCTION,tts.role.sync,tts.user_system_role.sync,workflow_seed_queue,workflow_seed',
      interpreter: 'none',
      windowsHide: true,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        DJANGO_SECRET_KEY: "signing-key-1234",
        DJANGO_JWT_SIGNING_KEY: "signing-key-1234",
        KONG_TRUSTED: "true",  // Trust Kong's pre-validated JWT from cookies
        DJANGO_CELERY_BROKER_URL: "amqp://admin:admin@localhost:5672/",
        DJANGO_NOTIFICATION_SERVICE_BROKER_URL: "amqp://admin:admin@localhost:5672/",
        // Inter-service URLs - Auth is direct, others through Kong
        DJANGO_AUTH_SERVICE_URL: "http://localhost:8003",
        DJANGO_NOTIFICATION_SERVICE_URL: "http://localhost:8080/notification",
        C_FORCE_ROOT: "false"
      }
    },

    // -------------------
    // Notification Service
    // -------------------
    {
      name: 'notification-service',
      cwd: path.join(projectRoot, 'tts/notification_service'),
      script: pythonInterpreter,
      args: '-m daphne -b 0.0.0.0 -p 1003 notification_service.asgi:application',
      interpreter: 'none',
      windowsHide: true,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        DJANGO_ALLOWED_HOSTS: "localhost,127.0.0.1,notification-service,host.docker.internal",
        DJANGO_SECRET_KEY: "signing-key-1234",
        DJANGO_JWT_SIGNING_KEY: "signing-key-1234",
        KONG_TRUSTED: "true",  // Trust Kong's pre-validated JWT from cookies
        DJANGO_CORS_ALLOWED_ORIGINS: "http://localhost:1000,http://127.0.0.1:1000,http://localhost:8080",
        DJANGO_CORS_ALLOW_CREDENTIALS: "True",
        DJANGO_NOTIFICATION_SERVICE_PORT: "1003",
        DJANGO_AUTH_SERVICE_URL: "http://localhost:8003",
        DJANGO_NOTIFICATION_API_KEYS: "demo-api-key-123,test-api-key-456",
        DJANGO_API_KEY: "in-app-notification-api-key-secure",
        DJANGO_CELERY_BROKER_URL: "amqp://admin:admin@localhost:5672/",
        DJANGO_NOTIFICATION_QUEUE: "notification-queue",
        DJANGO_INAPP_NOTIFICATION_QUEUE: "inapp-notification-queue",
        // TTS frontend deep-linking
        TTS_FRONTEND_URL: "http://localhost:1000",
        TTS_TICKET_PATH_TEMPLATE: "/ticket/{id}",
        // Mailpit SMTP Configuration
        DJANGO_EMAIL_BACKEND: "django.core.mail.backends.smtp.EmailBackend",
        DJANGO_EMAIL_HOST: "localhost",
        DJANGO_EMAIL_PORT: "1025",
        DJANGO_EMAIL_HOST_USER: "",
        DJANGO_EMAIL_HOST_PASSWORD: "",
        DJANGO_EMAIL_USE_TLS: "False",
        DJANGO_DEFAULT_FROM_EMAIL: "noreply@tickettracking.local"
      }
    },
    {
      name: 'notification-worker',
      cwd: path.join(projectRoot, 'tts/notification_service'),
      script: pythonInterpreter,
      args: '-m celery -A notification_service worker --pool=solo --loglevel=info -Q notification-queue-default,inapp-notification-queue,user-email-sync-queue',
      interpreter: 'none',
      windowsHide: true,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        DJANGO_SECRET_KEY: "signing-key-1234",
        DJANGO_JWT_SIGNING_KEY: "signing-key-1234",
        KONG_TRUSTED: "true",  // Trust Kong's pre-validated JWT from cookies
        DJANGO_CELERY_BROKER_URL: "amqp://admin:admin@localhost:5672/",
        DJANGO_NOTIFICATION_QUEUE: "notification-queue",
        DJANGO_INAPP_NOTIFICATION_QUEUE: "inapp-notification-queue",
        // Internal URL for WebSocket broadcasts - must point to Daphne process directly
        NOTIFICATION_SERVICE_INTERNAL_URL: "http://localhost:1003",
        // TTS frontend deep-linking
        TTS_FRONTEND_URL: "http://localhost:1000",
        TTS_TICKET_PATH_TEMPLATE: "/ticket/{id}",
        // Mailpit SMTP Configuration
        DJANGO_EMAIL_BACKEND: "django.core.mail.backends.smtp.EmailBackend",
        DJANGO_EMAIL_HOST: "localhost",
        DJANGO_EMAIL_PORT: "1025",
        DJANGO_EMAIL_HOST_USER: "",
        DJANGO_EMAIL_HOST_PASSWORD: "",
        DJANGO_EMAIL_USE_TLS: "False",
        DJANGO_DEFAULT_FROM_EMAIL: "noreply@tickettracking.local"
      }
    },

    // -------------------
    // Messaging Service
    // -------------------
    {
      name: 'messaging-service',
      cwd: path.join(projectRoot, 'tts/messaging'),
      script: pythonInterpreter,
      args: '-m daphne -b 0.0.0.0 -p 1002 messaging.asgi:application',
      interpreter: 'none',
      windowsHide: true,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        DJANGO_ALLOWED_HOSTS: "localhost,127.0.0.1,messaging-service,host.docker.internal",
        DJANGO_SECRET_KEY: "signing-key-1234",
        DJANGO_JWT_SIGNING_KEY: "signing-key-1234",
        KONG_TRUSTED: "true",  // Trust Kong's pre-validated JWT from cookies
        DJANGO_CORS_ALLOWED_ORIGINS: "http://localhost:1000,http://127.0.0.1:1000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080",
        DJANGO_CORS_ALLOW_CREDENTIALS: "True",
        DJANGO_MEDIA_BASE_URL: "http://localhost:8080/messaging"  // Through Kong gateway for browser access
      }
    },

    // -------------------
    // Helpdesk (Backend) - Port 5001
    // Kong runs on 8080, so helpdesk backend uses 5001
    // -------------------
    {
      name: 'helpdesk-backend',
      cwd: path.join(projectRoot, 'hdts/helpdesk'),
      script: 'manage.py',
      args: 'runserver 0.0.0.0:5001', 
      interpreter: pythonInterpreter,
      windowsHide: true,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        DJANGO_SECRET_KEY: "signing-key-1234",
        DJANGO_JWT_SIGNING_KEY: "signing-key-1234",
        KONG_TRUSTED: "true",  // Trust Kong's pre-validated JWT from cookies
        DJANGO_ALLOWED_HOSTS: "localhost,127.0.0.1,helpdesk-backend,host.docker.internal",
        DJANGO_AUTH_SERVICE: "http://localhost:8003",
        CELERY_BROKER_URL: "amqp://admin:admin@localhost:5672/",
        DJANGO_EMAIL_BACKEND: "django.core.mail.backends.smtp.EmailBackend",
        EMAIL_HOST: "localhost",
        EMAIL_PORT: "1025",
        EMAIL_USE_TLS: "False"
      }
    },
    {
      name: 'helpdesk-worker',
      cwd: path.join(projectRoot, 'hdts/helpdesk'),
      script: pythonInterpreter,
      args: '-m celery -A backend worker --loglevel=info --queues=hdts.user.sync,hdts.user_system_role.sync,hdts.employee.sync,ticket_tasks2,ticket_status-default --pool=solo',
      interpreter: 'none',
      windowsHide: true,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        DJANGO_SECRET_KEY: "signing-key-1234",
        DJANGO_JWT_SIGNING_KEY: "signing-key-1234",
        KONG_TRUSTED: "true",  // Trust Kong's pre-validated JWT from cookies
        CELERY_BROKER_URL: "amqp://admin:admin@localhost:5672/"
      }
    },

    // -------------------
    // Helpdesk (Frontend)
    // -------------------
    {
      name: 'helpdesk-frontend',
      cwd: path.join(projectRoot, 'hdts/frontendfolder'),
      script: './node_modules/vite/bin/vite.js',
      interpreter: 'node',
      watch: false,
      windowsHide: true,
      env: {
        // Kong Gateway Mode - All API calls routed through Kong (port 8080)
        VITE_AUTH_URL: "http://localhost:8003",
        VITE_HDTS_BACKEND_URL: "http://localhost:8080/helpdesk",
        VITE_WORKFLOW_API_URL: "http://localhost:8080/workflow",
        VITE_MESSAGING_API_URL: "http://localhost:8080/messaging",
        VITE_MESSAGING_WS_URL: "ws://localhost:8080/messaging/ws",
        VITE_MEDIA_URL: "http://localhost:8080/helpdesk/media/"
      }
    },

    // -------------------
    // Auth Frontend (Port 3001)
    // -------------------
    // Standalone login/registration UI - uses Vite proxy to route API calls
    // This ensures cookies are same-origin (frontend proxies to backend)
    {
      name: 'auth-frontend',
      cwd: path.join(projectRoot, 'auth/frontend'),
      script: './node_modules/vite/bin/vite.js',
      interpreter: 'node',
      watch: false,
      windowsHide: true,
      env: {
        // Empty = use relative paths, Vite proxy handles routing
        VITE_API_BASE_URL: "",
        VITE_ENV: "development",
        VITE_DEBUG: "true",
        // HDTS frontend URL for employee redirect after login
        VITE_HDTS_FRONTEND_URL: "http://165.22.247.50:5173",
        // Feature flags
        VITE_ENABLE_REGISTRATION: "true",
        VITE_ENABLE_PASSWORD_RESET: "true",
        VITE_ENABLE_RECAPTCHA: "false"
      }
    },

    // -------------------
    // Main Frontend (Kong Gateway Mode)
    // -------------------
    // Frontend uses its own .env configuration.
    // When using Kong, update frontend/.env to route through Kong:
    //   VITE_AUTH_URL=http://localhost:8000/auth
    //   VITE_WORKFLOW_API=http://localhost:8000/workflow
    //   etc.
    // No changes needed here - frontend .env controls routing.
    {
      name: 'main-frontend',
      cwd: path.join(projectRoot, 'tts/frontend'),
      script: './node_modules/vite/bin/vite.js',
      interpreter: 'node',
      watch: false,
      windowsHide: true,
      env: {
        // Kong Gateway Mode - All API calls routed through Kong (port 8080)
        // Kong uses prefix-based routing: /helpdesk/*, /workflow/*, /notification/*, /messaging/*
        // Kong strips the prefix and forwards to the backend service
        VITE_AUTH_URL: "http://localhost:8003",  // Auth direct (login page before Kong auth)
        VITE_WORKFLOW_API: "http://localhost:8080/workflow",  // Through Kong
        VITE_BACKEND_API: "http://localhost:8080/workflow",   // Through Kong (workflow is the main backend)
        VITE_NOTIFICATION_API: "http://localhost:8080/notification",  // Through Kong
        VITE_NOTIFICATION_WS: "ws://localhost:8080/notification/ws",  // WebSocket through Kong
        VITE_MESSAGING_API: "http://localhost:8080/messaging",  // Through Kong
        VITE_MESSAGING_WS: "ws://localhost:8080/messaging/ws",  // WebSocket through Kong
        VITE_HELPDESK_SERVICE_URL: "http://localhost:8080/helpdesk"  // Through Kong
      }
    }
  ]
};
