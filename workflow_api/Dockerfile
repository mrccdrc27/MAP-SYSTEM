# Use a lightweight Python base image
FROM python:3.11-alpine

# Set working directory inside the container
WORKDIR /app

# Install necessary dependencies
RUN apk add --no-cache \
    build-base \
    libffi-dev \
    postgresql-dev \
    && pip install --no-cache-dir --upgrade pip

# Copy application requirements and install dependencies first (for better caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# Set environment variables that will be overridden by docker-compose
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=workflow_api.settings
ENV PYTHONDONTWRITEBYTECODE=1

# Copy project files into the container (excluding files in .dockerignore)
COPY . .

# Make start.sh executable
RUN chmod +x start.sh

# Create media directory for file uploads
RUN mkdir -p media

# Expose the application port
EXPOSE 8000

# Use start.sh as the entry point
CMD ["./start.sh"]
