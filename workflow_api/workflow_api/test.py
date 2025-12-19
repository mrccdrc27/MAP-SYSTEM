import os
import sys
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv


# locate .env root
BASE_DIR = Path(__file__).resolve().parent.parent
# ROOT_ENV = BASE_DIR.parent / '.env'      # project-root/.env
LOCAL_ENV = BASE_DIR / '.env'            # app1/.env
load_dotenv(dotenv_path=LOCAL_ENV)

ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', '*').split(',')

# Safe print that handles closed stdout during tests
try:
    if not (hasattr(sys.stdout, 'closed') and sys.stdout.closed):
        print(ALLOWED_HOSTS)
except (ValueError, AttributeError, IOError):
    pass  # Silently skip if stdout is closed
