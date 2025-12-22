# syntax=docker/dockerfile:1

FROM python:3.11-slim as base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libjpeg-dev \
    zlib1g-dev \
    libpq-dev \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Development stage
FROM base as development
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p static staticfiles media
RUN chmod +x entrypoint.sh
EXPOSE 8002
CMD ["./entrypoint.sh"]

# Production stage
FROM base as production
RUN apt-get update && apt-get install -y \
    libpq-dev gcc python3-dev musl-dev libffi-dev \
    && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p static staticfiles media
RUN python manage.py collectstatic --noinput
EXPOSE 8002
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn assets.wsgi:application --bind 0.0.0.0:8002"]
