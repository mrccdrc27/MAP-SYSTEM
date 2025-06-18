# Dockerfile.user

FROM python:3.11-slim-bookworm



# Set working directory
WORKDIR /app

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all source code
COPY . .

# Expose port (optional, for local dev)
EXPOSE 8000

# Start Django using Gunicorn
CMD ["gunicorn", "tracking_service.wsgi:application", "--bind", "0.0.0.0:8000"]
