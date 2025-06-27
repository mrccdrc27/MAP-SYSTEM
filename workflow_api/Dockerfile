# Use a lightweight Python base image
FROM python:3.11-alpine

# Set working directory inside the container
WORKDIR /app

# Define build arguments
ARG DJANGO_JWT_KEY
ARG DJANGO_ALLOWED_HOSTS
ARG DJANGO_USER_SERVICE
ARG DJANGO_BASE_URL
ARG DEBUG
ARG DJANGO_CELERY_BROKER_URL
ARG DATABASE_URL
ARG DJANGO_ENV

# Set environment variables
ENV DJANGO_JWT_KEY=${DJANGO_JWT_KEY}
ENV DJANGO_ALLOWED_HOSTS=${DJANGO_ALLOWED_HOSTS}
ENV DJANGO_USER_SERVICE=${DJANGO_USER_SERVICE}
ENV DJANGO_BASE_URL=${DJANGO_BASE_URL}
ENV DEBUG=${DEBUG}
ENV DJANGO_CELERY_BROKER_URL=${DJANGO_CELERY_BROKER_URL}
ENV DATABASE_URL=${DATABASE_URL}
ENV DJANGO_ENV=${DJANGO_ENV}

# Install necessary dependencies
RUN apk add --no-cache \
    build-base \
    libffi-dev \
    postgresql-dev \
    && pip install --no-cache-dir --upgrade pip

# Copy application requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# Copy project files into the container
COPY . .

# Set the environment variables
ENV PYTHONUNBUFFERED=1

# Expose the application port
EXPOSE 8000

# Command to run the Django server
COPY start.sh .
RUN chmod +x start.sh

CMD ["sh", "start.sh"]
