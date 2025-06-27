from celery import Celery
import json
import time

# Define Celery app using RabbitMQ as broker
app = Celery('ticket_status_mq', broker='amqp://GY6Jx5nsXW5edoIB:DGHuVF0tWCZgWnO~T51D._6viJWc7U_B@ballast.proxy.rlwy.net:48690//')

# Task that simulates sending a JSON message
@app.task(queue='ticket_status-prod', name='send_ticket_status')
def send_ticket_status(ticket_id, status):
    data = {
        "ticket_number": ticket_id,
        "new_status": status
    }
    json_data = json.dumps(data)
    print("Sending JSON to queue:", json_data)
    return json_data

if __name__ == "__main__":  # Fixed incorrect "__main__" check
    print("Sending task to queue...")
    result = send_ticket_status.delay("TX7929", "On Process")
    print("Task ID:", result.id)

    # Optional: wait for result
    while not result.ready():
        print("Waiting for result...")
        time.sleep(1)
    print("Result from worker:", result.get())