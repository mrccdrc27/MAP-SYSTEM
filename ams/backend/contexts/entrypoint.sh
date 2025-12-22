#!/bin/bash
set -e

echo "Waiting for database..."
# Wait for database to be ready
until python -c "
import psycopg2
import os
try:
    psycopg2.connect(
        host=os.getenv('CONTEXTS_DB_HOST', 'db'),
        port=os.getenv('CONTEXTS_DB_PORT', '5432'),
        user=os.getenv('CONTEXTS_DB_USER', 'postgres'),
        password=os.getenv('CONTEXTS_DB_PASSWORD', 'password'),
        dbname='postgres'
    )
    print('Database is ready!')
except psycopg2.OperationalError:
    print('Database not ready, waiting...')
    exit(1)
"; do
  sleep 2
done

echo "Running migrations..."
python manage.py migrate --noinput
echo "Starting contexts service..."
python manage.py runserver 0.0.0.0:8003
