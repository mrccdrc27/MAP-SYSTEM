#!/usr/bin/env python
from celery import Celery
import uuid
import os
from datetime import datetime

BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'amqp://admin:admin@localhost:5672/')
QUEUE_NAME = os.environ.get('INAPP_NOTIFICATION_QUEUE', 'inapp-notification-queue')

app = Celery('notification_sender', broker=BROKER_URL)

def send_single_notification(user_id, subject, message):
    task_id = str(uuid.uuid4())
    print(f"Sending notification to user {user_id} with task_id {task_id}")
    
    result = app.send_task(
        'notifications.create_inapp_notification',
        args=[user_id, subject, message],
        queue=QUEUE_NAME,
    )
    
    print(f"Task sent with ID: {result.id}")
    return result.id

if __name__ == "__main__":
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    send_single_notification(
        user_id=1,
        subject="__TEST__",
        message=f"This is a single test notification sent at {timestamp}"
    )
