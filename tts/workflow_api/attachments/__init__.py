# workflow_api/attachments/__init__.py
"""
Attachments app for PDF viewing and conversion.

This app provides:
- PDF conversion of ticket attachments for browser viewing
- Caching of converted PDFs
- Proxy download of original files from helpdesk
- Async conversion via Celery

Key components:
- models.py: AttachmentPDFCache model
- views.py: REST API endpoints for frontend
- tasks.py: Celery tasks for async conversion
- services.py: Helpdesk client for service-to-service communication
"""

default_app_config = 'attachments.apps.AttachmentsConfig'
