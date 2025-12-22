# Ticket Tracking System - Production Deployment Guide

## Table of Contents
1. [Pre-Deployment Setup](#pre-deployment-setup)
2. [DigitalOcean Droplet Setup](#digitalocean-droplet-setup)
3. [Initial SSH Connection](#initial-ssh-connection)
4. [Docker & Docker Compose Installation](#docker--docker-compose-installation)
5. [Project Deployment](#project-deployment)
6. [SSL/TLS Certificate Setup (Let's Encrypt)](#ssltls-certificate-setup-lets-encrypt)
7. [Domain Configuration](#domain-configuration)
8. [Database Initialization](#database-initialization)
9. [Post-Deployment Verification](#post-deployment-verification)
10. [Troubleshooting](#troubleshooting)
11. [Monitoring & Logs](#monitoring--logs)

---

## Pre-Deployment Setup

### Requirements Checklist
- [/] Registeed domain name
- [ ] DigitalOcean account with billing set up
- [/] SSH key pair generated locally
- [ ] All environment variables prepared in `.env` file
- [ ] Git repository access (if using private repo)

### Local Setup Before Deployment
```powershell
# On your local machine (Windows)

# 1. Generate SSH key if you don't have one
ssh-keygen -t rsa -b 4096 -f "$env:USERPROFILE\.ssh\digitalocean" -N ""

# 2. Display public key (copy this)
Get-Content "$env:USERPROFILE\.ssh\digitalocean.pub"

# 3. Create .env file from example
cd Docker
Copy-Item .env.production.example .env.production
# Edit .env.production with actual values
```

---

## DigitalOcean Droplet Setup

### Create a Droplet

1. **Log in to DigitalOcean Control Panel**: https://cloud.digitalocean.com
2. **Create → Droplets**

### Recommended Configuration

| Setting | Value | Reason |
|---------|-------|--------|
| **OS** | Ubuntu 22.04 LTS | LTS support, widely compatible |
| **Plan** | 2GB RAM, 2vCPU, 50GB SSD | Suitable for small-medium load; scales later |
| **Region** | Closest to users | Latency optimization |
| **VPC** | Create new or use default | Network isolation |
| **Backups** | Enable | Daily automated backups |
| **Monitoring** | Enable | CPU, RAM, disk usage monitoring |
| **SSH Key** | Add your public key | Passwordless, secure access |
| **Hostname** | tts-prod-01 | Clear naming convention |

### Post-Creation Steps

1. Copy the Droplet IP address
2. Add A record in DNS: `yourdomain.com` → `<droplet-ip>`
3. Add A record in DNS: `api.yourdomain.com` → `<droplet-ip>`
4. Add A record in DNS: `www.yourdomain.com` → `<droplet-ip>`

---

## Initial SSH Connection

### Connect to Your Droplet

```powershell
# From Windows PowerShell
ssh -i "$env:USERPROFILE\.ssh\digitalocean" root@<droplet-ip>

# On first connection, accept the fingerprint
# Type 'yes' and press Enter
```

### Initial Security Setup (First Login)

```bash
# Update system packages
apt-get update && apt-get upgrade -y

# Set hostname
hostnamectl set-hostname tts-prod-01

# Configure firewall
ufw enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh          # SSH access
ufw allow http         # HTTP
ufw allow https        # HTTPS
ufw allow 15672/tcp    # RabbitMQ management (optional, restrict later)

# Verify firewall rules
ufw status

# Create non-root user (recommended)
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Switch to deploy user for subsequent operations
su - deploy
```

---

## Docker & Docker Compose Installation

### Install Docker Engine

```bash
# Remove old Docker installations (if any)
sudo apt-get remove -y docker docker.io containerd runc

# Install Docker from official repository
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Enable Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Verify installation
sudo docker --version
sudo docker run hello-world

# Add deploy user to docker group (avoid sudo for docker commands)
sudo usermod -aG docker $USER
# Log out and back in, or run: newgrp docker
```

### Install Docker Compose

```bash
# Install latest Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### Install Additional Tools

```bash
# Install Git for repository management
sudo apt-get install -y git

# Install Certbot for SSL certificates
sudo apt-get install -y certbot python3-certbot-nginx

# Install monitoring tools (optional)
sudo apt-get install -y htop vim curl wget net-tools

# Install fail2ban for security (optional)
sudo apt-get install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## Project Deployment

### Clone Repository

```bash
# Create deployment directory
mkdir -p ~/apps
cd ~/apps

# Clone repository (adjust URL for your repo)
git clone https://github.com/Gknightt/Ticket-Tracking-System.git
cd Ticket-Tracking-System

# Check out main/production branch if not default
git checkout main

# Create logs directory
mkdir -p Docker/logs/{auth,ticket,workflow,messaging,notification,celery}
```

### Configure Environment Variables

```bash
# Navigate to Docker directory
cd Docker

# Copy example env file
cp .env.production.example .env.production

# Edit with your values
nano .env.production
# OR use vim
# vim .env.production

# IMPORTANT VALUES TO CHANGE:
# - DJANGO_SECRET_KEY (generate new one)
# - DJANGO_JWT_SIGNING_KEY
# - DB_PASSWORD
# - RABBITMQ_PASSWORD
# - DJANGO_ALLOWED_HOSTS
# - DJANGO_CORS_ALLOWED_ORIGINS
# - Email configuration
# - Domain URLs
```

### Generate Secure Keys

```bash
# Generate DJANGO_SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(50))"

# Generate DJANGO_JWT_SIGNING_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(50))"

# Generate secure password for PostgreSQL
python3 -c "import secrets; print(secrets.token_urlsafe(16))"

# Generate secure password for RabbitMQ
python3 -c "import secrets; print(secrets.token_urlsafe(16))"
```

### Initialize Database

```bash
# From Docker directory
cd ~/apps/Ticket-Tracking-System/Docker

# Create database initialization script
cat > db-init/02-init-apps.sql << 'EOF'
-- Create separate databases for each service
CREATE DATABASE IF NOT EXISTS auth_db;
CREATE DATABASE IF NOT EXISTS ticket_db;
CREATE DATABASE IF NOT EXISTS workflow_db;
CREATE DATABASE IF NOT EXISTS notification_db;
CREATE DATABASE IF NOT EXISTS messaging_db;

-- Grant privileges
GRANT ALL PRIVILEGES ON auth_db.* TO 'postgres'@'%';
GRANT ALL PRIVILEGES ON ticket_db.* TO 'postgres'@'%';
GRANT ALL PRIVILEGES ON workflow_db.* TO 'postgres'@'%';
GRANT ALL PRIVILEGES ON notification_db.* TO 'postgres'@'%';
GRANT ALL PRIVILEGES ON messaging_db.* TO 'postgres'@'%';

FLUSH PRIVILEGES;
EOF

# Note: For PostgreSQL, the initialization is different
# This example is for MySQL - adjust for PostgreSQL accordingly
```

---

## Build and Start Services

### Build Docker Images

```bash
cd ~/apps/Ticket-Tracking-System/Docker

# Build all images (first time only, or after code changes)
docker-compose -f docker-compose.prod.yml build

# Expected build time: 10-15 minutes
# Monitor progress and watch for errors
```

### Start Services

```bash
# Start all services in background
docker-compose -f docker-compose.prod.yml up -d

# Watch logs in real-time (optional)
docker-compose -f docker-compose.prod.yml logs -f

# Exit logs: Ctrl+C (doesn't stop services)
```

### Wait for Services to Be Healthy

```bash
# Check service health
docker-compose -f docker-compose.prod.yml ps

# All services should show "healthy" status after 40-60 seconds

# If any service fails, check logs:
docker-compose -f docker-compose.prod.yml logs tts-auth
docker-compose -f docker-compose.prod.yml logs tts-workflow-api
```

### Run Database Migrations

```bash
# Auth service
docker exec tts-auth python manage.py migrate

# Ticket service
docker exec tts-ticket python manage.py migrate

# Workflow API
docker exec tts-workflow-api python manage.py migrate

# Notification service
docker exec tts-notification python manage.py migrate

# Messaging service
docker exec tts-messaging python manage.py migrate
```

### Create Superuser (Initial Setup)

```bash
# Create Django superuser for auth service
docker exec -it tts-auth python manage.py createsuperuser

# Follow prompts to create admin account
# Email: admin@yourdomain.com
# Password: (use strong password, store securely)
```

---

## SSL/TLS Certificate Setup (Let's Encrypt)

### Obtain Certificate with Certbot

```bash
# Request certificate from Let's Encrypt
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  -d api.yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos \
  --non-interactive

# Certificates saved to: /etc/letsencrypt/live/yourdomain.com/

# Copy to Docker nginx directory
sudo mkdir -p ~/apps/Ticket-Tracking-System/Docker/nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem \
        ~/apps/Ticket-Tracking-System/Docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem \
        ~/apps/Ticket-Tracking-System/Docker/nginx/ssl/
sudo chown -R $USER:$USER ~/apps/Ticket-Tracking-System/Docker/nginx/ssl
```

### Configure Auto-Renewal

```bash
# Edit renewal configuration
sudo vim /etc/letsencrypt/renewal/yourdomain.com.conf

# Add renewal hook to update Docker volumes
# Add these lines before the last closing bracket:
#
# [renewalparams]
# authenticator = standalone
# account = <your-account-id>
# server = https://acme-v02.api.letsencrypt.org/directory
# post_hook = cp /etc/letsencrypt/live/yourdomain.com/*.pem /home/deploy/apps/Ticket-Tracking-System/Docker/nginx/ssl/ && docker-compose -f /home/deploy/apps/Ticket-Tracking-System/Docker/docker-compose.prod.yml restart nginx

# Test renewal process
sudo certbot renew --dry-run

# Certbot runs automatically daily via systemd timer
# Verify: systemctl list-timers certbot
```

### Update Nginx Configuration

```bash
# Verify nginx.conf has correct SSL paths
# Should be set to:
# ssl_certificate /etc/nginx/ssl/fullchain.pem;
# ssl_certificate_key /etc/nginx/ssl/privkey.pem;

cd ~/apps/Ticket-Tracking-System/Docker

# Restart nginx container
docker-compose -f docker-compose.prod.yml restart nginx

# Verify SSL certificate
curl -I https://yourdomain.com
# Should show: HTTP/2 200 and valid certificate headers
```

---

## Domain Configuration

### DNS Setup

Update your domain registrar with these records:

```
Type    Name                 Value
A       yourdomain.com       <droplet-ip>
A       www.yourdomain.com   <droplet-ip>
A       api.yourdomain.com   <droplet-ip>
CNAME   mail                 yourdomain.com (optional, for email)
TXT     @                    v=spf1 include:_spf.google.com ~all (if using Gmail)
```

### Propagation Check

```bash
# Wait 24-48 hours for full DNS propagation
# Check propagation status
nslookup yourdomain.com
nslookup yourdomain.com 8.8.8.8  # Google DNS

# From Droplet, verify DNS resolution
ping yourdomain.com
# Should resolve to your Droplet's IP
```

### Nginx Server Block Configuration

```bash
# Update nginx.conf to include your domain
# Edit Docker/nginx/nginx.conf

# Find the server block and update:
# server_name yourdomain.com www.yourdomain.com api.yourdomain.com;

# Or create separate config in conf.d/
cat > ~/apps/Ticket-Tracking-System/Docker/nginx/conf.d/domains.conf << 'EOF'
# Server names for API and frontend
server_name yourdomain.com www.yourdomain.com api.yourdomain.com;
EOF

# Reload nginx
docker exec tts-nginx nginx -t  # Test configuration
docker-compose -f docker-compose.prod.yml restart nginx
```

---

## Post-Deployment Verification

### Health Checks

```bash
# Check all services are running
docker ps -a

# All containers should show "Up" status

# Test health endpoints
curl -I http://localhost/health
curl -I https://yourdomain.com/health

# Test API endpoints
curl -I https://yourdomain.com/api/v1/auth/
curl -I https://yourdomain.com/api/v1/tickets/

# Test frontend
curl -I https://yourdomain.com/
```

### Database Verification

```bash
# Connect to PostgreSQL
docker exec -it tts-postgres psql -U postgres -c "SELECT datname FROM pg_database WHERE datname != 'postgres';"

# Should show: auth_db, ticket_db, workflow_db, notification_db, messaging_db

# Check migrations status
docker exec tts-auth python manage.py showmigrations
```

### RabbitMQ Management UI (Optional, for Monitoring)

```bash
# Access RabbitMQ management interface
# URL: http://<droplet-ip>:15672
# Default username: admin
# Default password: (from .env.production RABBITMQ_PASSWORD)

# Verify queues are created
# You should see queues in the management UI

# NOTE: Consider restricting this to internal network only
# by updating firewall rules
```

### Test User Login

1. Open https://yourdomain.com in browser
2. Navigate to login/registration
3. Create test account and verify email
4. Test ticket creation
5. Test workflow assignment
6. Monitor logs: `docker-compose -f docker-compose.prod.yml logs -f`

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs tts-auth
docker-compose -f docker-compose.prod.yml logs tts-workflow-api

# Common issues:
# 1. Port already in use - check: sudo netstat -tlnp
# 2. Database not ready - wait and retry: docker-compose restart
# 3. Memory issue - check: free -h and docker stats
```

### Database Connection Error

```bash
# Test database connectivity
docker exec tts-postgres psql -U postgres -c "SELECT version();"

# Check DATABASE_URL in .env.production
# Format: postgresql://user:password@host:port/dbname

# Verify database exists
docker exec tts-postgres psql -U postgres -l
```

### SSL Certificate Issues

```bash
# Check certificate validity
sudo openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -text -noout

# Verify certificate in Docker volume
docker exec tts-nginx ls -la /etc/nginx/ssl/

# Test SSL
curl -v https://yourdomain.com 2>&1 | grep -A 5 "SSL"

# If certificate outdated, renew manually
sudo certbot renew --force-renewal
```

### High Memory or CPU Usage

```bash
# Check resource usage
docker stats

# If specific service is high:
docker-compose -f docker-compose.prod.yml logs --tail=100 <service-name>

# Scale workers if needed
# Edit docker-compose.prod.yml:
# - workflow-worker: change --concurrency=4 to higher
# - notification-worker: change --concurrency=2 to higher

docker-compose -f docker-compose.prod.yml up -d workflow-worker
```

### Email Delivery Issues

```bash
# Check email configuration
docker exec tts-auth python manage.py shell << 'EOF'
from django.core.mail import send_mail
send_mail(
    'Test Subject',
    'Test message',
    'noreply@yourdomain.com',
    ['admin@yourdomain.com'],
)
EOF

# Check logs
docker-compose -f docker-compose.prod.yml logs tts-notification-worker | grep -i email

# For Gmail:
# 1. Enable 2-factor authentication on Gmail account
# 2. Create "App Password" (not regular Gmail password)
# 3. Use App Password in DJANGO_EMAIL_HOST_PASSWORD
```

---

## Monitoring & Logs

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs

# Specific service (last 50 lines)
docker-compose -f docker-compose.prod.yml logs --tail=50 tts-auth

# Follow logs in real-time
docker-compose -f docker-compose.prod.yml logs -f

# Specific service, real-time
docker-compose -f docker-compose.prod.yml logs -f tts-workflow-api

# Since specific time
docker-compose -f docker-compose.prod.yml logs --since 2024-11-23T10:00:00 tts-auth
```

### Access Application Logs

```bash
# Auth service logs
cat ~/apps/Ticket-Tracking-System/Docker/logs/auth/app.log

# Check nginx access logs
docker exec tts-nginx tail -f /var/log/nginx/access.log

# Check nginx error logs
docker exec tts-nginx tail -f /var/log/nginx/error.log

# Check Celery worker logs
cat ~/apps/Ticket-Tracking-System/Docker/logs/celery/workflow-worker.log
cat ~/apps/Ticket-Tracking-System/Docker/logs/celery/notification-worker.log
```

### Monitor System Resources

```bash
# Real-time container stats
docker stats

# System resource usage
htop
# Press q to exit

# Disk usage
df -h

# Memory usage
free -h

# CPU usage
top -b -n 1 | head -n 20
```

### DigitalOcean Monitoring Dashboard

1. Open DigitalOcean Control Panel
2. Go to Droplets → Your Droplet
3. Click "Monitoring" tab to view:
   - CPU usage
   - Memory usage
   - Disk I/O
   - Bandwidth

### Setup Log Rotation

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/tts-docker

# Add:
/home/deploy/apps/Ticket-Tracking-System/Docker/logs/**/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 deploy deploy
    sharedscripts
}

# Test configuration
sudo logrotate -d /etc/logrotate.d/tts-docker
```

---

## Backup Strategy

### Automated Database Backups

```bash
# Create backup script
mkdir -p ~/apps/backups
cat > ~/apps/backups/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/deploy/apps/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/postgres_backup_$TIMESTAMP.sql.gz"

# Backup PostgreSQL
docker exec tts-postgres pg_dump -U postgres \
  | gzip > "$BACKUP_FILE"

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "postgres_backup_*.sql.gz" -mtime +30 -delete

# Notify (optional)
echo "Database backup completed: $BACKUP_FILE"

# Upload to cloud storage (optional)
# aws s3 cp "$BACKUP_FILE" s3://your-bucket/backups/
EOF

chmod +x ~/apps/backups/backup-db.sh

# Schedule daily backups
crontab -e

# Add line:
# 0 2 * * * /home/deploy/apps/backups/backup-db.sh

# Verify cron job
crontab -l
```

### Media Files Backup

```bash
# Backup media volumes
cat > ~/apps/backups/backup-media.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/deploy/apps/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/media_backup_$TIMESTAMP.tar.gz"

# Create tarball of media files
docker run --rm \
  -v tts-docker_media_files:/media \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf /backup/media_$TIMESTAMP.tar.gz /media

# Keep only last 30 days
find "$BACKUP_DIR" -name "media_backup_*.tar.gz" -mtime +30 -delete

echo "Media backup completed: $BACKUP_FILE"
EOF

chmod +x ~/apps/backups/backup-media.sh

# Schedule daily (different time from database backup)
# Add to crontab: 0 3 * * * /home/deploy/apps/backups/backup-media.sh
```

### Restore from Backup

```bash
# Restore database from backup
docker exec -i tts-postgres psql -U postgres < backup_file.sql

# Restore media files
docker run --rm \
  -v tts-docker_media_files:/media \
  -v "$BACKUP_DIR":/backup \
  alpine tar xzf /backup/media_backup.tar.gz -C /media --strip-components=1
```

---

## Scaling & Future Improvements

### Vertical Scaling (Increase Droplet Capacity)

1. **From DigitalOcean Console:**
   - Power down Droplet
   - Choose "Resize" → Select larger plan
   - Power on

2. **Update docker-compose.prod.yml:**
```yaml
workflow-worker:
  command: celery -A workflow_api worker --concurrency=8 ...
notification-worker:
  command: celery -A notification_service worker --concurrency=4 ...
```

### Horizontal Scaling (Multiple Droplets)

Future architecture with load balancing:
```
Internet → DigitalOcean Load Balancer → [Droplet 1, Droplet 2, ...]
           ↓
         (Shared) → PostgreSQL Managed Database
         (Shared) → RabbitMQ Managed Service
         (Shared) → S3-compatible Object Storage
```

### Migrate to Managed Services

```bash
# When ready for higher reliability:

# 1. PostgreSQL → DigitalOcean Managed Database
#    - Better backups, automatic failover
#    - Update DATABASE_URL in .env.production

# 2. Redis → DigitalOcean Redis
#    - For caching and session storage
#    - Update REDIS_URL

# 3. RabbitMQ → DigitalOcean App Platform
#    - Or use native managed message queue

# 4. Media Storage → DigitalOcean Spaces (S3)
#    - Offload file storage from Droplet
#    - Update STORAGES configuration
```

### Enable CDN

```bash
# Use DigitalOcean CDN with Spaces
# 1. Create DigitalOcean Space
# 2. Enable CDN on Space
# 3. Point media_files volume to Space using s3fs

docker exec tts-ticket python manage.py collectstatic --no-input
# Collect static files and upload to CDN

# Update STATIC_URL and MEDIA_URL in Django settings
```

---

## Performance Optimization Tips

### Database Optimization
```bash
# Enable slow query logging
docker exec -it tts-postgres psql -U postgres << 'EOF'
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();
EOF

# Create indexes on frequently queried columns
docker exec -it tts-postgres psql -U postgres -d workflow_db << 'EOF'
CREATE INDEX idx_ticket_status ON tickets(status);
CREATE INDEX idx_ticket_created ON tickets(created_at DESC);
CREATE INDEX idx_workflow_assignee ON workflows(assigned_to);
EOF
```

### Celery Optimization
- Adjust worker concurrency based on available CPU cores
- Use connection pooling for database and broker
- Monitor queue depth: `docker exec tts-rabbitmq rabbitmqctl list_queues name messages`

### Nginx Caching
- Enable `proxy_cache` for API responses
- Configure cache keys based on endpoints
- Set appropriate TTL for different content types

---

## Maintenance Schedule

| Task | Frequency | Command |
|------|-----------|---------|
| Update system packages | Weekly | `sudo apt update && apt upgrade` |
| Check Disk Space | Daily | `df -h` |
| Review logs | Daily | `docker-compose logs --tail=100` |
| Database backup | Daily | Automated via cron |
| SSL cert renewal | Automated | Certbot automatic |
| Update Docker images | Monthly | `docker-compose pull && restart` |
| Security patches | As needed | Follow vendor notifications |

---

## Getting Help

### Useful Commands Reference

```bash
# Service Management
docker-compose -f docker-compose.prod.yml ps           # Status
docker-compose -f docker-compose.prod.yml up -d        # Start
docker-compose -f docker-compose.prod.yml down         # Stop
docker-compose -f docker-compose.prod.yml restart      # Restart
docker-compose -f docker-compose.prod.yml logs -f      # Watch logs

# Debugging
docker exec <container> bash                           # Enter container
docker inspect <container>                             # View config
docker stats                                           # Resource usage

# Database
docker exec tts-postgres psql -U postgres -l           # List databases
docker exec tts-postgres pg_dump -U postgres auth_db > backup.sql

# Services
docker network ls                                      # Show networks
docker volume ls                                       # Show volumes
```

---

## Security Checklist

- [ ] Changed all default passwords in .env.production
- [ ] Enabled SSH key-only authentication (disabled password login)
- [ ] Configured firewall (ufw)
- [ ] Enabled SSL/TLS with valid certificate
- [ ] Set SECURE_SSL_REDIRECT=True in Django settings
- [ ] Enabled HSTS headers
- [ ] Restricted RabbitMQ management UI access
- [ ] Set up fail2ban for brute-force protection
- [ ] Regular security updates via apt
- [ ] Monitored logs for suspicious activity
- [ ] Setup monitoring alerts for high resource usage
- [ ] Implemented rate limiting in Nginx
- [ ] CSRF protection enabled
- [ ] CORS properly configured

