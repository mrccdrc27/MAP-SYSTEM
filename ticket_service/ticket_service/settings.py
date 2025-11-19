from pathlib import Path
import os
from decouple import config
import dj_database_url

# Explicitly load .env file
from dotenv import load_dotenv
env_file = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(env_file, override=True)

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Environment detection
DJANGO_ENV = config('DJANGO_ENV', default='development')
IS_PRODUCTION = DJANGO_ENV.lower() == 'production'

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config(
    'DJANGO_SECRET_KEY',
    default='django-insecure-hb959g!s=^)mvjqic03h5^cvn79!yzn40z^t+cva_-&0^ztk&$' if not IS_PRODUCTION else None
)
if IS_PRODUCTION and not config('DJANGO_SECRET_KEY', default=None):
    raise ValueError('DJANGO_SECRET_KEY must be set in production environment')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DJANGO_DEBUG', default='False' if IS_PRODUCTION else 'True', cast=lambda x: x.lower() in ('true', '1', 'yes'))

ALLOWED_HOSTS = config(
    'DJANGO_ALLOWED_HOSTS',
    default='*' if DEBUG else 'localhost,127.0.0.1',
    cast=lambda v: [s.strip() for s in v.split(',')]
)


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'tickets',

    'rest_framework',
    "corsheaders",
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Added WhiteNoise middleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = 'ticket_service.urls'

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

WSGI_APPLICATION = 'ticket_service.wsgi.application'

CORS_ALLOWED_ORIGINS = [
    "http://localhost:1000",  # Replace with your frontend URL
]

CORS_ALLOW_ALL_ORIGINS = True


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

# Support DATABASE_URL (e.g., from Railway or other platforms)
if config('DATABASE_URL', default=''):
    DATABASES = {
        'default': dj_database_url.config(
            default=config('DATABASE_URL'),
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
# Production setup with individual env vars (PostgreSQL)
elif DJANGO_ENV == 'production':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('POSTGRES_DB', default='ticket_db'),
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
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')  # Directory for collectstatic

# WhiteNoise settings
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


# Media files (uploaded by users or scripts)
MEDIA_URL = '/media/'  # URL prefix to access media files
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')  # Actual filesystem path


# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# Celery
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL') or config('CELERY_BROKER_URL', default='amqp://admin:admin@localhost:5672/')
CELERY_RESULT_BACKEND = 'rpc://'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_TASK_DEFAULT_QUEUE = os.getenv('CELERY_TASK_DEFAULT_QUEUE') or config('CELERY_TASK_DEFAULT_QUEUE', default='ticket_tasks-default')
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True  # Retry connection on startup
CELERY_BROKER_CONNECTION_RETRY = True  # Retry connection
CELERY_BROKER_CONNECTION_MAX_RETRIES = 10  # Max retries

# Option to disable Celery tasks for local development
CELERY_TASK_ALWAYS_EAGER = os.getenv('CELERY_TASK_ALWAYS_EAGER', 'False').lower() in ('true', '1', 't')


# Base URL for the project
BASE_URL = os.getenv('BASE_URL', 'http://localhost:8000')  # Default to 'http://localhost:8004' if not set