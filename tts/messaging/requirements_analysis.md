# Requirements Analysis

This document analyzes the `requirements.txt` file to identify unused or redundant packages based on the current codebase.

## Summary

*   **Unused Packages:** None. All packages listed are utilized in the codebase, configuration settings, or deployment scripts.
*   **Redundant Packages:** None. While some packages are dependencies of others, they are all either core components (like Django) or required explicitly due to modern dependency decoupling (like Daphne for Channels 4+).

## Detailed Usage Report

| Package | Status | Usage Context |
| :--- | :--- | :--- |
| **Django** | Used | Core framework. Implicitly used throughout the project. |
| **djangorestframework** | Used | Imported as `rest_framework` in views, serializers, and settings. |
| **drf-spectacular** | Used | Imported as `drf_spectacular` in `comments/viewsets.py` and settings for API documentation. |
| **gunicorn** | Used | Production WSGI server. Used in `Dockerfile.prod` command: `CMD ["gunicorn", ...]`. |
| **django-cors-headers** | Used | Imported as `corsheaders` and configured in `settings.py` (Middleware and Installed Apps). |
| **python-decouple** | Used | Imported as `decouple` in `settings.py` to manage environment variables. |
| **Pillow** | Used | Imported as `PIL` in `comments/models.py` and required for `ImageField` operations. |
| **channels** | Used | Imported as `channels` in `routing.py`, `consumers.py`, and `asgi.py` for WebSocket support. |
| **daphne** | Used | ASGI server. Used explicitly in `entrypoint.sh`: `exec daphne ...`. **Note:** In `channels` version 4.0+, `daphne` is no longer a dependency and must be installed separately, so this entry is **not** redundant. |
| **PyJWT** | Used | Imported as `jwt` in `authentication.py` for handling JSON Web Tokens. |
| **dj-database-url** | Used | Imported as `dj_database_url` in `settings.py` to configure the database from environment variables. |

## Recommendations

*   **Maintain Current List:** The current `requirements.txt` appears accurate and lean. No removals are recommended.
*   **Version Pinning:** `channels`, `Pillow`, `PyJWT`, `dj-database-url` and `daphne` are currently unpinned (no version specified). It is recommended to pin these to specific versions to ensure reproducible builds (e.g., `channels==4.0.0`).
