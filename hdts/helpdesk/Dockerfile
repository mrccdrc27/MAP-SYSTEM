FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the Django project
COPY . .

# Create media directory for file uploads
RUN mkdir -p /app/media/employee_images /app/media/ticket_attachments

# Copy and enable start script for migrations and seeding
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Default command runs the start script
CMD ["/start.sh"]