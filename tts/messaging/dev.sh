#!/bin/sh
python manage.py makemigrations --noinput
python manage.py migrate --noinput
# seeds

python manage.py runserver 0.0.0.0:8005