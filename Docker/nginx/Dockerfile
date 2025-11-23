FROM nginx:1.25-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create directories for media files
RUN mkdir -p /app/media /var/www/certbot

# Expose ports
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Run nginx
CMD ["nginx", "-g", "daemon off;"]
