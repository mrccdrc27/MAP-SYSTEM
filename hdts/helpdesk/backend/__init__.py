from __future__ import absolute_import, unicode_literals

# Import Celery app if available. During local development we may not have
# Celery installed, so guard the import to avoid breaking manage.py commands.
try:
	from .celery import app as celery_app
except Exception:  # pragma: no cover - local dev may not have Celery
	celery_app = None

__all__ = ('celery_app',)