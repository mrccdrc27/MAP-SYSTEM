import os
from pathlib import Path
from datetime import timedelta
from decouple import config
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Environment detection
DJANGO_ENV = config('DJANGO_ENV', default='development')
IS_PRODUCTION = DJANGO_ENV.lower() == 'production'

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config(
    'DJANGO_SECRET_KEY',
    default='your-auth-service-secret-key-change-in-production' if not IS_PRODUCTION else None
)
if IS_PRODUCTION and not config('DJANGO_SECRET_KEY', default=None):
    raise ValueError('DJANGO_SECRET_KEY must be set in production environment')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DJANGO_DEBUG', default='False' if IS_PRODUCTION else 'True', cast=lambda x: x.lower() in ('true', '1', 'yes'))

ALLOWED_HOSTS = config(
    'DJANGO_ALLOWED_HOSTS',
    default='*' if DEBUG else 'localhost',
    cast=lambda v: [s.strip() for s in v.split(',')]
)

# Application definition
INSTALLED_APPS = [
    # Django apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Project apps
    'workflow',
    'step',
    'role',
    'task',
    'tickets',

    'audit',
    'reporting',

    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_extensions',
    'django_filters',
    'drf_spectacular',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'workflow_api.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'workflow_api.wsgi.application'

# Database
if config('DATABASE_URL', default=''):
    DATABASES = {
        'default': dj_database_url.config(
            default=config('DATABASE_URL')
        )
    }
# Production setup with individual env vars (PostgreSQL)
elif DJANGO_ENV == 'production':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('POSTGRES_DB', default='workflow_db'),
            'USER': config('POSTGRES_USER', default='postgres'),
            'PASSWORD': config('POSTGRES_PASSWORD', default=''),
            'HOST': config('PGHOST', default='localhost'),
            'PORT': config('PGPORT', default=5432),
        }
    }
# Development setup with SQLite
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# # Time Offset Configuration (for testing/simulation purposes)
# # Positive values = simulate future dates, Negative values = simulate past dates
# # Example: TIME_OFFSET_DAYS=7 makes the system behave as if it's 7 days in the future
# # Example: TIME_OFFSET_DAYS=-3 makes the system behave as if it's 3 days in the past
# TIME_OFFSET_DAYS = config('TIME_OFFSET_DAYS', default=1, cast=int)

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend'
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# JWT Settings
# Use the same signing key as auth service for token verification
JWT_SIGNING_KEY = config(
    'DJANGO_JWT_SIGNING_KEY',
    default=SECRET_KEY  # Fallback to SECRET_KEY if not explicitly set
)

# Kong Gateway Integration
# Set to True when running behind Kong API Gateway to skip redundant JWT verification
# Kong validates JWT at the gateway layer, so services can trust the validation
KONG_TRUSTED = config('KONG_TRUSTED', default=False, cast=bool)

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=5),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': JWT_SIGNING_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# CORS Settings
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True
# Always use environment variable if provided; defaults to localhost origins
CORS_ALLOWED_ORIGINS = config(
    'DJANGO_CORS_ALLOWED_ORIGINS',
    default='http://localhost:1000,http://127.0.0.1:1000,http://localhost:5173,http://127.0.0.1:5173',
    cast=lambda v: [s.strip() for s in v.split(',')]
)
# Allow Authorization header for JWT authentication
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Celery Configuration
CELERY_BROKER_URL = config('DJANGO_CELERY_BROKER_URL', default='amqp://guest:guest@127.0.0.1:5672//')    
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_TASK_ACKS_LATE = True
CELERY_RESULT_BACKEND = None  # Disable result backend to avoid dependencies
CELERY_TASK_ALWAYS_EAGER = False  # Run tasks asynchronously
CELERY_TASK_REJECT_ON_WORKER_LOST = True  # Reject tasks if worker lost connection
CELERY_WORKER_PREFETCH_MULTIPLIER = 1  # Prefetch only 1 message at a time
CELERY_TASK_TRACK_STARTED = True  # Track task start
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True  # Retry connection on startup
CELERY_BROKER_CONNECTION_RETRY = True  # Retry connection
CELERY_BROKER_CONNECTION_MAX_RETRIES = 10  # Max retries

# Auth Service Configuration
AUTH_SERVICE_URL = config('DJANGO_AUTH_SERVICE_URL', default='http://localhost:8001')

# Notification Service Configuration
NOTIFICATION_SERVICE_URL = config('DJANGO_NOTIFICATION_SERVICE_URL', default='http://localhost:8001')
NOTIFICATION_SERVICE_BROKER_URL = config('DJANGO_NOTIFICATION_SERVICE_BROKER_URL', default='amqp://guest:guest@127.0.0.1:5672//')

# TTS (Ticket Tracking Service) Configuration for round-robin assignment
TTS_SERVICE_URL = config('DJANGO_TTS_SERVICE_URL', default='http://localhost:8002')

# Helpdesk Service Configuration (for media/attachments)
HELPDESK_SERVICE_URL = config('DJANGO_HELPDESK_SERVICE_URL', default='http://localhost:8000')

# Queue Configuration
DJANGO_NOTIFICATION_QUEUE = config('DJANGO_NOTIFICATION_QUEUE', default='notification-queue-default')
DJANGO_TICKET_STATUS_QUEUE = config('DJANGO_TICKET_STATUS_QUEUE', default='ticket_status-default')
INAPP_NOTIFICATION_QUEUE = config('DJANGO_INAPP_NOTIFICATION_QUEUE', default='inapp-notification-queue')

CELERY_TASK_DEFAULT_QUEUE = DJANGO_NOTIFICATION_QUEUE
CELERY_TASK_ROUTES = {
    # NOTE: Do NOT route task.send_*_notification tasks to inapp-notification-queue
    # These are @shared_tasks in workflow_api that internally call current_app.send_task()
    # They need to run in workflow_api's worker, not notification_service's worker
    # The tasks they delegate to (notifications.*) will be routed to inapp-notification-queue
    # by notification_service's settings.py
    # Ticket status queue
    'send_ticket_status': {'queue': DJANGO_TICKET_STATUS_QUEUE},
    # Role sync queues from TTS auth service
    'role.tasks.sync_role': {'queue': 'tts.role.sync'},
    'role.tasks.sync_user_system_role': {'queue': 'tts.user_system_role.sync'},
    # Workflow seeding queue
    'workflow.seed_workflows': {'queue': 'workflow_seed_queue'},
    # Ticket receive queue - tickets from helpdesk
    'tickets.tasks.receive_ticket': {'queue': 'TICKET_TASKS_PRODUCTION'},
    'tickets.tasks.create_task_for_ticket': {'queue': 'TICKET_TASKS_PRODUCTION'},
}

# External Services
USER_SERVICE_URL = config('DJANGO_USER_SERVICE_URL', default='http://localhost:8000')
AUTH_SERVICE_URL = config('DJANGO_AUTH_SERVICE_URL', default='http://localhost:8000')
BASE_URL = config('DJANGO_BASE_URL', default='http://localhost:8000')

# Test Runner Configuration (Python 3.13 compatibility)
TEST_RUNNER = 'workflow_api.test_runner.Python313CompatibleTestRunner'
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
