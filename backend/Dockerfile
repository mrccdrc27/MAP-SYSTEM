# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Install system dependencies if any

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entrypoint script
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Copy the rest of the application's code
COPY . .


# Expose the port the app runs on
EXPOSE 8000

# Run the entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]

# The command to run when the container starts
# Note: The wsgi path is capstone.wsgi, not core.wsgi like in auth_service
CMD ["gunicorn", "capstone.wsgi:application", "--bind", "0.0.0.0:8000"]