#bms/auth_service/core/settings.py
from pathlib import Path
import os
from dotenv import load_dotenv
from datetime import timedelta
import dj_database_url
import re

BASE_DIR = Path(__file__).resolve().parent  # This is auth_service/core/

# Load .env - Check multiple locations
env_locations = [
    BASE_DIR.parent / '.env',           # auth_service/.env
    BASE_DIR.parent.parent / '.env',    # project_root/.env
]

env_loaded = False
for env_path in env_locations:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
        print(f"✅ Loaded .env from: {env_path}")
        env_loaded = True
        break

if not env_loaded:
    print("⚠️ No .env file found in expected locations")
    print(f"Searched: {[str(p) for p in env_locations]}")

# Debug email configuration
print("=" * 60)
print("EMAIL CONFIGURATION:")
print(f"EMAIL_HOST_USER: {os.getenv('EMAIL_HOST_USER')}")
print(f"EMAIL_HOST_PASSWORD: {'*' * len(os.getenv('EMAIL_HOST_PASSWORD', ''))} (length: {len(os.getenv('EMAIL_HOST_PASSWORD', ''))})")
print(f"EMAIL_HOST: {os.getenv('EMAIL_HOST')}")
print(f"EMAIL_PORT: {os.getenv('EMAIL_PORT')}")
print("=" * 60)

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')

DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'


# LOGGING = {
#     'version': 1,
#     'disable_existing_loggers': False,
#     'formatters': {
#         'verbose': {
#             'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
#             'style': '{',
#         },
#         'simple': {
#             'format': '{levelname} {asctime} {name}: {message}', # Added name for clarity
#             'style': '{',
#         },
#     },
#     'handlers': {
#         'console': {
#             'level': 'DEBUG', # Capture DEBUG and above from all configured loggers
#             'class': 'logging.StreamHandler',
#             'formatter': 'simple',
#         },
#     },
#     'loggers': {
#         'django': {
#             'handlers': ['console'],
#             'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'), # Set to DEBUG for very verbose Django logs
#             'propagate': False,
#         },
#         'django.db.backends': {
#             'handlers': ['console'],
#             'level': 'DEBUG', # Set to DEBUG to see SQL queries, or INFO for connection issues
#             'propagate': False,
#         },
#         'users': { # Your app's logger (for views.py, models.py, etc. in 'users' app)
#             'handlers': ['console'],
#             'level': 'DEBUG', # Capture all DEBUG messages from your 'users' app
#             'propagate': False,
#         },
#         # You can add loggers for other apps if you have them
#         'gunicorn.error': { # Capture Gunicorn's error logs specifically
#             'handlers': ['console'],
#             'level': 'DEBUG',
#             'propagate': False,
#         },
#         # 'gunicorn.access': { # Gunicorn access logs can be noisy, enable if needed
#         # 'handlers': ['console'],
#         # 'level': 'DEBUG',
#         # 'propagate': False,
#         # }
#     },
#     'root': { # Catch-all for other logs
#         'handlers': ['console'],
#         'level': 'INFO', # Root logger level, set to DEBUG for maximum verbosity
#     },
# }



# ALLOWED_HOSTS Configuration - Updated for Render with Railway fallback
ALLOWED_HOSTS = ['localhost', '127.0.0.1']

if not DEBUG:
    # Render configuration (primary)
    RENDER_EXTERNAL_HOSTNAME = os.getenv('RENDER_EXTERNAL_HOSTNAME')
    if RENDER_EXTERNAL_HOSTNAME:
        ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)
    
    # Add Render service domains
    ALLOWED_HOSTS.extend([
        'auth-service-cdln.onrender.com',  # Your auth service domain
        '.onrender.com',  # All Render subdomains
    ])
    
    # Railway fallback configuration
    RAILWAY_PUBLIC_DOMAIN = os.getenv('RAILWAY_PUBLIC_DOMAIN')
    if RAILWAY_PUBLIC_DOMAIN:
        ALLOWED_HOSTS.append(RAILWAY_PUBLIC_DOMAIN)
    
    # Railway domains as fallback
    if os.getenv('RAILWAY_ENVIRONMENT'):
        ALLOWED_HOSTS.extend([
            '.railway.app',
            '.up.railway.app',
        ])

# Remove duplicates and empty strings
ALLOWED_HOSTS = sorted(list(set(filter(None, ALLOWED_HOSTS))))

print(f"DEBUG: Final ALLOWED_HOSTS in settings.py: {ALLOWED_HOSTS}")


# Railway static URL
RAILWAY_STATIC_URL = os.getenv('RAILWAY_STATIC_URL')
if RAILWAY_STATIC_URL:
    hostname = RAILWAY_STATIC_URL.replace('https://', '').replace('http://', '')
    ALLOWED_HOSTS.append(hostname)

# Railway's internal service domain pattern
import re
railway_service_url = os.getenv('RAILWAY_SERVICE_URL')
if railway_service_url:
    hostname = railway_service_url.replace('https://', '').replace('http://', '')
    ALLOWED_HOSTS.append(hostname)

# Allow Railway's internal domains (wildcard for Railway's internal networking)
if os.getenv('RAILWAY_ENVIRONMENT'):  # Check if running on Railway
    ALLOWED_HOSTS.extend([
        '.railway.app',  # All Railway subdomains
        '.up.railway.app',  # Railway's app domains
    ])

# For production, might need:
# ALLOWED_HOSTS.append('your-custom-domain.com')
    
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_spectacular',
    'pwned_passwords_django',    # For pwned password validation

    'users', 
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        # Add 'DIRS': [os.path.join(BASE_DIR.parent, 'users', 'templates')] if you have templates in app
        'DIRS': [os.path.join(BASE_DIR.parent, 'users', 'templates')], # For password reset email template
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

WSGI_APPLICATION = 'core.wsgi.application'

DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=True  # Explicitly enable SSL for Railway
                              # dj_database_url will handle this for psycopg2
        )
    }
else:
    # Fallback to local .env settings for AUTH_DB_*
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('AUTH_DB_NAME'),
            'USER': os.getenv('AUTH_DB_USER'),
            'PASSWORD': os.getenv('AUTH_DB_PASSWORD'),
            'HOST': os.getenv('AUTH_DB_HOST', 'localhost'),
            'PORT': os.getenv('AUTH_DB_PORT', '5432'),
        }
    }

AUTH_USER_MODEL = 'users.User' # Points to User model in the 'users' app

AUTHENTICATION_BACKENDS = [
    'users.authentication.EmailOrPhoneNumberBackend',
    'django.contrib.auth.backends.ModelBackend',
]


AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {
        'NAME': 'users.password_validators.CustomPasswordValidator', # Make sure path is correct
        'OPTIONS': {'min_length': 8, 'max_length': 64}
    },
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'pwned_passwords_django.validators.PwnedPasswordsValidator'},
]

PASSWORD_HASHERS = [
    'users.hashers.CustomArgon2PasswordHasher', # Make sure path is correct
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
]


LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# CORS - Updated for Render with Railway fallback
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "https://frontend-r2az.onrender.com",
    "https://budget-pro-static-site.onrender.com", # <--- ADD THIS NEW URL
    "https://budget-pro.onrender.com",
    os.getenv('FRONTEND_URL'),
    os.getenv('BUDGET_SERVICE_PUBLIC_URL'),
]

# Add Railway URLs as fallback
railway_frontend = os.getenv('RAILWAY_FRONTEND_URL')
railway_budget = os.getenv('RAILWAY_BUDGET_URL')
if railway_frontend:
    CORS_ALLOWED_ORIGINS.append(railway_frontend)
if railway_budget:
    CORS_ALLOWED_ORIGINS.append(railway_budget)

# Filter out None values
CORS_ALLOWED_ORIGINS = [origin for origin in CORS_ALLOWED_ORIGINS if origin]

CORS_ALLOW_ALL_ORIGINS = DEBUG  # Restrict in production
CORS_ALLOW_CREDENTIALS = True


# Email Configuration (copied from monolith, uses .env)
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)
FRONTEND_URL = os.getenv('FRONTEND_URL') # Used by django-rest-passwordreset

# JWT Settings (copied from monolith)
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(hours=4),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': False, # Important: last_login update is handled by LoginView logic
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY, # Uses the project's SECRET_KEY
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    # Add 'VERIFYING_KEY': None, if you switch to RS256 later
    # Add other claims you want in the token, e.g., role
    'CLAIMS_SERIALIZER': 'users.serializers.MyTokenObtainPairSerializer.get_token', # If you want to add custom claims to token
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [ 
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_RENDERER_CLASSES': [ # Add JSONRenderer if not default
        'rest_framework.renderers.JSONRenderer',
        # 'rest_framework.renderers.BrowsableAPIRenderer', # Optional for dev
    ],
    # Add rate limiting if using django-ratelimit globally
    # 'DEFAULT_THROTTLE_CLASSES': [
    #     'rest_framework.throttling.AnonRateThrottle',
    #     'rest_framework.throttling.UserRateThrottle'
    # ],
    # 'DEFAULT_THROTTLE_RATES': {
    #     'anon': '100/day',
    #     'user': '1000/day'
    # }
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Auth Service API",
    "DESCRIPTION": "Authentication and User Management API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    'SWAGGER_UI_SETTINGS': {'defaultModelsExpandDepth': -1},
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': r'/api/auth/', # Important: Prefix for auth service
}

# For django-ratelimit (if we use its decorators)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}
RATELIMIT_USE_CACHE = 'default'


STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR.parent, 'staticfiles_auth')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


# For UserActivityLog (if you decide to keep it simple in auth service for auth events)
# LOGGING configuration can be added here