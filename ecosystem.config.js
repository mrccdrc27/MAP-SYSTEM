const path = require('path');

const venvPath = path.join(__dirname, 'venv', 'Scripts');
const pythonInterpreter = path.join(venvPath, 'pythonw.exe');
const celeryScript = path.join(__dirname, 'venv', 'Lib', 'site-packages', 'celery', '__main__.py');

module.exports = {
  apps: [
    // -------------------
    // Auth Service
    // -------------------
    {
      name: 'auth-service',
      cwd: './auth',
      script: 'manage.py',
      args: 'runserver 0.0.0.0:8003',
      interpreter: pythonInterpreter,
      windowsHide: true,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        DJANGO_ALLOWED_HOSTS: "localhost,127.0.0.1,auth-service",
        CELERY_BROKER_URL: "amqp://admin:admin@localhost:5672/",
        DJANGO_CORS_ALLOWED_ORIGINS: "http://localhost:1000,http://127.0.0.1:1000",
        TTS_SYSTEM_URL: "http://localhost:1000/",
        AMS_SYSTEM_URL: "http://localhost:3000/ams",
        HDTS_SYSTEM_URL: "http://localhost:3000/hdts",
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
      cwd: './tts/workflow_api',
      script: 'manage.py',
      args: 'runserver 0.0.0.0:8002',
      interpreter: pythonInterpreter,
      windowsHide: true,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        DJANGO_ALLOWED_HOSTS: "localhost,127.0.0.1,workflow-api",
        DJANGO_CELERY_BROKER_URL: "amqp://admin:admin@localhost:5672/",
        DJANGO_NOTIFICATION_SERVICE_BROKER_URL: "amqp://admin:admin@localhost:5672/",
        DJANGO_NOTIFICATION_QUEUE: "notification-queue-default",
        DJANGO_TICKET_STATUS_QUEUE: "ticket_status-default",
        DJANGO_INAPP_NOTIFICATION_QUEUE: "inapp-notification-queue",
        DJANGO_AUTH_SERVICE_URL: "http://localhost:8003",
        DJANGO_NOTIFICATION_SERVICE_URL: "http://localhost:8006",
        DJANGO_TTS_SERVICE_URL: "http://localhost:8002",
        DJANGO_USER_SERVICE_URL: "http://localhost:3000",
        DJANGO_BASE_URL: "http://localhost:8002",
        DJANGO_FRONTEND_URL: "http://localhost:1000/register",
        DJANGO_CORS_ALLOWED_ORIGINS: "http://localhost:1000,http://127.0.0.1:1000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
      }
    },
    {
      name: 'workflow-worker',
      cwd: './tts/workflow_api',
      script: pythonInterpreter,
      args: '-m celery -A workflow_api worker --pool=solo --loglevel=info -Q role_send-default,TICKET_TASKS_PRODUCTION,tts.role.sync,tts.user_system_role.sync,workflow_seed_queue,workflow_seed',
      interpreter: 'none',
      windowsHide: true,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        DJANGO_CELERY_BROKER_URL: "amqp://admin:admin@localhost:5672/",
        DJANGO_NOTIFICATION_SERVICE_BROKER_URL: "amqp://admin:admin@localhost:5672/",
        DJANGO_AUTH_SERVICE_URL: "http://localhost:8003",
        DJANGO_NOTIFICATION_SERVICE_URL: "http://localhost:8006",
        C_FORCE_ROOT: "false"
      }
    },

    // -------------------
    // Notification Service
    // -------------------
    {
      name: 'notification-service',
      cwd: './tts/notification_service',
      script: 'manage.py',
      args: 'runserver 0.0.0.0:8006',
      interpreter: pythonInterpreter,
      windowsHide: true,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        DJANGO_ALLOWED_HOSTS: "localhost,127.0.0.1,notification-service",
        DJANGO_CORS_ALLOWED_ORIGINS: "http://localhost:1000,http://127.0.0.1:1000",
        DJANGO_CORS_ALLOW_CREDENTIALS: "True",
        DJANGO_NOTIFICATION_SERVICE_PORT: "8006",
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
      cwd: './tts/notification_service',
      script: pythonInterpreter,
      args: '-m celery -A notification_service worker --pool=solo --loglevel=info -Q notification-queue-default,inapp-notification-queue,user-email-sync-queue',
      interpreter: 'none',
      windowsHide: true,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
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

    // -------------------
    // Messaging Service
    // -------------------
    {
      name: 'messaging-service',
      cwd: './tts/messaging',
      script: 'manage.py',
      args: 'runserver 0.0.0.0:8005',
      interpreter: pythonInterpreter,
      windowsHide: true,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        DJANGO_ALLOWED_HOSTS: "localhost,127.0.0.1,messaging-service",
        DJANGO_JWT_SIGNING_KEY: "signing-key-1234",
        DJANGO_CORS_ALLOWED_ORIGINS: "http://localhost:1000,http://127.0.0.1:1000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
        DJANGO_CORS_ALLOW_CREDENTIALS: "True",
        DJANGO_MEDIA_BASE_URL: "http://localhost:8005"
      }
    },
    // specifically excluding the ticket service for now
    /*
    {
      name: 'ticket-service',
      cwd: './tts/ticket_service',
      script: 'manage.py',
      args: 'runserver 0.0.0.0:8004',
      interpreter: pythonInterpreter,
      windowsHide: true,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        DJANGO_ALLOWED_HOSTS: "localhost,127.0.0.1,ticket-service",
        DJANGO_CORS_ALLOWED_ORIGINS: "http://localhost:1000,http://127.0.0.1:1000",
        CELERY_BROKER_URL: "amqp://admin:admin@localhost:5672/"
      }
    },
    */
    {
      name: 'ticket-worker',
      cwd: './tts/ticket_service',
      script: pythonInterpreter,
      args: '-m celery -A ticket_service worker --pool=solo --loglevel=info -Q ticket_tasks-default',
      interpreter: 'none',
      windowsHide: true,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        CELERY_BROKER_URL: "amqp://admin:admin@localhost:5672/"
      }
    },

    // -------------------
    // Helpdesk (Backend)
    // -------------------
    {
      name: 'helpdesk-backend',
      cwd: './hdts/helpdesk',
      script: 'manage.py',
      args: 'runserver 0.0.0.0:8000', 
      interpreter: pythonInterpreter,
      windowsHide: true,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True"
      }
    },
    {
      name: 'helpdesk-worker',
      cwd: './hdts/helpdesk',
      script: pythonInterpreter,
      args: '-m celery -A backend worker --loglevel=info --queues=hdts.user.sync,hdts.user_system_role.sync,hdts.employee.sync,ticket_tasks2 --pool=solo',
      interpreter: 'none',
      windowsHide: true,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True"
      }
    },

    // -------------------
    // Helpdesk (Frontend)
    // -------------------
    {
      name: 'helpdesk-frontend',
      cwd: './hdts/frontendfolder',
      script: './node_modules/vite/bin/vite.js',
      interpreter: 'node',
      watch: false,
      windowsHide: true
    },

    // -------------------
    // Main Frontend
    // -------------------
    {
      name: 'main-frontend',
      cwd: './tts/frontend',
      script: './node_modules/vite/bin/vite.js',
      interpreter: 'node',
      watch: false,
      windowsHide: true,
      env: {
        VITE_AUTH_URL: "http://localhost:8003",
        VITE_WORKFLOW_API: "http://localhost:8002/workflow",
        VITE_BACKEND_API: "http://localhost:8002/"
      }
    }
  ]
};