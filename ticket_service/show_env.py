import os
import django
from pathlib import Path

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ticket_service.settings")
django.setup()

# Test environment variables
print("\n==== ENVIRONMENT VARIABLES TEST ====")
print(f"CELERY_BROKER_URL: {os.getenv('CELERY_BROKER_URL', 'Not set')}")
print(f"CELERY_TASK_DEFAULT_QUEUE: {os.getenv('CELERY_TASK_DEFAULT_QUEUE', 'Not set')}")
print(f"DEBUG from env: {os.getenv('DEBUG', 'Not set')}")
print(f"SECRET_KEY from env: {os.getenv('SECRET_KEY', 'Not set')}")
print("====================================\n")

# Also print the location of the .env file that should be loaded
base_dir = Path(__file__).resolve().parent
env_path = base_dir / '.env'
print(f"Looking for .env file at: {env_path}")
print(f"Does .env file exist? {env_path.exists()}")