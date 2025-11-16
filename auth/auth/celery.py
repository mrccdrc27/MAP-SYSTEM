"""
Celery configuration for the auth service.
Sets up Celery to work with Django and autodiscover tasks.
"""

import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')

app = Celery('auth')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
