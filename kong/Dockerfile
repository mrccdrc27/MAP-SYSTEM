# Kong Gateway Dockerfile
# Uses Kong DB-less mode with declarative configuration

FROM kong:3.6-alpine

# Copy declarative configuration
COPY kong.yml /kong/kong.yml

# Set environment variables for DB-less mode
ENV KONG_DATABASE=off
ENV KONG_DECLARATIVE_CONFIG=/kong/kong.yml
ENV KONG_PROXY_LISTEN="0.0.0.0:8000"
ENV KONG_ADMIN_LISTEN="0.0.0.0:8001"
ENV KONG_LOG_LEVEL=info

# Expose ports
# 8000 - Proxy (public traffic)
# 8001 - Admin API (internal only)
EXPOSE 8000 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD kong health || exit 1
