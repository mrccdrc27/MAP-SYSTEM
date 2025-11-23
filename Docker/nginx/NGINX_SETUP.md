# Nginx Reverse Proxy Setup

## Overview

An nginx reverse proxy has been configured to handle all external traffic and route requests to the appropriate backend services internally within the Docker network. This provides a single entry point for the entire system while maintaining secure internal communication between services.

## Architecture

```
Internet/External Client
           ↓
    Nginx Reverse Proxy (Port 80, 443)
    ├→ auth-service:8000
    ├→ ticket-service:7000
    ├→ workflow-api:8000
    ├→ notification-service:8001
    └→ messaging-service:8001
```

## Configuration Details

### Nginx Service (docker-compose.yml)

The nginx service is configured to:
- Listen on ports **80 (HTTP)** and **443 (HTTPS)** for external traffic
- Communicate internally with backend services via the **tts_network** Docker bridge network
- Mount the nginx configuration, SSL certificates, and media files
- Include health checks for availability monitoring

**Service Dependencies:**
- Depends on all backend services being healthy before starting
- Has built-in health check endpoint at `/health`

### Backend Service Routes

#### HTTP to HTTPS Redirect
```
HTTP (port 80) → automatically redirects to HTTPS (port 443)
```

#### API Route Mappings
| Route | Backend Service | Internal Port |
|-------|-----------------|---------------|
| `/api/v1/auth/` | auth-service | 8000 |
| `/api/v1/tickets/` | ticket-service | 8000 |
| `/api/v1/workflows/` | workflow-api | 8000 |
| `/api/v1/comments/` | messaging-service | 8001 |
| `/api/v1/notifications/` | notification-service | 8001 |
| `/ws/` | messaging-service | 8001 (WebSocket) |
| `/media/` | Shared Volume | - |
| `/health` | Nginx | - (Health Check) |

### Features

#### Load Balancing
- Uses `least_conn` strategy for optimal distribution
- Supports failover with configurable retry limits

#### Rate Limiting
Three rate limiting zones are configured:
- **auth_limit**: 5 requests/second (burst: 20)
- **api_limit**: 10 requests/second (burst: 20)
- **general_limit**: 30 requests/second (burst: 50)

#### Security Headers
- `X-Frame-Options: SAMEORIGIN` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME-sniffing
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Strict-Transport-Security` - Enforces HTTPS (HSTS)

#### Compression
- Gzip compression enabled for:
  - HTML, CSS, JavaScript, JSON
  - Font files (TrueType, OpenType)
  - SVG and RSS feeds

#### WebSocket Support
- Full WebSocket upgrade support on `/ws/` route
- Timeout: 7 days for persistent connections
- Required for real-time messaging functionality

#### File Handling
- **Max upload size**: 100MB
- **Media files**: Cached for 30 days with immutable flag
- **Static files**: Cached for 365 days

### Docker Network

A custom bridge network `tts_network` is created for all services to enable:
- Internal service-to-service communication using service names
- Isolation from external traffic
- Predictable DNS resolution

**Service Discovery Examples:**
```
http://auth-service:8000
http://ticket-service:7000
http://workflow-api:8000
http://notification-service:8001
http://messaging-service:8001
```

## SSL/TLS Configuration

### Certificate Setup

1. **Self-Signed Certificates** (Development):
   ```bash
   mkdir -p Docker/ssl
   openssl req -x509 -newkey rsa:4096 -nodes -out Docker/ssl/fullchain.pem -keyout Docker/ssl/privkey.pem -days 365
   ```

2. **Let's Encrypt Certificates** (Production):
   - Certbot integration is pre-configured
   - Place certificates in `Docker/ssl/` directory
   - Nginx will serve the certificates from `/etc/nginx/ssl/`

### Ports
- **Port 80**: HTTP (redirects to HTTPS)
- **Port 443**: HTTPS (production-ready)

## Starting the Services

### With Docker Compose
```bash
cd Docker
docker-compose build
docker-compose up -d
```

### Verification

1. **Check Nginx Container Status:**
   ```bash
   docker-compose ps nginx
   ```

2. **Verify Health Check:**
   ```bash
   curl http://localhost/health
   # Response: healthy
   ```

3. **Test Service Routing:**
   ```bash
   # Test auth endpoint
   curl -X GET http://localhost/api/v1/auth/

   # Test health check
   curl http://localhost/health
   ```

4. **View Nginx Logs:**
   ```bash
   docker-compose logs -f nginx
   ```

## Performance Optimizations

- **Worker Processes**: Auto-configured based on CPU count
- **Worker Connections**: 2048 per process
- **Buffer Policies**: Request buffering disabled for streaming
- **Connection Pooling**: Persistent upstream connections
- **Gzip Level**: 6 (balanced compression/speed)

## Troubleshooting

### Nginx Won't Start
```bash
# Check configuration syntax
docker exec nginx-proxy nginx -t

# View error logs
docker-compose logs nginx
```

### Upstream Service Unreachable
- Verify service names match `docker-compose.yml`
- Ensure all services are on `tts_network`
- Check firewall rules on service ports

### SSL Certificate Issues
- Verify certificate files exist in `Docker/ssl/`
- Check file permissions: `chmod 600 privkey.pem`
- Validate certificate expiration

### High Memory/CPU Usage
- Check rate limiting configuration
- Review access logs for suspicious patterns
- Monitor upstream service health

## File Structure

```
Docker/
├── docker-compose.yml          # Service definitions with nginx
├── nginx/
│   ├── Dockerfile             # Nginx Alpine container
│   ├── nginx.conf             # Main configuration
│   └── conf.d/                # Additional config includes
├── ssl/                       # SSL/TLS certificates
│   ├── fullchain.pem          # Full certificate chain
│   └── privkey.pem            # Private key
└── certbot/                   # Let's Encrypt validation
```

## Production Checklist

- [ ] SSL certificates installed in `Docker/ssl/`
- [ ] Review and adjust rate limiting zones
- [ ] Update CORS origins if needed
- [ ] Configure proper logging and monitoring
- [ ] Test failover scenarios
- [ ] Set up log rotation
- [ ] Document any custom routes added

## Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Docker Networking Guide](https://docs.docker.com/network/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
