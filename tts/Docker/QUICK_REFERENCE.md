# Production Deployment - Quick Reference

## 🚀 Deployment Command Sequence

```bash
# 1. Connect to Droplet
ssh -i ~/.ssh/digitalocean deploy@<droplet-ip>

# 2. Navigate to project
cd ~/apps/Ticket-Tracking-System/Docker

# 3. Build images (first time or after code changes)
docker-compose -f docker-compose.prod.yml build

# 4. Start services
docker-compose -f docker-compose.prod.yml up -d

# 5. Run migrations
docker exec tts-auth python manage.py migrate
docker exec tts-ticket python manage.py migrate
docker exec tts-workflow-api python manage.py migrate
docker exec tts-notification python manage.py migrate
docker exec tts-messaging python manage.py migrate

# 6. Create superuser
docker exec -it tts-auth python manage.py createsuperuser

# 7. Verify health
docker-compose -f docker-compose.prod.yml ps
curl -I https://yourdomain.com
```

---

## 📋 Pre-Deployment Checklist

- [ ] Domain registered
- [ ] Droplet created (2GB RAM, 2vCPU, Ubuntu 22.04)
- [ ] SSH key added to Droplet
- [ ] .env.production file prepared with actual values
- [ ] SSL certificates ready (or will be obtained via Certbot)
- [ ] Database backup location decided

---

## 📁 Key Files Location

| File | Purpose | Location |
|------|---------|----------|
| Docker Compose | Main orchestration | `Docker/docker-compose.prod.yml` |
| Environment | Config & secrets | `Docker/.env.production` |
| Nginx Config | Reverse proxy | `Docker/nginx/nginx.conf` |
| SSL Certs | HTTPS certificates | `Docker/nginx/ssl/` |
| Database Backups | Daily SQL dumps | `~/apps/backups/` |
| Application Logs | Service logs | `Docker/logs/` |

---

## 🔧 Most Used Commands

### Service Management
```bash
# View status of all services
docker-compose -f docker-compose.prod.yml ps

# View logs in real-time
docker-compose -f docker-compose.prod.yml logs -f

# Restart specific service
docker-compose -f docker-compose.prod.yml restart tts-auth

# Stop all services (gracefully)
docker-compose -f docker-compose.prod.yml down

# Start all services
docker-compose -f docker-compose.prod.yml up -d
```

### Database Operations
```bash
# Access PostgreSQL CLI
docker exec -it tts-postgres psql -U postgres

# List all databases
docker exec tts-postgres psql -U postgres -l

# Run Django migration
docker exec tts-auth python manage.py migrate

# Create Django superuser
docker exec -it tts-auth python manage.py createsuperuser
```

### Backup & Restore
```bash
# Backup database
docker exec tts-postgres pg_dump -U postgres | gzip > backup.sql.gz

# Restore database
gunzip < backup.sql.gz | docker exec -i tts-postgres psql -U postgres

# Backup media files
docker run --rm -v tts-docker_media_files:/media -v /path/to/backups:/backup \
  alpine tar czf /backup/media_backup.tar.gz -C /media .
```

### Monitoring
```bash
# Real-time resource usage
docker stats --no-stream

# Container logs (last 50 lines)
docker-compose -f docker-compose.prod.yml logs --tail=50

# Specific service logs
docker-compose -f docker-compose.prod.yml logs tts-auth

# System resource usage
df -h              # Disk space
free -h            # Memory
top -b -n 1       # CPU
```

### Troubleshooting
```bash
# Enter container to debug
docker exec -it tts-auth bash

# View container details
docker inspect tts-auth

# Check network connectivity
docker exec tts-auth curl -I http://workflow-api:8000

# Test health endpoints
curl http://localhost:8000/health
```

---

## 🔐 Environment Variables Quick Reference

### Must Change (Security Critical)
```
DJANGO_SECRET_KEY=<generate new>
DJANGO_JWT_SIGNING_KEY=<generate new>
DB_PASSWORD=<secure password>
RABBITMQ_PASSWORD=<secure password>
```

### Must Set to Your Domain
```
DJANGO_ALLOWED_HOSTS=yourdomain.com
DJANGO_CORS_ALLOWED_ORIGINS=https://yourdomain.com
DJANGO_BASE_URL=https://yourdomain.com
DJANGO_FRONTEND_URL=https://yourdomain.com
```

### Email Configuration
```
DJANGO_EMAIL_HOST=smtp.gmail.com
DJANGO_EMAIL_PORT=587
DJANGO_EMAIL_HOST_USER=your-email@gmail.com
DJANGO_EMAIL_HOST_PASSWORD=app-specific-password
```

---

## 🌐 DNS Configuration

Add these records in your domain registrar:

| Type | Name | Value |
|------|------|-------|
| A | yourdomain.com | `<droplet-ip>` |
| A | www.yourdomain.com | `<droplet-ip>` |
| A | api.yourdomain.com | `<droplet-ip>` |

**Wait 24-48 hours for propagation**

---

## 🔒 SSL/TLS Setup

```bash
# Request certificate
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  -d api.yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos \
  --non-interactive

# Copy to Docker
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem \
        ~/apps/Ticket-Tracking-System/Docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem \
        ~/apps/Ticket-Tracking-System/Docker/nginx/ssl/

# Restart Nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

---

## 📊 Health Check Endpoints

Test these after deployment:

```bash
# Frontend
curl -I https://yourdomain.com

# Auth API
curl -I https://yourdomain.com/api/v1/auth/

# Ticket API
curl -I https://yourdomain.com/api/v1/tickets/

# Workflow API
curl -I https://yourdomain.com/api/v1/workflows/

# Health endpoints
curl -I https://yourdomain.com/health
```

---

## 🚨 Troubleshooting Quick Reference

### Service Won't Start
```bash
# Check logs
docker-compose logs tts-<service-name>

# Common causes:
# 1. Port already in use: sudo netstat -tlnp
# 2. Database not ready: Wait 30 seconds and retry
# 3. Memory issue: docker stats
```

### Database Connection Error
```bash
# Test connection
docker exec tts-postgres psql -U postgres -c "SELECT version();"

# Check DATABASE_URL format
# Should be: postgresql://user:pass@db:5432/dbname
```

### SSL Certificate Issues
```bash
# Check certificate
sudo openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -text -noout

# Manual renewal
sudo certbot renew --force-renewal

# Reload Nginx
docker exec tts-nginx nginx -t  # Test
docker-compose restart nginx
```

### High Resource Usage
```bash
# Check what's using resources
docker stats

# View detailed logs
docker-compose logs --tail=200 <service-name> | grep -i error

# Increase worker concurrency in docker-compose.prod.yml
# Restart workers
docker-compose up -d workflow-worker notification-worker
```

---

## 📈 Performance Monitoring

```bash
# Monitor in real-time
watch -n 5 'docker stats --no-stream'

# Check disk usage
du -sh ~/apps/Ticket-Tracking-System
du -sh ~/apps/backups

# Check Docker volumes
docker volume ls -q | xargs docker volume inspect

# Check network traffic
# Install: sudo apt install nethogs
nethogs
```

---

## 📅 Backup Verification

```bash
# Check latest backups
ls -lh ~/apps/backups/ | tail -10

# Verify backup integrity
gunzip -t ~/apps/backups/postgres_full_*.sql.gz

# Test media backup
tar -tzf ~/apps/backups/media_*.tar.gz | head -20
```

---

## 🔄 Update Procedure

```bash
# 1. Stop services
docker-compose -f docker-compose.prod.yml down

# 2. Pull latest code
git pull origin main

# 3. Rebuild images
docker-compose -f docker-compose.prod.yml build

# 4. Run migrations (if needed)
docker-compose -f docker-compose.prod.yml up -d
docker exec tts-auth python manage.py migrate

# 5. Restart
docker-compose -f docker-compose.prod.yml restart

# 6. Verify
curl -I https://yourdomain.com
docker-compose -f docker-compose.prod.yml ps
```

---

## 📞 Getting Help

### Documentation Files
- **DEPLOYMENT_GUIDE.md** - Full step-by-step setup
- **PROJECT_STRUCTURE.md** - File organization and explanations
- **BACKUP_AND_SCALING_STRATEGY.md** - Backup procedures and scaling

### Useful Links
- Docker Documentation: https://docs.docker.com/
- Docker Compose: https://docs.docker.com/compose/
- Django Documentation: https://docs.djangoproject.com/
- Let's Encrypt / Certbot: https://certbot.eff.org/
- DigitalOcean Community: https://www.digitalocean.com/community/

### Emergency Contacts
- Hosting Support: DigitalOcean Support Dashboard
- SSL Issues: Let's Encrypt Community Forums
- Application: Your project repository Issues

---

## ⚡ Performance Tips

1. **Enable Nginx caching** - Cache static assets and API responses
2. **Use CDN** - DigitalOcean Spaces or Cloudflare for media
3. **Optimize database** - Add indexes on frequently queried columns
4. **Monitor Celery queue depth** - Adjust worker concurrency
5. **Use connection pooling** - For database and broker connections
6. **Enable Gzip compression** - Already configured in Nginx
7. **Collect static files regularly** - Especially after updates
8. **Monitor log sizes** - Implement log rotation

---

## 🎯 Success Indicators

✅ All containers healthy and running
✅ HTTPS working with valid certificate
✅ Frontend loads without errors
✅ User login/registration works
✅ Tickets can be created and assigned
✅ Emails are being sent
✅ Database backups are running
✅ All API endpoints responding with 200 status
✅ No error messages in application logs
✅ Response times < 500ms for most endpoints

---

## 📝 Post-Deployment Tasks

- [ ] Create admin account
- [ ] Test user registration flow
- [ ] Verify email notifications
- [ ] Check file upload functionality
- [ ] Test workflow assignment
- [ ] Verify SSL certificate
- [ ] Setup monitoring/alerts
- [ ] Verify automated backups
- [ ] Document admin procedures
- [ ] Setup support documentation

---

**Last Updated:** November 2024
**Deployment Version:** 1.0
**Compatibility:** Ticket Tracking System v1.0+

