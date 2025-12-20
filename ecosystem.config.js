const path = require('path');

const venvPath = path.join(__dirname, 'venv', 'Scripts');
const pythonInterpreter = path.join(venvPath, 'python.exe');
const celeryScript = path.join(venvPath, 'celery.exe');

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
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        DJANGO_ALLOWED_HOSTS: "localhost,127.0.0.1,auth-service",
        CELERY_BROKER_URL: "amqp://admin:admin@127.0.0.1:5672//",
        DJANGO_CORS_ALLOWED_ORIGINS: "http://localhost:1000,http://127.0.0.1:1000",
        TTS_SYSTEM_URL: "http://localhost:1000/",
        AMS_SYSTEM_URL: "http://localhost:3000/ams",
        HDTS_SYSTEM_URL: "http://localhost:3000/hdts",
        BMS_SYSTEM_URL: "http://localhost:3000/bms",
        DEFAULT_SYSTEM_URL: "http://localhost:3000/dashboard"
      }
    },

    // -------------------
    // Workflow API Service
    // -------------------
    {
      name: 'workflow-api',
      cwd: './workflow_api',
      script: 'manage.py',
      args: 'runserver 0.0.0.0:8002',
      interpreter: pythonInterpreter,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        DJANGO_ALLOWED_HOSTS: "localhost,127.0.0.1,workflow-api",
        DJANGO_CELERY_BROKER_URL: "amqp://admin:admin@127.0.0.1:5672//",
        DJANGO_NOTIFICATION_SERVICE_BROKER_URL: "amqp://admin:admin@127.0.0.1:5672//",
        DJANGO_NOTIFICATION_QUEUE: "notification-queue-default",
        DJANGO_TICKET_STATUS_QUEUE: "ticket_status-default",
        DJANGO_INAPP_NOTIFICATION_QUEUE: "inapp-notification-queue",
        DJANGO_AUTH_SERVICE_URL: "http://localhost:8003",
        DJANGO_NOTIFICATION_SERVICE_URL: "http://localhost:8006",
        DJANGO_TTS_SERVICE_URL: "http://localhost:8002",
        DJANGO_USER_SERVICE_URL: "http://localhost:3000",
        DJANGO_BASE_URL: "http://localhost:8002",
        DJANGO_FRONTEND_URL: "http://localhost:1000/register",
        DJANGO_CORS_ALLOWED_ORIGINS: "http://localhost:1000,http://127.0.0.1:1000"
      }
    },
    {
      name: 'workflow-worker',
      cwd: './workflow_api',
      script: celeryScript,
      args: '-A workflow_api worker --pool=solo --loglevel=info -Q role_send-default,TICKET_TASKS_PRODUCTION,tts.role.sync,tts.user_system_role.sync,workflow_seed_queue,workflow_seed',
      interpreter: 'none',
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        DJANGO_CELERY_BROKER_URL: "amqp://admin:admin@127.0.0.1:5672//",
        DJANGO_NOTIFICATION_SERVICE_BROKER_URL: "amqp://admin:admin@127.0.0.1:5672//",
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
      cwd: './notification_service',
      script: 'manage.py',
      args: 'runserver 0.0.0.0:8006',
      interpreter: pythonInterpreter,
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
        DJANGO_CELERY_BROKER_URL: "amqp://admin:admin@127.0.0.1:5672//",
        DJANGO_NOTIFICATION_QUEUE: "notification-queue",
        DJANGO_INAPP_NOTIFICATION_QUEUE: "inapp-notification-queue"
      }
    },
    {
      name: 'notification-worker',
      cwd: './notification_service',
      script: celeryScript,
      args: '-A notification_service worker --pool=solo --loglevel=info -Q notification-queue-default,inapp-notification-queue',
      interpreter: 'none',
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        DJANGO_CELERY_BROKER_URL: "amqp://admin:admin@127.0.0.1:5672//",
        DJANGO_NOTIFICATION_QUEUE: "notification-queue",
        DJANGO_INAPP_NOTIFICATION_QUEUE: "inapp-notification-queue"
      }
    },

    // -------------------
    // Messaging Service
    // -------------------
    {
      name: 'messaging-service',
      cwd: './messaging',
      script: 'manage.py',
      args: 'runserver 0.0.0.0:8005',
      interpreter: pythonInterpreter,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        DJANGO_ALLOWED_HOSTS: "localhost,127.0.0.1,messaging-service",
        DJANGO_CORS_ALLOWED_ORIGINS: "http://localhost:1000,http://127.0.0.1:1000",
        DJANGO_CORS_ALLOW_CREDENTIALS: "True",
        DJANGO_MEDIA_BASE_URL: "http://localhost:8005"
      }
    },
    // specifically excluding the ticket service for now
    /*
    {
      name: 'ticket-service',
      cwd: './ticket_service',
      script: 'manage.py',
      args: 'runserver 0.0.0.0:8004',
      interpreter: pythonInterpreter,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        DJANGO_ALLOWED_HOSTS: "localhost,127.0.0.1,ticket-service",
        DJANGO_CORS_ALLOWED_ORIGINS: "http://localhost:1000,http://127.0.0.1:1000",
        CELERY_BROKER_URL: "amqp://admin:admin@127.0.0.1:5672//"
      }
    },
    */
    {
      name: 'ticket-worker',
      cwd: './ticket_service',
      script: celeryScript,
      args: '-A ticket_service worker --pool=solo --loglevel=info -Q ticket_tasks-default',
      interpreter: 'none',
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True",
        CELERY_BROKER_URL: "amqp://admin:admin@127.0.0.1:5672//"
      }
    },

    // -------------------
    // Helpdesk (Backend)
    // -------------------
    {
      name: 'helpdesk-backend',
      cwd: './helpdesk',
      script: 'manage.py',
      args: 'runserver 0.0.0.0:8000', 
      interpreter: pythonInterpreter,
      env: {
        DJANGO_ENV: "development",
        DJANGO_DEBUG: "True"
      }
    },
    {
      name: 'helpdesk-worker',
      cwd: './helpdesk',
      script: celeryScript,
      args: '-A backend worker --loglevel=info --queues=hdts.user.sync,hdts.user_system_role.sync,hdts.employee.sync,ticket_tasks2 --pool=solo',
      interpreter: 'none',
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
      cwd: './frontendfolder',
      script: 'cmd.exe',
      args: '/c npm run dev',
      watch: false
    },

    // -------------------
    // Main Frontend
    // -------------------
    {
      name: 'main-frontend',
      cwd: './frontend',
      script: 'cmd.exe',
      args: '/c npm run dev',
      watch: false,
      env: {
        VITE_AUTH_URL: "http://localhost:8003",
        VITE_WORKFLOW_API: "http://localhost:8002/workflow",
        VITE_BACKEND_API: "http://localhost:8002/"
      }
    }
  ]
};
