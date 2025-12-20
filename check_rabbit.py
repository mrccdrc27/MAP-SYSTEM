from kombu import Connection

# Use the single slash for the default vhost
URL = "amqp://guest:guest@127.0.0.1:5672/"

print(f"Connecting to {URL}...")
try:
    with Connection(URL) as conn:
        conn.connect()
        print("✅ SUCCESS: VS Code is officially talking to RabbitMQ!")
except Exception as e:
    print(f"❌ FAILED: Connection error: {e}")