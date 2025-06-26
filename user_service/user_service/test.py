import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# Base directory of the project
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
LOCAL_ENV = BASE_DIR / '.env'
load_dotenv(dotenv_path=LOCAL_ENV)

DEBUG = os.getenv('DJANGO_DEBUG', 'True') == 'True'
ALLOWED_HOSTS = ['*'] if DEBUG else os.getenv('DJANGO_ALLOWED_HOSTS', '').split(',')

print(f"DEBUG: {DEBUG}")
print(f"ALLOWED_HOSTS: {ALLOWED_HOSTS}")    