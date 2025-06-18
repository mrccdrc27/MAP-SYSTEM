python manage.py migrate
python manage.py runserver 0.0.0.0:3000 

gunicorn user_service.wsgi:application --bind 0.0.0.0:8000