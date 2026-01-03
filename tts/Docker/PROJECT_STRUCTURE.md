# Production Deployment Project Structure

## Overview

This document describes the folder structure and file organization for the production deployment blueprint on a DigitalOcean Droplet.

---

## Deployment Directory Structure

```
~/apps/Ticket-Tracking-System/
│
├── Docker/                          # ⭐ MAIN DEPLOYMENT DIRECTORY
│   ├── docker-compose.prod.yml      # Production Docker Compose config (main file to deploy)
│   ├── .env.production              # Production environment variables (KEEP SECURE)
│   ├── .env.production.example      # Template for environment setup
│   │
│   ├── nginx/                       # Reverse proxy & web server configuration
│   │   ├── nginx.conf               # Main Nginx configuration
│   │   ├── conf.d/                  # Individual service configurations
│   │   │   └── frontend.conf        # Frontend SPA routing
│   │   └── ssl/                     # SSL certificates (managed by Certbot)
│   │       ├── fullchain.pem
│   │       └── privkey.pem
│   │
│   ├── db-init/                     # Database initialization scripts
│   │   ├── 01-init.sql              # Initial setup
│   │   └── 02-init-apps.sql         # App-specific database creation
│   │
│   ├── logs/                        # Application logs (mounted from containers)
│   │   ├── auth/
│   │   ├── ticket/
│   │   ├── workflow/
│   │   ├── messaging/
│   │   ├── notification/
│   │   └── celery/                  # Worker logs
│   │
│   └── backups/                     # Database and media backups
│       ├── postgres_backup_*.sql.gz
│       └── media_backup_*.tar.gz
│
├── auth/                            # Auth Service (Django)
│   ├── Dockerfile.prod              # Production-optimized Dockerfile
│   ├── requirements.txt             # Python dependencies
│   ├── manage.py
│   ├── entrypoint.sh               # Container startup script
│   └── auth/                        # Django project
│       └── settings.py              # Configured via environment variables
│
├── ticket_service/                  # Ticket Service (Django)
│   ├── Dockerfile.prod
│   ├── requirements.txt
│   ├── manage.py
│   └── ticket_service/
│
├── workflow_api/                    # Workflow API (Django)
│   ├── Dockerfile.prod
│   ├── requirements.txt
│   ├── manage.py
│   └── workflow_api/
│
├── messaging/                       # Messaging Service (Django + WebSocket)
│   ├── Dockerfile.prod
│   ├── requirements.txt
│   └── messaging/
│
├── notification_service/            # Notification Service (Django + Celery)
│   ├── Dockerfile.prod
│   ├── requirements.txt
│   └── notification_service/
│
├── frontend/                        # React/Vite Frontend
│   ├── Dockerfile.prod              # Multi-stage build (Node → Nginx)
│   ├── package.json
│   ├── vite.config.js
│   └── src/                         # React source code
│
├── Scripts/                         # Helper scripts
│   ├── docker.sh                    # Build and start all services
│
├── documentation/                   # Architecture docs
│   ├── A.6_DEPLOYMENT_AND_INFRASTRUCTURE.md
│   └── ... other docs ...
│
├── ReadMe.md                        # Project overview
└── copilot-instructions.md         # This project's guidelines
```

---

## Key Files for Production Deployment

### 1. **docker-compose.prod.yml** (CRITICAL)
- Main orchestration file for all services
- Configures:
  - PostgreSQL (single instance, multiple logical databases)
  - RabbitMQ (message broker)
  - 5 Django services (auth, ticket, workflow, messaging, notification)
  - 2 Celery workers (workflow, notification)
  - React frontend
  - Nginx reverse proxy
- Volumes for persistent data (databases, media, logs)
- Health checks and restart policies
- Network isolation (internal app-network)

### 2. **.env.production** (CRITICAL - KEEP SECURE)
Contains all environment variables:
- Django secret keys
- Database credentials
- RabbitMQ credentials
- Email configuration
- Domain/URL configuration
- API endpoints
- Security settings

**Storage:** Keep in Git ignored folder, use secure backup

### 3. **nginx/nginx.conf** (IMPORTANT)
Main reverse proxy configuration:
- HTTP → HTTPS redirect
- SSL/TLS termination (Let's Encrypt)
- Rate limiting
- Service routing
- Upstream load balancing
- Security headers
- Compression and caching

### 4. **Dockerfile.prod Files**
Multi-stage builds for each service:
- **Stage 1:** Builder - Install dependencies
- **Stage 2:** Runtime - Minimal image with only runtime dependencies
Benefits:
  - Smaller image size (50-70% reduction)
  - Better security (fewer packages = smaller attack surface)
  - Faster deployments

### 5. **db-init/ Scripts**
Initialize PostgreSQL databases:
- Creates separate logical databases per service
- Initializes extensions
- Sets up replication/backup (if needed)

---

## Environment Variables Organization

### By Category

#### Django Core
```
DJANGO_SECRET_KEY
DJANGO_JWT_SIGNING_KEY
DJANGO_DEBUG=False
DJANGO_ENV=production
```

#### Network & Hosts
```
DJANGO_ALLOWED_HOSTS
DJANGO_CORS_ALLOWED_ORIGINS
DJANGO_CSRF_TRUSTED_ORIGINS
```

#### Database
```
DATABASE_URL=postgresql://user:pass@db:5432/auth_db
DB_USER=postgres
DB_PASSWORD=***
```

#### Message Broker
```
CELERY_BROKER_URL=amqp://admin:***@rabbitmq:5672/
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=***
```

#### Email
```
DJANGO_EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
DJANGO_EMAIL_HOST=smtp.gmail.com
DJANGO_EMAIL_PORT=587
DJANGO_EMAIL_HOST_USER=***
DJANGO_EMAIL_HOST_PASSWORD=***
```

#### Service URLs (Internal & External)
```
DJANGO_BASE_URL=https://yourdomain.com
DJANGO_FRONTEND_URL=https://yourdomain.com
DJANGO_AUTH_SERVICE_URL=http://auth-service:8000
DJANGO_NOTIFICATION_SERVICE_URL=http://notification-service:8001
```

---

## Volumes & Persistent Data

### 1. **postgres_data**
- PostgreSQL database files
- Location: `/var/lib/postgresql/data` inside container
- Host: Docker named volume
- Backup: Daily automated SQL dumps

### 2. **rabbitmq_data**
- RabbitMQ queue persistence
- Location: `/var/lib/rabbitmq` inside container
- Critical for message durability

### 3. **media_files**
- Uploaded files, attachments
- Shared across all services
- Location: `/app/media` inside services
- Host: Docker named volume
- Backup: Daily tarball backups

### 4. **nginx_logs**
- Nginx access and error logs
- Location: `/var/log/nginx` inside Nginx container
- Retained for monitoring and debugging

---

## Network Architecture

### Docker Network: `app-network`
All services communicate internally via Docker DNS:
```
Service → Service Communication (no need for IP addresses)
auth-service:8000
ticket-service:8000
workflow-api:8000
messaging-service:8001
notification-service:8001
db:5432
rabbitmq:5672
```

### External Access (Only via Nginx)
```
Internet
   ↓
Nginx (Port 80 → 443 with SSL)
   ↓ (Reverse Proxy)
Frontend (Port 1000)
Auth Service (Port 8000)
Ticket Service (Port 8000)
Workflow API (Port 8000)
Messaging Service (Port 8001)
Notification Service (Port 8001)
```

Database & RabbitMQ only expose to `127.0.0.1` (localhost), preventing external access.

---

## Port Mapping

| Service | Internal Port | External (Host) | Exposed? |
|---------|---------------|-----------------|----------|
| Frontend | 1000 | Not exposed | Via Nginx |
| Auth | 8000 | Not exposed | Via Nginx |
| Ticket | 8000 | Not exposed | Via Nginx |
| Workflow | 8000 | Not exposed | Via Nginx |
| Messaging | 8001 | Not exposed | Via Nginx |
| Notification | 8001 | Not exposed | Via Nginx |
| PostgreSQL | 5432 | 127.0.0.1:5432 | Localhost only |
| RabbitMQ AMQP | 5672 | 127.0.0.1:5672 | Localhost only |
| RabbitMQ UI | 15672 | 127.0.0.1:15672 | Localhost only |
| Nginx HTTP | 80 | 0.0.0.0:80 | Public |
| Nginx HTTPS | 443 | 0.0.0.0:443 | Public |

---

## File Size Estimates

| Component | Docker Image Size | Notes |
|-----------|------------------|-------|
| auth-service | ~500MB | Python slim base + dependencies |
| ticket-service | ~500MB | Similar to auth |
| workflow-api | ~500MB | Similar to auth |
| messaging-service | ~500MB | Similar to auth |
| notification-service | ~500MB | Similar to auth |
| frontend | ~50MB | Node build optimized |
| nginx | ~20MB | Alpine base |
| postgres | ~150MB | Alpine base |
| rabbitmq | ~150MB | Alpine base |
| **Total built images** | **~2.8 GB** | Shared base layers reduce real usage |

**Actual disk usage on Droplet:** ~4-6 GB (including logs, backups, media)

---

## Deployment Checklist

### Pre-Deployment
- [ ] Domain registered and DNS configured
- [ ] DigitalOcean account created
- [ ] SSH key generated locally
- [ ] Git repository access verified
- [ ] Environment variables file prepared (.env.production)
- [ ] Secure keys generated for Django and JWT

### Droplet Setup
- [ ] Droplet created (2GB RAM, 2vCPU, Ubuntu 22.04)
- [ ] SSH access tested
- [ ] Firewall configured (SSH, HTTP, HTTPS)
- [ ] System updated (apt upgrade)
- [ ] Docker installed and verified
- [ ] Docker Compose installed and verified

### Project Deployment
- [ ] Repository cloned to ~/apps/
- [ ] Environment files configured
- [ ] .env.production created with actual values
- [ ] Docker images built
- [ ] Containers started and healthy
- [ ] Migrations run on all services
- [ ] Superuser created
- [ ] Static files collected

### SSL/TLS Setup
- [ ] Certbot installed
- [ ] Let's Encrypt certificate obtained
- [ ] Certificates copied to nginx/ssl/
- [ ] Nginx configured with SSL
- [ ] Auto-renewal configured (cron/systemd)
- [ ] Certificate renewal tested

### Domain & DNS
- [ ] DNS A records added for domain
- [ ] DNS propagation verified (24-48 hours)
- [ ] Nginx server blocks updated with domain names
- [ ] HTTPS access tested

### Post-Deployment
- [ ] All health checks passing
- [ ] Frontend loads correctly
- [ ] User login/registration works
- [ ] Ticket creation and workflow tested
- [ ] Email notifications working
- [ ] Logs checked for errors
- [ ] Database backups tested
- [ ] Monitoring setup complete

---

## Maintenance File Structure

```
~/apps/backups/
├── postgres_backup_20240101_020000.sql.gz    # Daily backups
├── postgres_backup_20240102_020000.sql.gz
├── media_backup_20240101_030000.tar.gz       # Daily media backups
└── media_backup_20240102_030000.tar.gz

~/apps/logs/                                   # Application logs (mounted)
└── docker-compose.prod.yml logs

/var/log/
├── docker/                                    # Docker daemon logs
├── syslog                                     # System logs
└── fail2ban.log                               # Security logs

/etc/letsencrypt/
├── live/
│   └── yourdomain.com/                        # Active certificates
│       ├── fullchain.pem
│       └── privkey.pem
└── archive/
    └── yourdomain.com/                        # Archived versions
```

---

## File Permissions & Security

### Critical Files - Keep Secure

```bash
# .env.production - Contains secrets
chmod 600 ~/apps/Ticket-Tracking-System/Docker/.env.production
# Only owner can read/write

# SSH private key
chmod 600 ~/.ssh/digitalocean
# Only owner can read

# Nginx SSL private key
chmod 600 ~/apps/Ticket-Tracking-System/Docker/nginx/ssl/privkey.pem
# Only nginx process can read (enforced by file ownership)
```

### Directory Permissions

```bash
# Application directory - deploy user ownership
sudo chown -R deploy:deploy ~/apps/Ticket-Tracking-System
chmod 755 ~/apps/

# Backup directory - secure, readable by deploy user
mkdir -p ~/apps/backups
chmod 700 ~/apps/backups

# Logs directory - writable by Docker containers
chmod 777 ~/apps/Ticket-Tracking-System/Docker/logs
```

---

## Related Documentation

- **DEPLOYMENT_GUIDE.md** - Step-by-step deployment instructions
- **BACKUP_AND_SCALING_STRATEGY.md** - Backup procedures and scaling plan
- **copilot-instructions.md** - Project guidelines and patterns
- **architecture/** - PlantUML diagrams and architecture docs

