from celery import Celery

# This points to the same RabbitMQ broker
external_celery = Celery("ticket_service", broker="amqp://localhost")

def send_step_assignment_notification(user_id, ticket_reference_id, step_instance_id):
    external_celery.send_task(
        "notifications.tasks.create_assignment_notification",  # full task path in user_service
        args=[user_id, str(ticket_reference_id), str(step_instance_id)],
        kwargs={},  # optional
        queue="default"  # or whatever queue user_service listens to
    )
