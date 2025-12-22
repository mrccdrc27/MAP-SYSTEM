# syntax=docker/dockerfile:1

FROM python:3.11-slim as base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc bash \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Development stage
FROM base as development
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p staticfiles

# Ensure entrypoint.sh uses LF and is executable
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

EXPOSE 8001
CMD ["./entrypoint.sh"]

# Production stage
FROM base as production
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p staticfiles
RUN python manage.py collectstatic --noinput
EXPOSE 8001
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn authentication.wsgi:application --bind 0.0.0.0:8001"]
