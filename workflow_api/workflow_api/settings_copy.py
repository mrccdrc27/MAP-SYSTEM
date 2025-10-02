import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
import dj_database_url

# Base directory of the project
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file only if not in production/containerized environment
# This ensures docker-compose environment variables take precedence
if not os.getenv('DJANGO_ENV') == 'production':
    LOCAL_ENV = BASE_DIR / '.env'
    load_dotenv(dotenv_path=LOCAL_ENV)

# Security settings - prioritize environment variables from docker-compose
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-$6412+n(t#!#4zo%akvxla5cub-u-i8!ulxck68_+97g_z066^')
DEBUG = os.getenv('DJANGO_DEBUG', 'False') == 'True'  # Default to False for security
ALLOWED_HOSTS = ['*'] if DEBUG else os.getenv('DJANGO_ALLOWED_HOSTS', '*').split(',')

# Queue names
DJANGO_NOTIFICATION_QUEUE = os.getenv('DJANGO_NOTIFICATION_QUEUE', 'notification-queue-default')
DJANGO_TICKET_STATUS_QUEUE = os.getenv('DJANGO_TICKET_STATUS_QUEUE', 'ticket_status-default')

# Function to print environment variables check only once
def print_env_check_once():
    # Setting a flag to indicate the check has been run
    if not hasattr(print_env_check_once, 'has_run'):
        print("=============================")
        print("Environment variables check:")
        print(f"DJANGO_ENV: {os.getenv('DJANGO_ENV', 'Not set')} (production or development)")
        print(f"DJANGO_DEBUG: {os.getenv('DJANGO_DEBUG', 'Not set')} (Current DEBUG setting: {DEBUG})")
        print(f"DJANGO_SECRET_KEY: {'Set' if os.getenv('DJANGO_SECRET_KEY') else 'Not set - using default'}")
        print(f"DATABASE_URL: {os.getenv('DATABASE_URL', 'Not set')}")
        if 'default' in DATABASES:
            if 'ENGINE' in DATABASES['default']:
                print(f"Current DB Engine: {DATABASES['default']['ENGINE']}")
            else:
                print("Current DB Engine: Using dj_database_url config")
        else:
            print("Database configuration not yet available")
        print(f"DJANGO_CELERY_BROKER_URL: {os.getenv('DJANGO_CELERY_BROKER_URL', 'Not set')}")
        print(f"DJANGO_NOTIFICATION_QUEUE: {os.getenv('DJANGO_NOTIFICATION_QUEUE', 'Not set')} (Using: {DJANGO_NOTIFICATION_QUEUE})")
        print(f"DJANGO_TICKET_STATUS_QUEUE: {os.getenv('DJANGO_TICKET_STATUS_QUEUE', 'Not set')} (Using: {DJANGO_TICKET_STATUS_QUEUE})")
        print(f"DJANGO_USER_SERVICE: {os.getenv('DJANGO_USER_SERVICE', 'Not set')}")
        print(f"DJANGO_ALLOWED_HOSTS: {os.getenv('DJANGO_ALLOWED_HOSTS', 'Not set')} (Using: {ALLOWED_HOSTS})")
        if not os.getenv('DJANGO_ENV') == 'production' and 'LOCAL_ENV' in globals():
            print(f".env file location: {LOCAL_ENV}")
            print(f".env file exists: {os.path.exists(LOCAL_ENV)}")
        else:
            print(".env file location: Not used in production")
            print(".env file exists: N/A")
        print("=============================\n")
        print_env_check_once.has_run = True

# Installed apps
INSTALLED_APPS = [
    # Django default apps
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
    'action',
    'step_instance',
    'action_log',
    'task',
    'tickets',
    'amscheckout',
    'bmscheckout',
    'workflowmanager',

    # Third-party dependencies
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_extensions',
    'django_filters',
    'drf_spectacular',
]

# Middleware
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

# URL configuration
ROOT_URLCONF = 'workflow_api.urls'

# Templates
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

# WSGI application
WSGI_APPLICATION = 'workflow_api.wsgi.application'

# Database
if os.getenv('DJANGO_ENV') == 'production':
    DATABASES = {
        'default': dj_database_url.config(
            default=os.environ.get('DATABASE_URL')
        )
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Print environment variables check once after database configuration
print_env_check_once()

# Authentication and password validation
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

# Static files
STATIC_URL = 'static/'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# Simple JWT settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=5),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}

# CORS settings
CORS_ALLOW_ALL_ORIGINS = True

# Logging
# LOGGING = {
#     'version': 1,
#     'disable_existing_loggers': False,
#     'formatters': {
#         'verbose': {
#             'format': '{asctime} [{levelname}] {name} — {message}',
#             'style': '{',
#         },
#     },
#     'handlers': {
#         'workflow_file': {
#             'level': 'DEBUG',
#             'class': 'logging.FileHandler',
#             'filename': os.path.join(BASE_DIR, 'logs', 'workflow.log'),
#             'formatter': 'verbose',
#         },
#     },
#     'loggers': {
#         'workflow': {
#             'handlers': ['workflow_file'],
#             'level': 'DEBUG',
#             'propagate': False,
#         },
#     },
# }

# Celery settings
CELERY_BROKER_URL = os.getenv('DJANGO_CELERY_BROKER_URL')

CELERY_TASK_DEFAULT_QUEUE = DJANGO_NOTIFICATION_QUEUE
CELERY_TASK_DEFAULT_DELIVERY_MODE = 'persistent'
CELERY_TASK_ACKS_LATE = True
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'

# External service URLs
USER_SERVICE_URL = os.getenv('DJANGO_USER_SERVICE')
BASE_URL = os.getenv('DJANGO_USER_SERVICE')

CELERY_TASK_ROUTES = {
    "notifications.tasks.create_assignment_notification": {"queue": DJANGO_NOTIFICATION_QUEUE},
    'send_ticket_status': {'queue': DJANGO_TICKET_STATUS_QUEUE},
}

STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
