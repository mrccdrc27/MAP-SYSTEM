#!/bin/sh
python manage.py flush --noinput
python manage.py makemigrations --noinput
python manage.py migrate --noinput
# seeds
python manage.py create_default_admin
python manage.py seed_systems
python manage.py seed_tts
python manage.py seed_hdts
python manage.py seed_employees

python manage.py runserver 0.0.0.0:8003