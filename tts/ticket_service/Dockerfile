# Dockerfile.user

FROM python:3.11-alpine



# Set working directory
WORKDIR /app

# Install necessary dependencies
RUN apk add --no-cache \
    build-base \
    libffi-dev \
    openssl-dev \
    python3-dev \
    musl-dev \
    zlib-dev \
    jpeg-dev \
    gcc \
    libc-dev \
    linux-headers \
    pcre-dev \
    postgresql-dev \
    && pip install --no-cache-dir --upgrade pip

# Copy application requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Copy all source code
COPY . .

# Expose port (optional, for local dev)
EXPOSE 7000

# Command to run the Django server
COPY start.sh .
RUN chmod +x start.sh

CMD ["sh", "start.sh"]