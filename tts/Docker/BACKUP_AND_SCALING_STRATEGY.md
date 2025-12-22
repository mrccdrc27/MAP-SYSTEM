# Backup Strategy & Scaling Guide

## Table of Contents
1. [Backup Strategy](#backup-strategy)
2. [Disaster Recovery](#disaster-recovery)
3. [Scaling Strategy](#scaling-strategy)
4. [Future Architecture](#future-architecture)

---

## Backup Strategy

### Backup Components

The production system has three critical components that require backup:

1. **PostgreSQL Databases** - User data, tickets, workflows
2. **Media Files** - Uploaded attachments, user-generated content
3. **Configuration** - Docker Compose files, environment variables, Nginx configs

### Backup Schedule

| Component | Frequency | Retention | Location |
|-----------|-----------|-----------|----------|
| **PostgreSQL** | Daily (2:00 AM) | 30 days | ~/apps/backups/ |
| **Media Files** | Daily (3:00 AM) | 30 days | ~/apps/backups/ |
| **Configuration** | Weekly (Sunday) | 12 weeks | Remote Git repo |
| **System Snapshot** | Weekly | 4 weeks | DigitalOcean snapshots |

### 1. PostgreSQL Automated Backup

#### Daily Backup Script

```bash
#!/bin/bash
# File: ~/apps/backups/backup-postgres.sh

BACKUP_DIR="/home/deploy/apps/backups"
LOG_FILE="$BACKUP_DIR/backup.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="$BACKUP_DIR/postgres_full_$TIMESTAMP.sql.gz"

# Create backup
echo "[$(date)] Starting PostgreSQL backup..." >> "$LOG_FILE"

docker exec tts-postgres pg_dump \
    -U postgres \
    --verbose \
    | gzip > "$BACKUP_FILE" 2>> "$LOG_FILE"

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date)] ✓ Backup successful: $BACKUP_FILE ($SIZE)" >> "$LOG_FILE"
    
    # Optional: Copy to cloud storage
    # aws s3 cp "$BACKUP_FILE" s3://your-bucket/postgres-backups/
    # gsutil cp "$BACKUP_FILE" gs://your-bucket/postgres-backups/
    
else
    echo "[$(date)] ✗ Backup FAILED" >> "$LOG_FILE"
    # Send alert (optional)
    # mail -s "Database Backup Failed" admin@yourdomain.com < "$LOG_FILE"
fi

# Delete backups older than 30 days
echo "[$(date)] Cleaning old backups..." >> "$LOG_FILE"
find "$BACKUP_DIR" -name "postgres_full_*.sql.gz" -mtime +30 -delete

echo "[$(date)] Backup cycle complete" >> "$LOG_FILE"
```

#### Setup Automated Scheduling

```bash
# Make script executable
chmod +x ~/apps/backups/backup-postgres.sh

# Add to crontab
crontab -e

# Add this line (runs at 2:00 AM daily)
0 2 * * * /home/deploy/apps/backups/backup-postgres.sh

# Verify cron job
crontab -l
```

#### Backup Per-Database (Optional - More Granular)

```bash
#!/bin/bash
# Backup each service database separately

BACKUP_DIR="/home/deploy/apps/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

DATABASES=("auth_db" "ticket_db" "workflow_db" "notification_db" "messaging_db")

for db in "${DATABASES[@]}"; do
    docker exec tts-postgres pg_dump \
        -U postgres \
        "$db" \
        | gzip > "$BACKUP_DIR/${db}_${TIMESTAMP}.sql.gz"
    echo "Backed up: $db"
done

# Delete old backups (30 days retention)
find "$BACKUP_DIR" -name "*_*.sql.gz" -mtime +30 -delete
```

### 2. Media Files Backup

#### Daily Media Backup Script

```bash
#!/bin/bash
# File: ~/apps/backups/backup-media.sh

BACKUP_DIR="/home/deploy/apps/backups"
LOG_FILE="$BACKUP_DIR/backup.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/media_$TIMESTAMP.tar.gz"

echo "[$(date)] Starting media backup..." >> "$LOG_FILE"

# Create tarball from media volume
docker run --rm \
    -v tts-docker_media_files:/media:ro \
    -v "$BACKUP_DIR":/backup \
    alpine tar czf /backup/media_$TIMESTAMP.tar.gz -C /media . 2>> "$LOG_FILE"

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date)] ✓ Media backup successful ($SIZE)" >> "$LOG_FILE"
else
    echo "[$(date)] ✗ Media backup FAILED" >> "$LOG_FILE"
fi

# Delete media backups older than 30 days
find "$BACKUP_DIR" -name "media_*.tar.gz" -mtime +30 -delete

echo "[$(date)] Media backup cycle complete" >> "$LOG_FILE"
```

#### Setup Media Backup Scheduling

```bash
chmod +x ~/apps/backups/backup-media.sh

# Add to crontab (3:00 AM daily)
# 0 3 * * * /home/deploy/apps/backups/backup-media.sh
```

### 3. Configuration Backup

#### Git-Based Backup

```bash
# Store in private Git repository (GitHub, GitLab, Gitea)

# Setup git in deployment directory
cd ~/apps/Ticket-Tracking-System
git remote add backup https://your-private-repo/backup.git

# Create .gitignore to exclude sensitive files (if not already done)
echo ".env.production" >> .gitignore
echo "*.db" >> .gitignore
echo "logs/" >> .gitignore
echo "media/" >> .gitignore

# Commit infrastructure code
git add Docker/ auth/ ticket_service/ workflow_api/ ...
git commit -m "Backup: Production configuration $(date +%Y-%m-%d)"
git push backup main

# Schedule weekly backups via cron
# 0 4 * * 0 cd /home/deploy/apps/Ticket-Tracking-System && git add Docker/ && git commit -m "Auto backup $(date)" && git push backup main 2>/dev/null
```

### 4. DigitalOcean Automated Snapshots

```bash
# Enable Droplet backups in DigitalOcean console:
# 1. Log in to DigitalOcean
# 2. Go to Droplet settings
# 3. Enable "Backups"
# 4. Choose backup frequency (Weekly recommended)

# Or use doctl CLI
doctl compute droplet-backup enable <droplet-id>

# Create manual snapshot before major updates
doctl compute droplet-snapshot create <droplet-id> --snapshot-name tts-prod-$(date +%Y%m%d)
```

---

## Restore Procedures

### Restore Database from Backup

#### Full Database Restore

```bash
# 1. Stop services that access the database
docker-compose -f docker-compose.prod.yml stop auth-service ticket-service workflow-api

# 2. Restore from backup
BACKUP_FILE="~/apps/backups/postgres_full_20240101_020000.sql.gz"
gunzip < "$BACKUP_FILE" | docker exec -i tts-postgres psql -U postgres

# 3. Verify restore
docker exec tts-postgres psql -U postgres -c "SELECT datname FROM pg_database WHERE datname != 'postgres';"

# 4. Restart services
docker-compose -f docker-compose.prod.yml up -d
```

#### Restore Specific Database

```bash
BACKUP_FILE="~/apps/backups/auth_db_20240101_020000.sql.gz"

# Drop corrupted database (CAUTION!)
docker exec tts-postgres dropdb -U postgres auth_db

# Restore
gunzip < "$BACKUP_FILE" | docker exec -i tts-postgres psql -U postgres

# Verify
docker exec tts-postgres psql -U postgres -d auth_db -c "\dt"
```

### Restore Media Files

```bash
# 1. List available backups
ls -lh ~/apps/backups/media_*.tar.gz

# 2. Restore from specific backup
BACKUP_FILE="~/apps/backups/media_20240101_030000.tar.gz"

# 3. Extract to media volume
docker run --rm \
    -v tts-docker_media_files:/media \
    -v ~/apps/backups:/backup \
    alpine tar xzf /backup/media_20240101_030000.tar.gz -C /media

# 4. Verify
docker exec tts-ticket ls -la /app/media/uploads/ | head -20
```

### Full Disaster Recovery (Complete Droplet Loss)

#### Step-by-step Recovery

```bash
# 1. Create new Droplet (same as original)
#    - Ubuntu 22.04 LTS
#    - 2GB RAM, 2vCPU
#    - Similar region

# 2. SSH to new Droplet and follow initial setup
ssh -i ~/.ssh/digitalocean root@<new-ip>

# 3. Follow Docker installation steps from DEPLOYMENT_GUIDE.md

# 4. Clone repository
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/Gknightt/Ticket-Tracking-System.git

# 5. Restore configuration files from backup
# Copy .env.production from secure backup location
scp -i ~/.ssh/digitalocean ~/backups/.env.production root@<new-ip>:~/apps/Ticket-Tracking-System/Docker/

# 6. Restore backups from cloud storage
# If using AWS S3
aws s3 cp s3://your-bucket/postgres-backups/latest.sql.gz ~/apps/backups/
aws s3 cp s3://your-bucket/media-backups/latest.tar.gz ~/apps/backups/

# 7. Start services
cd ~/apps/Ticket-Tracking-System/Docker
docker-compose -f docker-compose.prod.yml up -d

# 8. Wait for database to start
sleep 30

# 9. Restore database
gunzip < ~/apps/backups/postgres_full_latest.sql.gz | docker exec -i tts-postgres psql -U postgres

# 10. Restore media
docker run --rm \
    -v tts-docker_media_files:/media \
    -v ~/apps/backups:/backup \
    alpine tar xzf /backup/media_latest.tar.gz -C /media

# 11. Run migrations (in case of version mismatch)
docker exec tts-auth python manage.py migrate
docker exec tts-ticket python manage.py migrate
docker exec tts-workflow-api python manage.py migrate

# 12. Restart all services
docker-compose -f docker-compose.prod.yml restart

# 13. Verify application
curl -I https://yourdomain.com
# Check health endpoints and test login
```

---

## Backup Storage Best Practices

### Local Backup Management

```bash
# Create backup storage with proper permissions
mkdir -p ~/backups
chmod 700 ~/backups

# Monitor backup disk usage
du -sh ~/backups
df -h

# Alert if backups grow too large
# Add to crontab:
# 0 * * * * if [ $(du -s /home/deploy/apps/backups | cut -f1) -gt 10485760 ]; then mail -s "Backup disk space warning" admin@yourdomain.com; fi
```

### Cloud Storage Integration (Recommended)

#### AWS S3 Backup

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region, Output format

# Create S3 bucket
aws s3 mb s3://tts-production-backups

# Enable versioning and encryption
aws s3api put-bucket-versioning --bucket tts-production-backups --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket tts-production-backups --server-side-encryption-configuration '{
    "Rules": [{
        "ApplyServerSideEncryptionByDefault": {
            "SSEAlgorithm": "AES256"
        }
    }]
}'

# Update backup scripts to upload
# Add to backup scripts:
# aws s3 cp "$BACKUP_FILE" s3://tts-production-backups/postgres/ --sse AES256 --storage-class STANDARD_IA

# Verify backup uploaded
aws s3 ls s3://tts-production-backups/postgres/
```

#### Google Cloud Storage Backup

```bash
# Install gsutil (part of Google Cloud SDK)
curl https://sdk.cloud.google.com | bash

# Authenticate
gcloud auth login

# Create bucket
gsutil mb gs://tts-production-backups

# Enable versioning
gsutil versioning set on gs://tts-production-backups

# Upload backup
gsutil -m cp "$BACKUP_FILE" gs://tts-production-backups/postgres/

# List backups
gsutil ls gs://tts-production-backups/postgres/
```

#### Backblaze B2 (Cost-Effective Alternative)

```bash
# Install B2 CLI
pip install b2

# Authenticate
b2 authorize-account <account-id> <application-key>

# Create bucket
b2 create-bucket tts-production-backups allPrivate

# Upload backup
b2 upload-file tts-production-backups "$BACKUP_FILE" postgres/$(basename "$BACKUP_FILE")
```

---

## Backup Testing & Verification

### Test Backup Integrity

```bash
#!/bin/bash
# File: ~/apps/backups/test-backups.sh

BACKUP_DIR="/home/deploy/apps/backups"
LOG_FILE="$BACKUP_DIR/test-backups.log"

echo "[$(date)] Starting backup verification..." >> "$LOG_FILE"

# Test PostgreSQL backups
for backup in "$BACKUP_DIR"/postgres_full_*.sql.gz; do
    if gunzip -t "$backup" 2>/dev/null; then
        echo "✓ Valid: $(basename $backup)" >> "$LOG_FILE"
    else
        echo "✗ CORRUPT: $(basename $backup)" >> "$LOG_FILE"
    fi
done

# Test media backups
for backup in "$BACKUP_DIR"/media_*.tar.gz; do
    if tar -tzf "$backup" > /dev/null 2>&1; then
        echo "✓ Valid: $(basename $backup)" >> "$LOG_FILE"
    else
        echo "✗ CORRUPT: $(basename $backup)" >> "$LOG_FILE"
    fi
done

echo "[$(date)] Backup verification complete" >> "$LOG_FILE"

# Email report
mail -s "Backup Verification Report" admin@yourdomain.com < "$LOG_FILE"
```

### Monthly Restore Test

```bash
# Schedule monthly restore test to verify backups work
# Steps:
# 1. Restore latest backup to test database
# 2. Run data integrity checks
# 3. Verify all tables and records
# 4. Document successful test

# Example restore test
docker exec tts-postgres createdb -U postgres test_auth_db
gunzip < ~/apps/backups/auth_db_latest.sql.gz | \
    docker exec -i tts-postgres psql -U postgres -d test_auth_db

# Check row counts
docker exec tts-postgres psql -U postgres -d test_auth_db -c "SELECT 'users' as table, count(*) FROM users UNION ALL SELECT 'roles', count(*) FROM roles UNION ALL SELECT 'permissions', count(*) FROM permissions;"

# Cleanup
docker exec tts-postgres dropdb -U postgres test_auth_db
```

---

## Scaling Strategy

### Current Architecture (Single Droplet)

```
┌─────────────────────────────────────────┐
│        DigitalOcean Droplet             │
│        2GB RAM, 2 vCPU, 50GB SSD        │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  Docker (All Services)           │   │
│  │  ├─ PostgreSQL                   │   │
│  │  ├─ RabbitMQ                     │   │
│  │  ├─ 5 Django Services            │   │
│  │  ├─ 2 Celery Workers             │   │
│  │  ├─ React Frontend               │   │
│  │  └─ Nginx (Reverse Proxy)        │   │
│  └──────────────────────────────────┘   │
│                                         │
│     Backup: Daily SQL + Media           │
│     Monitoring: Docker stats            │
└─────────────────────────────────────────┘
```

**Suitable for:** 
- Up to 1,000 concurrent users
- ~100-200 tickets/day
- Low to medium traffic

**Limitations:**
- Single point of failure (no redundancy)
- Shared resources (CPU, RAM, disk)
- Manual scaling required
- No load balancing

### Phase 2: Vertical Scaling (Same Droplet, Better Hardware)

When current Droplet reaches capacity:

```bash
# 1. Monitor current usage
docker stats --no-stream

# 2. Signs you need to scale:
#    - CPU consistently > 80%
#    - RAM consistently > 85%
#    - Disk space < 20% free

# 3. Upgrade Droplet (DigitalOcean Console):
#    - Power off Droplet
#    - Resize → Choose larger plan (4GB→8GB, 2vCPU→4vCPU)
#    - Power on
#    - No application changes needed!

# 4. Update worker concurrency
#    Edit Docker/docker-compose.prod.yml:
#    workflow-worker: change --concurrency=4 to --concurrency=8
#    notification-worker: change --concurrency=2 to --concurrency=4
#    docker-compose up -d workflow-worker notification-worker
```

**Cost:** $12-24/month → $24-48/month (still cost-effective)

### Phase 3: Horizontal Scaling (Multiple Droplets + Load Balancing)

When Vertical scaling isn't enough:

```
┌─────────────────────────────────────────────────────┐
│         DigitalOcean Load Balancer                  │
│         (Distribute traffic across droplets)        │
└──────────────┬────────────────┬─────────────────────┘
               │                │
        ┌──────▼────────┐  ┌────▼──────────┐
        │  Droplet 1    │  │  Droplet 2    │
        │  (API)        │  │  (API)        │
        │  Port 80/443  │  │  Port 80/443  │
        └──────┬────────┘  └────┬──────────┘
               │                │
               └────────┬───────┘
                        │
        ┌───────────────▼───────────────┐
        │  Shared PostgreSQL Database   │
        │  (DigitalOcean Managed)       │
        └───────────────────────────────┘
        
        ┌───────────────────────────────┐
        │  Shared RabbitMQ / Redis      │
        │  (External Service)           │
        └───────────────────────────────┘
        
        ┌───────────────────────────────┐
        │  Object Storage (S3/Spaces)   │
        │  (Media files)                │
        └───────────────────────────────┘
```

#### Implementation Steps

```bash
# 1. Create second Droplet (same as first)
#    - Same OS, size, configuration
#    - Clone from first droplet (in DigitalOcean console)

# 2. Setup shared database (DigitalOcean Managed Database)
#    - Create PostgreSQL cluster
#    - Enable high availability (3 nodes)
#    - Setup automated backups
#    - Update DATABASE_URL to point to managed DB

# 3. Move media to object storage
#    - Create DigitalOcean Space
#    - Or use AWS S3
#    - Configure Django to use S3 backend
#    - Migrate existing media files

# 4. Setup RabbitMQ/Redis cluster
#    - Option A: DigitalOcean App Platform
#    - Option B: External managed service
#    - Update broker URLs

# 5. Create Load Balancer
#    - DigitalOcean Console → Load Balancers
#    - Add both Droplets as backends
#    - Configure health checks
#    - Add SSL certificate

# 6. Update DNS
#    - Point yourdomain.com to Load Balancer IP
#    - CNAME for api.yourdomain.com

# 7. Deploy code to both Droplets
#    - Clone same repository
#    - Use same .env configuration
#    - Run same migrations (safe to run on both)

# 8. Test failover
#    - Shut down one Droplet
#    - Verify traffic routes to other
#    - Power it back on
```

#### Cost Estimate (Phase 3)
- 2 Droplets: $12 × 2 = $24/month
- Managed PostgreSQL: $15/month
- Load Balancer: $10/month
- Object Storage: $5/month
- **Total:** ~$54/month

### Phase 4: Auto-Scaling with Kubernetes (Future)

When you need true auto-scaling:

```
Use DigitalOcean Kubernetes (DOKS)
├─ Auto-scaling pod replicas
├─ Managed control plane
├─ Persistent storage
├─ Ingress controller (auto load balancing)
└─ Monitoring/logging integration

Implementation time: 2-3 weeks
Setup complexity: Medium-High
Cost: Similar to Phase 3 ($50-80/month)
Benefits:
├─ True auto-scaling
├─ Self-healing
├─ Rolling updates
├─ Better resource utilization
└─ Standard platform
```

---

## Monitoring & Alerts

### Basic Monitoring (Droplet Level)

```bash
# Install monitoring tools
sudo apt-get install -y htop iotop nethogs

# Monitor in real-time
htop       # CPU, RAM, processes
iotop      # Disk I/O
nethogs    # Network traffic
```

### Docker Monitoring

```bash
# Real-time container stats
watch -n 1 'docker stats --no-stream'

# Service health check script
#!/bin/bash
SERVICES=("tts-auth" "tts-ticket" "tts-workflow-api" "tts-messaging" "tts-notification")
for service in "${SERVICES[@]}"; do
    STATUS=$(docker inspect -f='{{.State.Running}}' $service)
    if [ "$STATUS" = "true" ]; then
        echo "✓ $service: Running"
    else
        echo "✗ $service: NOT RUNNING - ALERT!"
    fi
done
```

### Setup Monitoring Alerts

```bash
# Monitor disk space and alert
0 * * * * if [ $(df / | awk 'NR==2 {print $5}' | sed 's/%//') -gt 85 ]; then mail -s "ALERT: Low disk space on prod" admin@yourdomain.com; fi

# Monitor service health every 5 minutes
*/5 * * * * /home/deploy/apps/backups/health-check.sh >> /var/log/service-health.log 2>&1

# Alert on high CPU usage
*/10 * * * * if [ $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print int(100 - $1)}') -gt 90 ]; then mail -s "ALERT: High CPU usage" admin@yourdomain.com; fi
```

### Third-Party Monitoring (Optional)

- **New Relic** - APM for Python/Django
- **Sentry** - Error tracking
- **DataDog** - Infrastructure monitoring
- **Uptime Robot** - Uptime monitoring
- **LogRocket** - Frontend monitoring

---

## Conclusion

The backup and scaling strategy provides:

1. **Immediate (Day 1):**
   - Single Droplet with all services
   - Daily automated backups
   - SSL/TLS encryption
   - Basic monitoring

2. **Short-term (Month 3):**
   - Vertical scaling if needed
   - Cloud backup (S3/GCS)
   - Enhanced monitoring
   - Disaster recovery procedures

3. **Medium-term (Month 6+):**
   - Horizontal scaling to multiple Droplets
   - Managed database for reliability
   - Object storage for media
   - Advanced monitoring and alerts

4. **Long-term (Year 1+):**
   - Kubernetes for auto-scaling
   - Multi-region deployment
   - DDoS protection
   - Compliance certifications

Choose your scaling path based on user growth and budget!

