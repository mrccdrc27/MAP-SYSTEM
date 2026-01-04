from pathlib import Path
from decouple import config
import os
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Environment detection
DJANGO_ENV = config('DJANGO_ENV', default='development')
IS_PRODUCTION = DJANGO_ENV.lower() == 'production'

SECRET_KEY = config(
    'DJANGO_SECRET_KEY',
    default='insecure-test-secret-key-change-in-production' if not IS_PRODUCTION else None
)
if IS_PRODUCTION and not config('DJANGO_SECRET_KEY', default=None):
    raise ValueError('DJANGO_SECRET_KEY must be set in production environment')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DJANGO_DEBUG', default='False' if IS_PRODUCTION else 'True', cast=lambda x: x.lower() in ('true', '1', 'yes'))

ALLOWED_HOSTS = config(
    'DJANGO_ALLOWED_HOSTS',
    default='localhost,127.0.0.1,auth_service' if not IS_PRODUCTION else 'localhost',
    cast=lambda v: [s.strip() for s in v.split(',')]
)

# Always allow the Render domain, regardless of DEBUG setting
ALLOWED_HOSTS.extend([
    'auth-service-cdln.onrender.com',
    '.onrender.com'
])

RENDER_EXTERNAL_HOSTNAME = os.getenv('RENDER_EXTERNAL_HOSTNAME')
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

# Application definition
# testapp

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',  # Add this for token blacklisting
    'drf_spectacular', 
    'rest_framework_api_key',
    'corsheaders',  # Add CORS headers support
    # Your apps
    'users',
    'roles',
    'systems',
    'system_roles',
    'tts',  # Make sure TTS app is included
    'hdts',  # Make sure HDTS app is included
    'emails',  # Email service with SendGrid
    'keys',  # API keys management
]
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Add CORS middleware at the top
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'auth.middleware.JWTAuthenticationMiddleware',  # Add JWT authentication middleware for cookies
    'users.authentication_middleware.AuthenticationRoutingMiddleware',  # Centralized auth & routing
]

ROOT_URLCONF = 'auth.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'auth.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

# Railway and production setup using DATABASE_URL
if config('DATABASE_URL', default=''):
    DATABASES = {
        'default': dj_database_url.config(
            default=config('DATABASE_URL'),
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
# Legacy production setup with individual env vars
elif DJANGO_ENV == 'production':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('POSTGRES_DB'),
            'USER': config('POSTGRES_USER'),
            'PASSWORD': config('POSTGRES_PASSWORD'),
            'HOST': config('PGHOST'),
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

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',  # Keep for backward compatibility
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]

# REST Framework configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'users.authentication.CookieJWTAuthentication',  # Custom cookie-based JWT auth
        'rest_framework_simplejwt.authentication.JWTAuthentication',  # Fallback to header auth
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    # Conditionally enable browsable API only in DEBUG mode
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",  # Browsable UI (only in DEBUG)
    ) if DEBUG else (
        "rest_framework.renderers.JSONRenderer",
    ),
    
}
# JWT Settings (optional; good defaults)
from datetime import timedelta

# JWT Signing Key - separate from SECRET_KEY for better security
# Can be shared across services for token verification
JWT_SIGNING_KEY = config(
    'DJANGO_JWT_SIGNING_KEY',
    default=SECRET_KEY  # Fallback to SECRET_KEY if not explicitly set
)

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': JWT_SIGNING_KEY,
    'USER_ID_FIELD': 'id',  # Use the integer primary key field
    'USER_ID_CLAIM': 'user_id',  # The claim in the token that will contain the user ID
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Centralized Authentication Service API',
    'DESCRIPTION': 'API for user identity, authentication, and multi-system role management.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'TAGS': [
        {'name': 'Authentication', 'description': 'User registration and authentication endpoints'},
        {'name': 'User Profile', 'description': 'User profile management endpoints'},
        {'name': '2FA', 'description': 'Two-factor authentication endpoints'},
        {'name': 'Password Reset', 'description': 'Password reset functionality'},
        {'name': 'Tokens', 'description': 'JWT token management (obtain, refresh, verify)'},
        {'name': 'Systems', 'description': 'System registration and management'},
        {'name': 'Roles', 'description': 'Role definition and management within systems'},
        {'name': 'System Roles', 'description': 'User-role assignments within systems'},
    ],
}

# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'

if DEBUG:
    STATICFILES_DIRS = [
        os.path.join(BASE_DIR, "static"),
    ]

STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# Media files (User uploaded content like profile pictures)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'users.User'

# Email Configuration
# SendGrid is the primary email backend
# Falls back to console backend in development if SendGrid is not configured
DEFAULT_FROM_EMAIL = config('SENDGRID_FROM_EMAIL', default='noreply@yourapp.com')

# SMTP settings (used as fallback if SendGrid is disabled)
EMAIL_HOST = config('DJANGO_EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('DJANGO_EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('DJANGO_EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('DJANGO_EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('DJANGO_EMAIL_HOST_PASSWORD', default='')

# Frontend URL for invitation links
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000')

# Cookie domain configuration
COOKIE_DOMAIN = config('COOKIE_DOMAIN', default='localhost')

# Session and Cookie Security Settings
# Only enforce secure cookies in production with HTTPS
# For development, allow HTTP even when DEBUG=False
SESSION_COOKIE_SECURE = config('DJANGO_SESSION_COOKIE_SECURE', default='False' if not IS_PRODUCTION else 'True', cast=lambda x: x.lower() in ('true', '1', 'yes'))
CSRF_COOKIE_SECURE = config('DJANGO_CSRF_COOKIE_SECURE', default='False' if not IS_PRODUCTION else 'True', cast=lambda x: x.lower() in ('true', '1', 'yes'))
# Set to True in production with HTTPS

# CSRF Trusted Origins - Required for Django 4.0+
# Add your Railway domain and frontend domain here
CSRF_TRUSTED_ORIGINS = config(
    'DJANGO_CSRF_TRUSTED_ORIGINS',
    default='http://localhost:3000,http://127.0.0.1:3000' if not IS_PRODUCTION else 'https://yourdomain.com',
    cast=lambda v: [s.strip() for s in v.split(',')]
)

# CORS Configuration - Allow frontend to access backend
# Always use environment variable if provided; defaults to localhost origins
CORS_ALLOWED_ORIGINS = config(
    'DJANGO_CORS_ALLOWED_ORIGINS',
    default='http://localhost:1000,http://127.0.0.1:1000,http://localhost:3000,http://127.0.0.1:3000',
    cast=lambda v: [s.strip() for s in v.split(',')]
)

# For development only - allows all origins (less secure)
CORS_ALLOW_ALL_ORIGINS = True

# Allow credentials (cookies, authorization headers) to be sent with requests
CORS_ALLOW_CREDENTIALS = True

# Allow specific headers that your frontend might send
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

# Login Configuration
LOGIN_URL = '/login/'
LOGIN_REDIRECT_URL = '/api/v1/users/profile/'
LOGOUT_REDIRECT_URL = '/login/'

# System Template URLs Configuration
# Configure URLs for different systems - can point to external deployed systems
SYSTEM_TEMPLATE_URLS = {
    'tts': config('TTS_SYSTEM_URL', default='http://localhost:1000'),
    'ams': config('AMS_SYSTEM_URL', default='http://localhost:3000/ams'),
    'hdts': config('HDTS_SYSTEM_URL', default='http://localhost:5173/employee/home'),
    'bms': config('BMS_SYSTEM_URL', default='http://localhost:3000/bms'),
}

# Fallback system URL for unknown systems
DEFAULT_SYSTEM_URL = config('DEFAULT_SYSTEM_URL', default='http://localhost:3000/dashboard')

# Celery Configuration
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='amqp://admin:admin@localhost:5672/')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_TASK_ACKS_LATE = True
CELERY_RESULT_BACKEND = None  # Disable result backend to avoid dependencies

# Celery Task Routes
CELERY_TASK_ROUTES = {
    # TTS routes
    'tts.tasks.sync_role_to_workflow_api': {'queue': 'tts.role.sync'},
    'tts.tasks.sync_user_system_role_to_workflow_api': {'queue': 'tts.user_system_role.sync'},
    'tts.tasks.sync_user_system_role_delete': {'queue': 'tts.user_system_role.sync'},
    # HDTS routes
    'hdts.tasks.sync_user': {'queue': 'hdts.user.sync'},
    'hdts.tasks.sync_user_system_role': {'queue': 'hdts.user_system_role.sync'},
    # HDTS to TTS sync routes (for cross-system role/user sync)
    'hdts.tasks.sync_hdts_role_to_tts': {'queue': 'tts.role.sync'},
    'hdts.tasks.sync_hdts_user_to_tts': {'queue': 'tts.user_system_role.sync'},
}

CELERY_TASK_DEFAULT_QUEUE = 'default'

# Google reCAPTCHA v3 Configuration
RECAPTCHA_SITE_KEY = config('RECAPTCHA_SITE_KEY', default='6LdbGyMsAAAAAKv5tivNNE-g-fVz1a5Pc7EueLZT')
RECAPTCHA_SECRET_KEY = config('RECAPTCHA_SECRET_KEY', default='6LdbGyMsAAAAAMcf9a4PKGAWL0E4NtF9cdjInlth')
RECAPTCHA_VERSION = '2'  # v2 uses checkbox verification
# Set to False to bypass reCAPTCHA validation (useful for development/testing)
RECAPTCHA_ENABLED = config('RECAPTCHA_ENABLED', default='True', cast=lambda x: x.lower() in ('true', '1', 'yes'))

# SendGrid Email Configuration
SENDGRID_API_KEY = config('SENDGRID_API_KEY', default='')
SENDGRID_FROM_EMAIL = config('SENDGRID_FROM_EMAIL', default=DEFAULT_FROM_EMAIL)
SENDGRID_FROM_NAME = config('SENDGRID_FROM_NAME', default='TicketFlow')
SENDGRID_ENABLED = config('SENDGRID_ENABLED', default='True', cast=lambda x: x.lower() in ('true', '1', 'yes'))
SENDGRID_SANDBOX_MODE_IN_DEBUG = config('SENDGRID_SANDBOX_MODE_IN_DEBUG', default='False', cast=lambda x: x.lower() in ('true', '1', 'yes'))
SUPPORT_EMAIL = config('SUPPORT_EMAIL', default='support@ticketflow.com')

# Set EMAIL_BACKEND based on SendGrid configuration
if SENDGRID_ENABLED and SENDGRID_API_KEY:
    # Use SendGrid backend when API key is configured
    EMAIL_BACKEND = 'sendgrid_backend.SendgridBackend'
elif DEBUG:
    # Fall back to console backend in development
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
else:
    # Use SMTP backend as fallback in production
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
