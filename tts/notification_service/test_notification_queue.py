#!/usr/bin/env python
"""
Test script to send in-app notifications to the notification_service via Celery.

Usage:
    python test_notification_queue.py

This script demonstrates how to send notifications directly to the Celery queue
without going through the notification_service API.
"""

import os
import sys
import json
import uuid
from datetime import datetime
from celery import Celery

# Broker URL - same as in notification_service settings
BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'amqp://admin:admin@localhost:5672/')

# Queue name - must match the one in notification_service settings
QUEUE_NAME = os.environ.get('INAPP_NOTIFICATION_QUEUE', 'inapp-notification-queue')

# Create a standalone Celery app to send tasks
app = Celery('notification_sender', broker=BROKER_URL)

def send_single_notification(user_id, subject, message):
    """
    Send a single in-app notification to a user.
    
    Args:
        user_id (int): User ID to receive the notification
        subject (str): Notification subject
        message (str): Notification message content
    """
    task_id = str(uuid.uuid4())
    print(f"Sending notification to user {user_id} with task_id {task_id}")
    
    result = app.send_task(
        'notifications.create_inapp_notification',
        args=[user_id, subject, message],
        kwargs={},
        queue=QUEUE_NAME,
        task_id=task_id
    )
    
    print(f"Task sent with ID: {result.id}")
    return result.id

def send_bulk_notifications(notifications_data):
    """
    Send multiple notifications in bulk.
    
    Args:
        notifications_data (list): List of dictionaries with user_id, subject, and message
    """
    task_id = str(uuid.uuid4())
    print(f"Sending {len(notifications_data)} notifications in bulk with task_id {task_id}")
    
    result = app.send_task(
        'notifications.bulk_create_notifications',
        args=[notifications_data],
        kwargs={},
        queue=QUEUE_NAME,
        task_id=task_id
    )
    
    print(f"Bulk task sent with ID: {result.id}")
    return result.id

def mark_notification_read(notification_id):
    """
    Mark a notification as read.
    
    Args:
        notification_id (str): UUID of the notification to mark as read
    """
    task_id = str(uuid.uuid4())
    print(f"Marking notification {notification_id} as read with task_id {task_id}")
    
    result = app.send_task(
        'notifications.mark_notification_read',
        args=[notification_id],
        kwargs={},
        queue=QUEUE_NAME,
        task_id=task_id
    )
    
    print(f"Task sent with ID: {result.id}")
    return result.id

if __name__ == "__main__":
    # Simple command-line interface
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "single" and len(sys.argv) >= 5:
            user_id = int(sys.argv[2])
            subject = sys.argv[3]
            message = sys.argv[4]
            send_single_notification(user_id, subject, message)
            
        elif command == "bulk":
            # Example bulk data
            bulk_data = [
                {"user_id": 1, "subject": "Test Notification 1", "message": "This is test message 1"},
                {"user_id": 2, "subject": "Test Notification 2", "message": "This is test message 2"},
                {"user_id": 3, "subject": "Test Notification 3", "message": "This is test message 3"},
            ]
            send_bulk_notifications(bulk_data)
            
        elif command == "mark-read" and len(sys.argv) >= 3:
            notification_id = sys.argv[2]
            mark_notification_read(notification_id)
            
        else:
            print("Invalid command or arguments")
            print("Usage:")
            print("  python test_notification_queue.py single <user_id> <subject> <message>")
            print("  python test_notification_queue.py bulk")
            print("  python test_notification_queue.py mark-read <notification_id>")
    
    else:
        # Default demo - send test notifications
        print("=== Sending test notifications ===")
        
        # Send a single notification
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        send_single_notification(
            user_id=1, 
            subject="Test Notification",
            message=f"This is a test notification sent at {timestamp}"
        )
        
        # Send bulk notifications
        bulk_data = [
            {
                "user_id": 1,
                "subject": "Workflow Update",
                "message": "Your workflow has progressed to the next stage"
            },
            {
                "user_id": 2,
                "subject": "Task Assignment",
                "message": "You have been assigned a new task"
            },
            {
                "user_id": 3,
                "subject": "Ticket Status Change",
                "message": "A ticket has been marked as resolved"
            }
        ]
        send_bulk_notifications(bulk_data)
        
        print("\nTest notifications sent! Check the notification_service worker logs.")
        print("To view more options, run: python test_notification_queue.py --help")