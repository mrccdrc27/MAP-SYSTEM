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

# Copy and enable entrypoint that waits for DB, runs migrations, creates superuser,
# collects static files, then execs the container command (e.g. gunicorn).
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Also copy to /backend/entrypoint.sh to satisfy runtime scripts that reference
# the relative path "backend/entrypoint.sh" (some platforms call chmod on this path).
COPY entrypoint.sh /backend/entrypoint.sh
RUN chmod +x /backend/entrypoint.sh

# Use the entrypoint and keep the default command to run gunicorn.
ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "backend.wsgi"]