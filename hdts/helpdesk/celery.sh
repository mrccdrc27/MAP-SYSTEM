#!/bin/sh
set -e

echo "Celery worker starting: waiting for DB and migrations..."

# Wait for database to be ready
until python manage.py showmigrations >/dev/null 2>&1; do
  echo "Database unavailable or migrations not applied, retrying in 2s..."
  sleep 2
done

echo "Database ready. Starting Celery worker..."
exec celery -A backend worker --loglevel=info --queues=hdts.user.sync,hdts.user_system_role.sync,hdts.employee.sync,ticket_tasks2,ticket_status-default --pool=solo

