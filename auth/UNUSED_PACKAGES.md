# Unused and Redundant Packages Analysis

## Unused Packages
These packages are listed in `requirements.txt` but do not appear to be used in the codebase.

*   **`django-recaptcha`**:
    *   **Reasoning**: The project uses manual `requests` calls to verify reCAPTCHA tokens (v2) in `users/serializers.py` and `users/forms.py` instead of using the form fields or widgets provided by `django-recaptcha`. There are no imports from `django_recaptcha` in the codebase, and `captcha` is not in `INSTALLED_APPS`.
    *   **Recommendation**: Remove.

## Redundant (Transitive) Packages
These packages are dependencies of other used packages. Listing them is not strictly necessary unless version pinning is required, but they are not "unused".

*   **`asgiref`**: Dependency of `Django`.
*   **`sqlparse`**: Dependency of `Django`.
*   **`tzdata`**: Dependency of `Django` (on some platforms).
*   **`argon2-cffi-bindings`**: Dependency of `argon2-cffi`.
*   **`sendgrid`**: Dependency of `django-sendgrid-v5`. The project uses `django-sendgrid-v5` as the Django `EMAIL_BACKEND`, but does not import the `sendgrid` library directly in application code.

## Used Packages
All other packages in `requirements.txt` appear to be used:
*   `Django`, `djangorestframework`, `django-cors-headers`: Core framework.
*   `python-decouple`: Used for configuration.
*   `pillow`: Used for image processing (captcha, profile pics).
*   `djangorestframework_simplejwt`: Used for JWT auth.
*   `drf-spectacular`: Used for API documentation.
*   `djangorestframework-api-key`: Used in settings.
*   `psycopg2-binary`, `dj-database-url`: Database connectivity.
*   `whitenoise`: Static file serving.
*   `requests`: Used for external API calls (reCAPTCHA, etc.).
*   `argon2-cffi`: Password hashing.
*   `celery`: Async tasks.
*   `django-sendgrid-v5`: Email backend.
*   `gunicorn`: Production server (assumed).
