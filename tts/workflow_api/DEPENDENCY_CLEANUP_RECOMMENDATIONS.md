# Dependency Cleanup Recommendations

Based on a comprehensive analysis of the `workflow_api` codebase and current `requirements.txt`, the following dependencies have been identified as unused, redundant, or necessary.

## 1. Unused Libraries (Safe to Remove)
These packages are listed in `requirements.txt` but are **not imported or used** anywhere in the current source code (`.py` files). They are likely leftovers from removed features (e.g., `document_parser_3.py`) or unused test utilities.

*   **`scipy`**: Only `numpy` is currently used in `reporting/views/forecasting_views.py`.
*   **`Faker`**: No imports found in source or test files.
*   **`pdfplumber`**: PDF processing (unused).
*   **`pdfminer.six`**: PDF processing (unused).
*   **`pypdfium2`**: PDF processing (unused).
*   **`python-docx`**: Word document processing (unused).
*   **`pillow`**: Image processing (unused).
*   **`lxml`**: XML processing (unused).

## 2. Redundant / Transitive Dependencies
These packages are automatically installed as dependencies of major frameworks (Django, Celery, Requests). Keeping them in `requirements.txt` is unnecessary unless you need to pin a specific version.

### Included in Celery:
*   `amqp`
*   `billiard`
*   `kombu`
*   `vine`
*   `click`
*   `click-didyoumean`
*   `click-plugins`
*   `click-repl`

### Included in Django:
*   `asgiref`
*   `sqlparse`
*   `tzdata` (Windows specific, usually handled automatically)

### Included in Requests:
*   `certifi`
*   `charset-normalizer`
*   `idna`
*   `urllib3`

### Included in DRF SimpleJWT:
*   `PyJWT`

### Others (Common Transitive Dependencies):
*   `pycparser` (via `cffi`)
*   `wcwidth` (via `prompt_toolkit`)
*   `six`
*   `typing_extensions`

## 3. Recommended `requirements.txt`
This is the cleaned list of dependencies actually required by your application code:

```text
# Core Frameworks
Django==5.2.1
djangorestframework==3.16.0
celery==5.5.3

# API & Auth
djangorestframework_simplejwt==5.5.0
drf-spectacular==0.28.0
django-cors-headers==4.7.0

# Database & Environment
psycopg2
dj-database-url
python-decouple==3.8
python-dotenv==1.1.0

# Utilities
django-extensions==4.1
django-filter==25.1
requests==2.32.4
numpy>=1.24.0  # Used in forecasting_views.py

# Server / Production
gunicorn==20.1.0
whitenoise
```
