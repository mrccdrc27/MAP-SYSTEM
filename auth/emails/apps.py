from django.apps import AppConfig


class EmailsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'emails'
    verbose_name = 'Email Service'
    
    def ready(self):
        """Import signal handlers if needed"""
        pass

