FROM python:3.13-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application
COPY . .

# Expose port 8001 (different from auth service which uses 8000)
EXPOSE 8001

# Run migrations and start server
CMD ["python", "manage.py", "runserver", "0.0.0.0:8001"]