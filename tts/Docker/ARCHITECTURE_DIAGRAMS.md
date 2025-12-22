# Production Architecture Diagrams

## 1. Single Droplet Architecture (Phase 1 - Current)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DigitalOcean Droplet                         │
│                   2GB RAM | 2vCPU | 50GB SSD                        │
│                    Ubuntu 22.04 LTS Server                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Docker Engine                             │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │  Nginx Reverse Proxy & Load Balancer                  │ │  │
│  │  │  • SSL/TLS Termination (Let's Encrypt)               │ │  │
│  │  │  • Rate Limiting (10 req/s)                          │ │  │
│  │  │  • Security Headers                                  │ │  │
│  │  │  • Compression & Caching                             │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                          ↓                                    │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │         Docker Network (172.20.0.0/16)               │ │  │
│  │  │                                                        │ │  │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │ │  │
│  │  │  │  Frontend    │  │ Auth Service │  │  Ticket   │  │ │  │
│  │  │  │  (React)     │  │  (Django)    │  │ Service   │  │ │  │
│  │  │  │  Port 1000   │  │ Port 8000    │  │(Port 8000)│  │ │  │
│  │  │  └──────────────┘  └──────────────┘  └───────────┘  │ │  │
│  │  │                                                        │ │  │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │ │  │
│  │  │  │  Workflow    │  │  Messaging   │  │ Notif.    │ │ │  │
│  │  │  │  API         │  │  Service     │  │ Service   │ │ │  │
│  │  │  │  (Django)    │  │  (Django)    │  │ (Django)  │ │ │  │
│  │  │  │  Port 8000   │  │  Port 8001   │  │Port 8001  │ │ │  │
│  │  │  └──────────────┘  └──────────────┘  └────────────┘ │ │  │
│  │  │                                                        │ │  │
│  │  │  ┌──────────────┐  ┌──────────────┐                 │ │  │
│  │  │  │  Workflow    │  │ Notification │                 │ │  │
│  │  │  │  Worker      │  │ Worker       │                 │ │  │
│  │  │  │  (Celery)    │  │ (Celery)     │                 │ │  │
│  │  │  └──────────────┘  └──────────────┘                 │ │  │
│  │  │                                                        │ │  │
│  │  │  ┌─────────────────────┐  ┌──────────────────────┐  │ │  │
│  │  │  │   PostgreSQL 15     │  │   RabbitMQ 3.13      │  │ │  │
│  │  │  │                     │  │                      │  │ │  │
│  │  │  │ • auth_db           │  │ • AMQP Queue (5672)  │  │ │  │
│  │  │  │ • ticket_db         │  │ • Management UI      │  │ │  │
│  │  │  │ • workflow_db       │  │   (15672)            │  │ │  │
│  │  │  │ • notification_db   │  │                      │  │ │  │
│  │  │  │ • messaging_db      │  │ Persistent Volume    │  │ │  │
│  │  │  │                     │  │                      │  │ │  │
│  │  │  │ Persistent Volume   │  │                      │  │ │  │
│  │  │  └─────────────────────┘  └──────────────────────┘  │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │  Volumes:                                                   │  │
│  │  • postgres_data (Database files)                          │  │
│  │  • rabbitmq_data (Message persistence)                    │  │
│  │  • media_files (Uploaded files)                           │  │
│  │  • nginx_logs (Access/error logs)                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Backups (Daily):                                                  │
│  • PostgreSQL dumps → ~/apps/backups/postgres_*.sql.gz            │
│  • Media archives → ~/apps/backups/media_*.tar.gz                │
│  • Optional: S3/Google Cloud storage                             │
│                                                                     │
│  Ports Exposed:                                                    │
│  • 80 (HTTP) → Nginx                                              │
│  • 443 (HTTPS) → Nginx (SSL)                                      │
│  • All others: internal only                                       │
└─────────────────────────────────────────────────────────────────────┘

                         ↓ Reverse Proxy ↓
        
     ┌────────────────────────────────────────────┐
     │           Internet Traffic                  │
     │    yourdomain.com (Port 80 → 443)          │
     │    api.yourdomain.com                      │
     │    www.yourdomain.com                      │
     └────────────────────────────────────────────┘
```

---

## 2. Data Flow Diagram

```
┌──────────┐
│ Frontend │
│(Browser) │
└────┬─────┘
     │
     │ HTTPS
     │ yourdomain.com
     ↓
┌──────────────────────────┐
│  Nginx Reverse Proxy     │
│  (Port 80/443)           │
│                          │
│  • SSL Termination       │
│  • Rate Limiting         │
│  • Route to Services     │
└──────────────────────────┘
     │
     ├─────────────┬──────────────┬──────────────┬──────────────┐
     ↓             ↓              ↓              ↓              ↓
   /api/v1/   /api/v1/      /api/v1/       /api/v1/        /api/v1/
   auth/      tickets/      workflows/     comments/     notifications/
     │             │              │              │              │
     ↓             ↓              ↓              ↓              ↓
 ┌────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
 │ Auth   │  │ Ticket  │  │Workflow  │  │Messaging │  │Notif.    │
 │Service │  │Service  │  │API       │  │Service   │  │Service   │
 └────────┘  └─────────┘  └──────────┘  └──────────┘  └──────────┘
     │             │              │              │              │
     └─────────────┴──────────────┼──────────────┴──────────────┘
                                  │
                                  ↓
                        ┌──────────────────┐
                        │   PostgreSQL     │
                        │  (Shared DB)     │
                        │                  │
                        │ • Persistent     │
                        │ • Replicated     │
                        │ • Backed up      │
                        └──────────────────┘

Async Task Flow:
┌────────┐  Enqueue Task  ┌──────────┐  Publish  ┌──────────┐
│Service │──────────────→ │RabbitMQ  │─────────→ │Worker    │
└────────┘                └──────────┘          └──────────┘
                                                      │
                                                      ↓
                                           ┌──────────────────┐
                                           │ Execute & Update │
                                           │    PostgreSQL    │
                                           └──────────────────┘
```

---

## 3. Network Architecture

```
┌────────────────────────────────────────────────────────────┐
│              External Network (Internet)                   │
│                    Port 80 & 443                           │
└────────────────────┬───────────────────────────────────────┘
                     │
     ┌───────────────┴───────────────┐
     ↓                               ↓
  HTTP                           HTTPS
(redirect)                    (SSL/TLS)
     │                               │
     └───────────────┬───────────────┘
                     ↓
        ┌────────────────────────┐
        │   Nginx Container      │
        │   0.0.0.0:80/443       │
        └────────────┬───────────┘
                     │
                     │ Internal Network
                     │ 172.20.0.0/16
                     │
        ┌────────────┼─────────────────────────┐
        │            │                         │
        ↓            ↓                         ↓
   Docker Services  PostgreSQL           RabbitMQ
   (expose: none)   (127.0.0.1:5432)      (127.0.0.1:5672)
                    Private                Private
                    Local Only             Local Only

Security Benefits:
• Public: Only Nginx (hardened reverse proxy)
• Private: All databases and app servers
• Internal: Services communicate via Docker DNS
• No direct exposure to backend services
```

---

## 4. Data Persistence & Backups

```
┌─────────────────────────────────────────────────────────┐
│           Droplet Storage Layout                        │
│                                                         │
│  ┌────────────────────────────────────────────┐        │
│  │  /home/deploy/apps/                        │        │
│  │                                            │        │
│  │  ├─ Ticket-Tracking-System/               │        │
│  │  │  ├─ Docker/                            │        │
│  │  │  │  ├─ docker-compose.prod.yml        │        │
│  │  │  │  ├─ nginx/                         │        │
│  │  │  │  ├─ logs/                          │        │
│  │  │  │  └─ backups/                       │        │
│  │  │  ├─ auth/                             │        │
│  │  │  ├─ ticket_service/                   │        │
│  │  │  └─ ... other services ...            │        │
│  │  │                                        │        │
│  │  └─ backups/                             │        │
│  │     ├─ postgres_full_20240101.sql.gz    │        │
│  │     ├─ postgres_full_20240102.sql.gz    │        │
│  │     ├─ media_20240101.tar.gz            │        │
│  │     ├─ media_20240102.tar.gz            │        │
│  │     └─ ... 30 days retention ...         │        │
│  │                                            │        │
│  └────────────────────────────────────────────┘        │
│                                                         │
│  Docker Named Volumes:                                 │
│  ├─ postgres_data    → /var/lib/docker/volumes/...    │
│  ├─ rabbitmq_data    → /var/lib/docker/volumes/...    │
│  ├─ media_files      → /var/lib/docker/volumes/...    │
│  └─ nginx_logs       → /var/lib/docker/volumes/...    │
│                                                         │
└─────────────────────────────────────────────────────────┘

Backup & Disaster Recovery:

Local Backups (30-day retention):
├─ PostgreSQL daily dumps
├─ Media files daily archives
└─ Logs and configuration

Cloud Storage (Optional, Recommended):
├─ AWS S3 / Google Cloud Storage
├─ Backblaze B2
└─ DigitalOcean Spaces

DigitalOcean Native:
├─ Automated Droplet Snapshots
├─ Managed Database backups
└─ Space object versioning
```

---

## 5. Scaling Roadmap

### Phase 1: Single Droplet (Current)
```
User Traffic
     │
     ↓
┌─────────────────┐
│  Single Droplet │
│  • All Services │
│  • Single DB    │
│  • Single Disk  │
└─────────────────┘

Capacity: ~1,000 concurrent users
Cost: $12/month
Setup time: 2-3 hours
```

### Phase 2: Vertical Scaling (Bigger Hardware)
```
User Traffic
     │
     ↓
┌──────────────────┐
│ Larger Droplet   │
│ • Same Services  │
│ • More CPU/RAM   │
│ • More Storage   │
└──────────────────┘

Capacity: ~5,000 concurrent users
Cost: $24-48/month
Setup time: 10 minutes (just resize)
```

### Phase 3: Horizontal Scaling (Multiple Droplets)
```
User Traffic
     │
     ↓
┌──────────────────────────┐
│  Load Balancer           │
│  (DigitalOcean)          │
└──────────────┬───────────┘
               │
     ┌─────────┴─────────┐
     ↓                   ↓
┌─────────┐         ┌─────────┐
│Droplet 1│         │Droplet 2│
│(Frontend│         │(Frontend│
│ + API)  │         │ + API)  │
└─────────┘         └─────────┘
     │                   │
     └─────────┬─────────┘
               ↓
     ┌──────────────────┐
     │ Shared Services  │
     │ • PostgreSQL     │
     │ • RabbitMQ       │
     │ • Object Storage │
     └──────────────────┘

Capacity: ~10,000+ concurrent users
Cost: $54/month
Setup time: 1-2 days
```

### Phase 4: Kubernetes (Advanced)
```
User Traffic
     │
     ↓
┌──────────────────────────┐
│ DigitalOcean Kubernetes  │
│ (DOKS)                   │
└──────────────┬───────────┘
               │
     ┌─────────┴─────────┬──────────┐
     ↓                   ↓          ↓
┌─────────┐         ┌─────────┐  ┌─────────┐
│Pod Set 1│         │Pod Set 2│  │Pod Set 3│
│(Frontend)│        │ (API)   │  │(Workers)│
└─────────┘         └─────────┘  └─────────┘
     │                   │          │
     └─────────┬─────────┴──────────┘
               ↓
     ┌──────────────────┐
     │ Managed Services │
     │ • PostgreSQL     │
     │ • Redis          │
     │ • S3 Storage     │
     └──────────────────┘

Capacity: ~50,000+ concurrent users
Cost: $75/month+
Setup time: 2-3 weeks
Benefits: Auto-scaling, self-healing, rolling updates
```

---

## 6. CI/CD Deployment Pipeline (Future)

```
┌──────────────┐
│   Developer  │
│  Git Push    │
└──────┬───────┘
       │
       ↓
┌──────────────────┐
│ GitHub Actions   │
│ / GitLab CI      │
└──────┬───────────┘
       │
       ├─→ Run Tests
       │   ├─ Unit Tests
       │   ├─ Integration Tests
       │   └─ Security Scan
       │
       ├─→ Build Docker Images
       │   ├─ auth-service:latest
       │   ├─ ticket-service:latest
       │   ├─ ... other services ...
       │   └─ Push to Registry
       │
       ├─→ Stage Deployment
       │   └─ Deploy to staging Droplet
       │
       ├─→ Smoke Tests
       │   ├─ API health checks
       │   ├─ Database connectivity
       │   └─ Functional tests
       │
       └─→ Production Deployment
           ├─ Blue-Green Deployment
           ├─ Gradual rollout
           └─ Health monitoring

Example GitHub Actions workflow:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker Images
        run: docker-compose -f Docker/docker-compose.prod.yml build
      
      - name: Push to Registry
        run: docker push <your-registry>/...
      
      - name: Deploy to Droplet
        run: |
          ssh -i ${{ secrets.DROPLET_KEY }} deploy@${{ secrets.DROPLET_IP }}
          cd ~/apps/Ticket-Tracking-System/Docker
          docker-compose -f docker-compose.prod.yml pull
          docker-compose -f docker-compose.prod.yml up -d
          docker exec tts-auth python manage.py migrate
```

---

## 7. Health & Monitoring

```
┌────────────────────────────────────────┐
│      Monitoring & Health Checks        │
│                                        │
│  Every Container:                      │
│  ├─ Liveness Check (is it running?)   │
│  ├─ Readiness Check (ready to serve?) │
│  └─ Startup Check (started properly?) │
│                                        │
│  Container Logs:                       │
│  ├─ Application logs                  │
│  ├─ Error logs                        │
│  └─ Access logs                       │
│                                        │
│  System Monitoring:                    │
│  ├─ CPU Usage                         │
│  ├─ Memory Usage                      │
│  ├─ Disk I/O                          │
│  └─ Network Traffic                   │
│                                        │
│  Application Metrics:                  │
│  ├─ API Response Times                │
│  ├─ Database Queries                  │
│  ├─ Celery Queue Depth                │
│  └─ Error Rates                       │
│                                        │
│  Alerting:                             │
│  ├─ Email on failures                 │
│  ├─ Slack notifications               │
│  └─ PagerDuty escalation              │
│                                        │
└────────────────────────────────────────┘
```

---

## Summary

This architecture provides:

✅ **Scalability** - Easy to scale from 1 Droplet to thousands of users
✅ **Reliability** - Health checks, automatic restarts, backups
✅ **Security** - SSL/TLS, firewalls, rate limiting, isolated networks
✅ **Performance** - Load balancing, caching, compression
✅ **Maintainability** - Clear documentation, standardized Docker setup
✅ **Cost-Effective** - Starts at $12/month, scales gradually

