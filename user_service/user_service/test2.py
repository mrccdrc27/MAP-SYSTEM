# Base directory of the project
import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
LOCAL_ENV = BASE_DIR / '.env'
load_dotenv(dotenv_path=LOCAL_ENV)


FRONTEND_URL = os.getenv('DJANGO_FRONTEND_URL')

print(FRONTEND_URL)