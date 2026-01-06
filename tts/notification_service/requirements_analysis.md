# Requirements Analysis

The following analysis identifies unused and redundant packages in `requirements.txt`.

## Unused Packages
No unused packages were found. All listed packages are either imported directly in the Python code, configured in `settings.py`, or used in deployment scripts (`Dockerfile`, `entrypoint.sh`).

## Redundant Packages
The following packages are explicitly listed in `requirements.txt` but are also installed as dependencies of other listed packages. They can be considered redundant in terms of installation, but keeping them ensures specific versions are pinned.

- **Django**: Installed as a dependency of:
    - `djangorestframework`
    - `django-celery-results`
    - `django-cors-headers`
    - `channels`
- **celery**: Installed as a dependency of:
    - `django-celery-results`
- **daphne**: Installed as a dependency of:
    - `channels` (v4.0+)

## Usage Details
| Package | Primary Usage |
|---------|---------------|
| `Django` | Core framework. Used throughout. |
| `djangorestframework` | Imports `rest_framework`. Used in views and serializers. |
| `python-decouple` | Imports `decouple`. Used in `settings.py`. |
| `requests` | Imports `requests`. Used in `app/websocket_utils.py` for internal broadcasting. |
| `PyJWT` | Imports `jwt`. Used in `app/authentication.py`. |
| `django-celery-results` | Configured in `INSTALLED_APPS`. |
| `celery` | Imports `celery`. Used for tasks. |
| `gunicorn` | Used in `Dockerfile` and `entrypoint.sh` for WSGI server. |
| `whitenoise` | Configured in `MIDDLEWARE` for static files. |
| `dj-database-url` | Imports `dj_database_url`. Used in `settings.py`. |
| `psycopg2-binary` | Implicitly used by Django's PostgreSQL backend (`settings.py`). |
| `django-cors-headers` | Configured in `INSTALLED_APPS` and `MIDDLEWARE`. |
| `channels` | Imports `channels`. Used for WebSockets (`app/consumers.py`). |
| `daphne` | Configured in `INSTALLED_APPS` and acts as ASGI server. |
