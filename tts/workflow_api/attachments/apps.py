# workflow_api/attachments/apps.py
"""
Django app configuration for attachments.
"""

from django.apps import AppConfig


class AttachmentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'attachments'
    verbose_name = 'Attachment PDF Conversion'
    
    def ready(self):
        """
        Import signal handlers when app is ready.
        """
        # Import signals if we add any
        pass
