#!/bin/sh

echo "Running migrations..."
python manage.py makemigrations --noinput
python manage.py migrate --noinput

echo "Starting messaging service with Daphne (ASGI)..."
exec daphne -b 0.0.0.0 -p 8001 messaging.asgi:application