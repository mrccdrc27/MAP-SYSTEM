# Use official Python image with specific version for reproducibility
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # Prevents Python from writing pyc files
    PYTHONDONTWRITEBYTECODE=1 \
    # Prevents Python from buffering stdout and stderr
    PYTHONUNBUFFERED=1 \
    # pip
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100

# Set work directory
WORKDIR /app

# Install system dependencies and clean up in one step to reduce layer size
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Make entrypoint script executable - done after copy to ensure permissions stick
RUN chmod +x /app/entrypoint.sh

# Specify port for clarity
EXPOSE 8001

# Run entrypoint script
CMD ["/app/entrypoint.sh"]