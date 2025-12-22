from django.apps import AppConfig

class WorkflowConfig(AppConfig):
    name = 'workflow'  # must match your app name in INSTALLED_APPS

    def ready(self):
        import workflow.signals  