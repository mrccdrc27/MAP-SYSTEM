#!/bin/sh
set -e

echo "Entry point started: waiting for DB and applying migrations..."

# Retry migrations until they succeed (useful if DB isn't ready yet)
until python manage.py migrate --noinput; do
  echo "Database unavailable or migrations failed, retrying in 2s..."
  sleep 2
done

echo "Migrations applied. Ensuring superuser exists..."

# Create a superuser idempotently. The project uses email as USERNAME_FIELD.
python - <<'PY'
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()

email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
username = os.environ.get('DJANGO_SUPERUSER_USERNAME')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
first_name = os.environ.get('DJANGO_SUPERUSER_FIRST_NAME', 'Admin')
last_name = os.environ.get('DJANGO_SUPERUSER_LAST_NAME', 'Admin')
company_id = os.environ.get('DJANGO_SUPERUSER_COMPANY_ID', 'MA0001')

# Choose identifier based on USERNAME_FIELD (the custom user uses email)
identifier = email or username
if not identifier:
    print('No DJANGO_SUPERUSER_EMAIL or DJANGO_SUPERUSER_USERNAME provided; skipping superuser creation.')
else:
    lookup = {User.USERNAME_FIELD: identifier}
    if not User.objects.filter(**lookup).exists():
        print('Creating superuser:', identifier)
        # create_superuser takes email as first arg for this project's manager
        create_kwargs = {
            'password': password or None,
            'first_name': first_name,
            'last_name': last_name,
            'company_id': company_id,
            'is_staff': True,
            'is_superuser': True,
        }
        # If USERNAME_FIELD is 'email', pass email as first arg
        if User.USERNAME_FIELD == 'email':
            User.objects.create_superuser(email=identifier, **create_kwargs)
        else:
            # Fallback: try create_superuser with username positional
            User.objects.create_superuser(identifier, **create_kwargs)
        print('Superuser created.')
    else:
        print('Superuser already exists:', identifier)
PY

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Creating media directories..."
mkdir -p /app/media/employee_images
mkdir -p /app/media/ticket_attachments
chmod 755 /app/media
chmod 755 /app/media/employee_images
chmod 755 /app/media/ticket_attachments

echo "Starting passed command..."
# Exec the command passed to the container (e.g., gunicorn ...)
exec "$@"
