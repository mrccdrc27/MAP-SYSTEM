# syntax=docker/dockerfile:1

FROM python:3.11-slim as base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Increase pip default timeout to reduce ReadTimeout during docker builds
ENV PIP_DEFAULT_TIMEOUT=100
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libjpeg-dev \
    zlib1g-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Development stage
FROM base as development
# Upgrade pip tools first (more robust resolver and connection handling)
RUN python -m pip install --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p static staticfiles media
RUN chmod +x entrypoint.sh
EXPOSE 8003
CMD ["./entrypoint.sh"]

# Production stage
FROM base as production
RUN python -m pip install --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p static staticfiles media
RUN python manage.py collectstatic --noinput
EXPOSE 8003
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn contexts.wsgi:application --bind 0.0.0.0:8003"]
