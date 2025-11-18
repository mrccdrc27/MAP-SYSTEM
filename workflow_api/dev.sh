.py #!/bin/sh
# Apply migrations
python manage.py flush --noinput
python manage.py makemigrations
python manage.py migrate
# python manage.py flush --no-inppythout

python manage.py runserver 0.0.0.0:8002