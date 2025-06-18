# Dockerfile.user

FROM python:3.11-alpine



# Set working directory
WORKDIR /app/user_service

ARG DJANGO_ALLOWED_HOSTS
ENV DJANGO_ALLOWED_HOSTS=${DJANGO_ALLOWED_HOSTS}

# Install necessary dependencies
RUN apk add --no-cache \
    build-base \
    libffi-dev \
    postgresql-dev \
    && pip install --no-cache-dir --upgrade pip

# Copy application requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all source code
COPY . .

# Expose port (optional, for local dev)
EXPOSE 8000

# Command to run the Django server
COPY start.sh .
RUN chmod +x start.sh

CMD ["sh", "start.sh"]
