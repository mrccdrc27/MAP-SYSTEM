from __future__ import absolute_import, unicode_literals
import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

app = Celery('ticket_service')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Celery Beat Schedule for periodic tasks
app.conf.beat_schedule = {
    'auto-close-resolved-tickets-every-hour': {
        'task': 'auto_close_resolved_tickets',
        'schedule': crontab(minute=0, hour='*'),  # Run every hour at minute 0
    },
}