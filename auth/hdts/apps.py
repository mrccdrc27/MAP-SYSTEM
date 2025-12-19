from django.apps import AppConfig


class HdtsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'hdts'
    
    def ready(self):
        """Import signals when the app is ready."""
        import hdts.signals
