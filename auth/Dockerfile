# Use official Python image with specific version for reproducibility
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
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

# Copy entrypoint script first and make executable
COPY entrypoint.sh .
RUN chmod +x /app/entrypoint.sh

# Copy project files - done last to leverage Docker layer caching
COPY . .

# Specify port for clarity
EXPOSE 8000

# Run entrypoint script
CMD ["/app/entrypoint.sh"]