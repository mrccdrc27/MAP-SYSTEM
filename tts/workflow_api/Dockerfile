# Use a lightweight Python base image (Debian-based for compatibility)
FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system dependencies
# - build-essential: for compiling Python packages
# - libpq-dev: for PostgreSQL
# - libreoffice: for document conversion
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip

# Copy application requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# Copy project files into the container
COPY . .

# Expose the application port
EXPOSE 8000

# Command to run the Django server
COPY start.sh .
RUN chmod +x start.sh

CMD ["sh", "start.sh"]
