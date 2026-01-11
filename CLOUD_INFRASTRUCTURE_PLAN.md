# Cloud Infrastructure Plan - MAP System (Multi-Application Platform)

## Executive Summary

This document outlines the cloud infrastructure architecture for the MAP System - a comprehensive multi-application platform consisting of **four major systems**: Ticket Tracking System (TTS), Asset Management System (AMS), Helpdesk Tracking System (HDTS), and Budget Management System (BMS), unified by a centralized authentication service.

**Total Components Identified:**
- 15 Backend Django Services
- 6 Frontend React Applications
- 4 Celery Worker Clusters
- 1 API Gateway (Kong)
- 4 PostgreSQL Databases
- 1 RabbitMQ Message Broker
- 1 Email Testing Service (Development)

---

## 1. Component Inventory & Cloud Mapping

### 1.1 Compute Services (Backend APIs)

All Django REST Framework applications containerized with Docker.

| System | Service Name | Current Port | Compute Type | Cloud Resource | Language/Framework |
|--------|-------------|--------------|--------------|----------------|-------------------|
| **Auth** | auth-service | 8000/8003 | Container | ECS Fargate / Cloud Run | Django 4.x + DRF |
| **TTS** | workflow-api | 1001 | Container | ECS Fargate / Cloud Run | Django 4.x + DRF |
| **TTS** | helpdesk-service | 5001 | Container | ECS Fargate / Cloud Run | Django 4.x + DRF |
| **TTS** | messaging-service | 1002 | Container | ECS Fargate / Cloud Run | Django 4.x + DRF + WebSockets |
| **TTS** | notification-service | 1003 | Container | ECS Fargate / Cloud Run | Django 4.x + DRF |
| **AMS** | authentication-service | 8001 | Container | ECS Fargate / Cloud Run | Django 4.x + DRF |
| **AMS** | assets-service | 8002 | Container | ECS Fargate / Cloud Run | Django 4.x + DRF |
| **AMS** | contexts-service | 8003 | Container | ECS Fargate / Cloud Run | Django 4.x + DRF |
| **HDTS** | helpdesk-service (HDTS) | 8000 | Container | ECS Fargate / Cloud Run | Django 4.x + DRF |
| **BMS** | auth-service (BMS) | 8001 | Container | ECS Fargate / Cloud Run | Django 4.x + DRF |
| **BMS** | budget-service | 8000 | Container | ECS Fargate / Cloud Run | Django 4.x + DRF |

**Cloud Provider Recommendations:**
- **AWS**: ECS Fargate (serverless containers) with Application Load Balancer
- **GCP**: Cloud Run (serverless) with Cloud Load Balancing
- **Azure**: Container Apps with Application Gateway

### 1.2 Background Workers (Celery)

Async task processing for email notifications, workflow orchestration, data synchronization.

| Worker Name | Queues | Purpose | Cloud Resource |
|------------|---------|---------|----------------|
| workflow-worker | `TICKET_TASKS_PRODUCTION`, `role_send-default`, `tts.role.sync`, `workflow_seed` | Workflow step execution, role sync | ECS Fargate / Cloud Run |
| helpdesk-worker | Celery default | HDTS ticket processing | ECS Fargate / Cloud Run |
| notification-worker | `notification-queue`, `inapp-notification-queue`, `user-email-sync-queue` | Email & in-app notifications | ECS Fargate / Cloud Run |
| auth-worker | `auth-sync-queue` | Cross-system auth sync | ECS Fargate / Cloud Run |

**Scaling Strategy:**
- Auto-scale based on RabbitMQ queue depth (CloudWatch/Stackdriver metrics)
- Min replicas: 1, Max replicas: 10

### 1.3 Frontend Applications

Static React (Vite) SPAs with client-side routing.

| System | App Name | Framework | Build Output | Cloud Resource |
|--------|----------|-----------|--------------|----------------|
| **TTS** | frontend | React 18 + Vite | Static HTML/JS/CSS | S3 + CloudFront / GCS + Cloud CDN |
| **AMS** | frontend | React 19 + Vite | Static HTML/JS/CSS | S3 + CloudFront / GCS + Cloud CDN |
| **HDTS** | frontendfolder | React + Vite | Static HTML/JS/CSS | S3 + CloudFront / GCS + Cloud CDN |
| **BMS** | frontend | React + Vite | Static HTML/JS/CSS | S3 + CloudFront / GCS + Cloud CDN |
| **Auth** | frontend | React + Vite | Static HTML/JS/CSS | S3 + CloudFront / GCS + Cloud CDN |
| **Docs** | map-docs | Docusaurus | Static site | S3 + CloudFront / GCS + Cloud CDN |

**Hosting Options:**
- **AWS**: S3 static hosting + CloudFront CDN
- **GCP**: Cloud Storage + Cloud CDN
- **Azure**: Azure Blob Storage + Azure CDN
- **Vercel/Netlify**: Managed hosting with Git integration

### 1.4 API Gateway

Single Kong instance managing all traffic routing, JWT validation, CORS, rate limiting.

| Component | Current Setup | Cloud Resource |
|-----------|---------------|----------------|
| Kong API Gateway | Kong 3.4-3.9 (DB-less mode) | AWS ALB/NLB, GCP Load Balancer, or managed Kong Konnect |
| Configuration | Declarative YAML | ConfigMap (K8s) / Parameter Store / Secret Manager |

**Cloud Implementation:**
- **Option 1**: Deploy Kong as container behind cloud load balancer
- **Option 2**: Use managed **Kong Konnect** (hybrid cloud)
- **Option 3**: Replace with cloud-native API Gateway (AWS API Gateway, GCP API Gateway)

### 1.5 Databases

Single PostgreSQL 15 instance with multiple logical databases.

| Database Name | System | Estimated Size | Cloud Resource |
|--------------|--------|----------------|----------------|
| `auth_db` | Central Auth | 5 GB | RDS PostgreSQL / Cloud SQL / Azure Database |
| `workflowmanagement` | TTS Workflow | 20 GB | RDS PostgreSQL / Cloud SQL |
| `helpdesk` | TTS/HDTS | 15 GB | RDS PostgreSQL / Cloud SQL |
| `notificationservice` | TTS Notifications | 10 GB | RDS PostgreSQL / Cloud SQL |
| `ams_authentication` | AMS Auth | 5 GB | RDS PostgreSQL / Cloud SQL |
| `ams_assets` | AMS Assets | 50 GB | RDS PostgreSQL / Cloud SQL |
| `ams_contexts` | AMS Contexts | 10 GB | RDS PostgreSQL / Cloud SQL |
| `budgetpro_db` | BMS Budget | 20 GB | RDS PostgreSQL / Cloud SQL |
| `budgetpro_auth` | BMS Auth | 5 GB | RDS PostgreSQL / Cloud SQL |

**Consolidation Strategy:**
- **Current**: Single PostgreSQL instance (simple but not resilient)
- **Recommended**: Separate managed DB instances per system (TTS, AMS, HDTS, BMS) for isolation
- **Cloud Services**: 
  - AWS RDS PostgreSQL (Multi-AZ for HA)
  - GCP Cloud SQL PostgreSQL (Regional HA)
  - Azure Database for PostgreSQL

**Backup Strategy:**
- Automated daily snapshots (35-day retention)
- Cross-region replication for disaster recovery
- Point-in-time recovery enabled

### 1.6 Message Broker

RabbitMQ for async task queuing across all systems.

| Component | Current Setup | Cloud Resource |
|-----------|---------------|----------------|
| RabbitMQ | v3.13 (management UI enabled) | Amazon MQ / Cloud Pub/Sub / Azure Service Bus |
| Queues | `TICKET_TASKS_PRODUCTION`, `notification-queue`, `auth-sync-queue`, etc. | Managed queue service |
| Persistence | Docker volume | Persistent disk (EBS/Persistent Disk) |

**Cloud Alternatives:**
- **AWS**: Amazon MQ (managed RabbitMQ) or SQS + SNS
- **GCP**: Cloud Pub/Sub (pub-sub model, highly scalable)
- **Azure**: Azure Service Bus (enterprise messaging)

### 1.7 File Storage (Media)

User uploads, ticket attachments, asset images.

| Storage Type | Current | Cloud Resource |
|-------------|---------|----------------|
| Media files | Docker volume (`media_files`) | S3 / Cloud Storage / Azure Blob |
| Static files | Served by Django | CDN (CloudFront/Cloud CDN) |

**Cloud Implementation:**
- Store in object storage (S3/GCS/Azure Blob)
- Use presigned URLs for secure access
- CDN for delivery (CloudFront, Cloud CDN)

### 1.8 Email Service

SendGrid for transactional emails (invitations, notifications, password resets).

| Current | Cloud Resource |
|---------|----------------|
| SendGrid API integration | Keep SendGrid, or use AWS SES, Google SMTP Relay, Azure Communication Services |
| Mailpit (dev only) | Not deployed in production |

### 1.9 Monitoring & Logging

| Component | Cloud Resource |
|-----------|----------------|
| Application logs | CloudWatch Logs / Cloud Logging / Azure Monitor |
| Metrics | CloudWatch / Cloud Monitoring / Azure Monitor |
| Distributed tracing | X-Ray / Cloud Trace / Application Insights |
| Error tracking | Sentry (SaaS) |

### 1.10 DNS & SSL/TLS

| Component | Cloud Resource |
|-----------|----------------|
| Domain management | Route 53 / Cloud DNS / Azure DNS |
| SSL certificates | AWS ACM / Google-managed SSL / Let's Encrypt |

---

## 2. Cloud Architecture Diagram (Textual)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                          Internet / End Users                                  │
└────────────────────────────────┬───────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                         Global DNS (Route 53 / Cloud DNS)                      │
│  - mapactive.tech → Load Balancer                                              │
│  - *.mapactive.tech → CloudFront/Cloud CDN (frontends)                         │
└────────────────────────────────┬───────────────────────────────────────────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
                ▼                                 ▼
┌───────────────────────────────┐   ┌────────────────────────────────────────┐
│  CDN (CloudFront/Cloud CDN)   │   │  Application Load Balancer (ALB)       │
│  - Serves static frontends    │   │  - HTTPS termination (ACM cert)        │
│  - TTS, AMS, HDTS, BMS UIs    │   │  - Routes to Kong API Gateway          │
│  - Documentation site         │   │  - Health checks                       │
└───────────────────────────────┘   └────────────┬───────────────────────────┘
                                                  │
                                                  ▼
                        ┌─────────────────────────────────────────┐
                        │   Kong API Gateway (Container Cluster)   │
                        │   - JWT authentication                   │
                        │   - Rate limiting (100 req/min)          │
                        │   - CORS handling                        │
                        │   - Request/response logging             │
                        │   - Routes to backend services           │
                        └──────────────┬──────────────────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          │                            │                            │
          ▼                            ▼                            ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  Auth Service       │    │  TTS Services       │    │  AMS Services       │
│  - User auth        │    │  - workflow-api     │    │  - authentication   │
│  - JWT issuance     │    │  - helpdesk-service │    │  - assets-service   │
│  - Role management  │    │  - messaging        │    │  - contexts-service │
│  - System data      │    │  - notification     │    │                     │
│  (ECS Fargate)      │    │  (ECS Fargate)      │    │  (ECS Fargate)      │
└──────────┬──────────┘    └──────────┬──────────┘    └──────────┬──────────┘
           │                          │                          │
           │        ┌─────────────────┼─────────────────┐        │
           │        │                 │                 │        │
           ▼        ▼                 ▼                 ▼        ▼
┌──────────────────────────────────────────────────────────────────────────┐
│              Background Worker Pools (Celery on ECS Fargate)             │
│  - workflow-worker: Ticket workflow orchestration                        │
│  - notification-worker: Email & in-app notification delivery             │
│  - auth-worker: Cross-system role/user synchronization                   │
│  - helpdesk-worker: HDTS ticket processing                               │
│  Auto-scaling based on queue depth                                       │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────────┐
│        Message Broker (Amazon MQ / Cloud Pub/Sub / RabbitMQ)              │
│  Queues:                                                                   │
│  - TICKET_TASKS_PRODUCTION (workflow orchestration)                       │
│  - notification-queue (email notifications)                               │
│  - inapp-notification-queue (UI notifications)                            │
│  - auth-sync-queue (role synchronization)                                 │
│  - role_send-default (role updates)                                       │
└────────────────────────────────────────────────────────────────────────────┘
           │                          │                          │
           └──────────────────────────┼──────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    Managed PostgreSQL Databases (Multi-AZ)                 │
│  ┌─────────────────┬─────────────────┬─────────────────┬────────────────┐ │
│  │  TTS Cluster    │  AMS Cluster    │  BMS Cluster    │  Auth Cluster  │ │
│  │  - workflow_db  │  - ams_assets   │  - budgetpro_db │  - auth_db     │ │
│  │  - helpdesk     │  - ams_contexts │  - budgetpro_   │                │ │
│  │  - notification │  - ams_auth     │    auth         │                │ │
│  └─────────────────┴─────────────────┴─────────────────┴────────────────┘ │
│  (RDS PostgreSQL / Cloud SQL PostgreSQL)                                  │
│  - Automated backups (daily, 35-day retention)                            │
│  - Read replicas for reporting queries                                    │
│  - Cross-region replication for DR                                        │
└────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                     Object Storage (S3 / Cloud Storage)                    │
│  Buckets:                                                                  │
│  - media-files-tts (ticket attachments, user uploads)                     │
│  - media-files-ams (asset images, documents)                              │
│  - static-assets (compiled JS/CSS from build)                             │
│  Lifecycle policies: Archive to Glacier/Coldline after 90 days            │
└────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                          External Services                                 │
│  - SendGrid (transactional email delivery)                                 │
│  - Sentry (error monitoring & alerting)                                    │
│  - reCAPTCHA (bot protection on auth forms)                                │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                        Observability & Security                            │
│  ┌──────────────────────┬──────────────────────┬──────────────────────┐   │
│  │  CloudWatch Logs /   │  AWS Secrets Manager │  IAM Roles /         │   │
│  │  Cloud Logging       │  / Secret Manager    │  Service Accounts    │   │
│  │  (centralized logs)  │  (API keys, DB creds)│  (least privilege)   │   │
│  └──────────────────────┴──────────────────────┴──────────────────────┘   │
│  ┌──────────────────────┬──────────────────────┬──────────────────────┐   │
│  │  CloudWatch Metrics  │  AWS WAF /           │  VPC / Subnets       │   │
│  │  / Cloud Monitoring  │  Cloud Armor         │  (network isolation) │   │
│  │  (dashboards, alerts)│  (DDoS protection)   │                      │   │
│  └──────────────────────┴──────────────────────┴──────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Interactions

### 3.1 Request Flow - User Creates Ticket (TTS)

1. **User** → Frontend (React SPA served from CloudFront)
2. **Frontend** → ALB → Kong API Gateway (validates JWT)
3. **Kong** → `workflow-api` service (ECS Fargate container)
4. **workflow-api** → PostgreSQL (`workflowmanagement` DB) to save ticket
5. **workflow-api** → Enqueues Celery task to RabbitMQ (`TICKET_TASKS_PRODUCTION` queue)
6. **workflow-worker** (Celery) consumes task from RabbitMQ
7. **workflow-worker** → Processes workflow steps (role assignment, notifications)
8. **workflow-worker** → Sends notification task to RabbitMQ (`notification-queue`)
9. **notification-worker** → Sends email via SendGrid
10. **notification-worker** → Creates in-app notification in PostgreSQL (`notificationservice` DB)
11. **Frontend** polls `notification-service` API for new notifications

### 3.2 Cross-System Authentication

1. **User** → Auth frontend (React SPA)
2. **Auth frontend** → ALB → Kong → `auth-service`
3. **auth-service** → PostgreSQL (`auth_db`) to validate credentials
4. **auth-service** → Issues JWT token (HS256, signed with `DJANGO_JWT_SIGNING_KEY`)
5. **Frontend** stores JWT in localStorage
6. **Frontend** includes JWT in `Authorization: Bearer <token>` header for all API calls
7. **Kong** validates JWT at edge (using `jwt_secrets` config)
8. **Kong** sets `Kong-Trusted: true` header and forwards to backend services
9. **Backend services** trust Kong validation (check `KONG_TRUSTED` env var)

### 3.3 Role Synchronization (Auth → TTS/AMS/BMS)

1. **Admin** updates role in `auth-service`
2. **auth-service** → Enqueues Celery task to RabbitMQ (`auth-sync-queue`)
3. **auth-worker** consumes task
4. **auth-worker** → HTTP POST to TTS/AMS/BMS role sync endpoints
5. **TTS/AMS/BMS** → Update local `UserSystemRole` models

### 3.4 Asset Checkout (AMS)

1. **User** → AMS frontend (React SPA)
2. **AMS frontend** → Kong → `assets-service`
3. **assets-service** → PostgreSQL (`ams_assets` DB) to create checkout record
4. **assets-service** → HTTP call to `contexts-service` to get employee data
5. **assets-service** → Upload QR code to S3 (presigned URL)
6. **assets-service** → Returns checkout confirmation to frontend

---

## 4. Cloud Provider-Specific Recommendations

### 4.1 AWS Architecture

**Compute:**
- ECS Fargate for all Django services + Celery workers
- Application Load Balancer (ALB) for Kong and service routing

**Database:**
- RDS PostgreSQL Multi-AZ (4 instances: TTS, AMS, BMS, Auth)
- Aurora PostgreSQL Serverless v2 (cost optimization option)

**Messaging:**
- Amazon MQ (managed RabbitMQ) or SQS + SNS

**Storage:**
- S3 Standard for media files
- S3 Intelligent-Tiering for cost optimization
- CloudFront for frontend and static asset delivery

**Networking:**
- VPC with public/private subnets across 3 AZs
- NAT Gateway for outbound traffic from private subnets
- Security Groups for service-to-service communication

**Secrets:**
- AWS Secrets Manager for DB credentials, API keys
- Parameter Store for non-sensitive config

**Monitoring:**
- CloudWatch Logs (centralized logging)
- CloudWatch Metrics + Dashboards
- X-Ray for distributed tracing

**Estimated Monthly Cost (production):**
- ECS Fargate: $500-800 (15 services, 2 vCPU, 4GB RAM each)
- RDS PostgreSQL: $400-600 (4 db.t3.large instances)
- ALB: $50
- S3 + CloudFront: $100-200
- Amazon MQ: $150 (mq.t3.micro)
- Data transfer: $100-300
- **Total: $1,300 - $2,100/month**

### 4.2 GCP Architecture

**Compute:**
- Cloud Run (fully managed, auto-scaling containers)
- Cloud Load Balancing (HTTPS/TCP)

**Database:**
- Cloud SQL PostgreSQL (HA configuration, 4 instances)

**Messaging:**
- Cloud Pub/Sub (serverless, unlimited scale)

**Storage:**
- Cloud Storage Standard for media files
- Cloud CDN for frontend distribution

**Networking:**
- VPC with Cloud NAT
- Cloud Armor for DDoS protection

**Secrets:**
- Secret Manager for credentials

**Monitoring:**
- Cloud Logging + Cloud Monitoring
- Cloud Trace for distributed tracing

**Estimated Monthly Cost:**
- Cloud Run: $400-600 (15 services, auto-scaling)
- Cloud SQL: $500-700 (4 instances)
- Cloud Load Balancing: $50
- Cloud Storage + CDN: $100-200
- Cloud Pub/Sub: $50-100
- **Total: $1,100 - $1,850/month**

### 4.3 Azure Architecture

**Compute:**
- Azure Container Apps (serverless containers)
- Azure Application Gateway

**Database:**
- Azure Database for PostgreSQL (Flexible Server, 4 instances)

**Messaging:**
- Azure Service Bus

**Storage:**
- Azure Blob Storage (Hot tier)
- Azure CDN

**Monitoring:**
- Azure Monitor + Application Insights

**Estimated Monthly Cost:**
- Container Apps: $450-700
- Azure Database: $500-700
- Application Gateway: $150
- Blob Storage + CDN: $100-200
- Service Bus: $100
- **Total: $1,300 - $1,950/month**

---

## 5. Migration Strategy (On-Prem/Local → Cloud)

### Phase 1: Infrastructure Setup (Weeks 1-2)
1. Provision cloud accounts and set up billing alerts
2. Create VPC/networking (subnets, security groups, NAT gateways)
3. Set up managed PostgreSQL instances (4 DBs)
4. Configure object storage buckets (S3/GCS)
5. Deploy managed message broker (Amazon MQ / Cloud Pub/Sub)
6. Set up DNS and SSL certificates

### Phase 2: Database Migration (Week 3)
1. Export data from current PostgreSQL using `pg_dump`
2. Create databases in cloud (RDS/Cloud SQL)
3. Import data using `pg_restore`
4. Validate data integrity
5. Set up automated backups and cross-region replication

### Phase 3: Backend Services (Weeks 4-5)
1. Build Docker images in CI/CD pipeline
2. Push images to container registry (ECR/GCR/ACR)
3. Deploy auth-service first (central authentication)
4. Deploy other services incrementally (TTS → AMS → BMS → HDTS)
5. Configure environment variables (use Secrets Manager)
6. Test service-to-service communication

### Phase 4: Workers & Messaging (Week 6)
1. Deploy Celery worker containers
2. Connect to message broker
3. Validate task processing (test ticket creation, notifications)

### Phase 5: API Gateway (Week 7)
1. Deploy Kong as container cluster (or configure cloud API Gateway)
2. Upload Kong declarative config
3. Test all routing rules
4. Validate JWT authentication at edge

### Phase 6: Frontend Deployment (Week 8)
1. Build production bundles (`npm run build`)
2. Upload to S3/Cloud Storage
3. Configure CloudFront/Cloud CDN distributions
4. Update DNS to point to CDN

### Phase 7: Monitoring & Observability (Week 9)
1. Configure centralized logging (CloudWatch/Cloud Logging)
2. Set up metrics dashboards (service health, DB performance)
3. Configure alerts (CPU > 80%, error rate > 5%, queue depth > 1000)
4. Enable distributed tracing (X-Ray/Cloud Trace)
5. Integrate Sentry for error tracking

### Phase 8: Load Testing & Optimization (Week 10)
1. Run load tests (JMeter, Locust, Artillery)
2. Identify bottlenecks (DB queries, API latency)
3. Optimize database indexes
4. Configure auto-scaling policies
5. Enable CDN caching for static assets

### Phase 9: Go-Live & Cutover (Week 11)
1. Final data sync (delta migration)
2. Update DNS to point to cloud load balancer
3. Monitor closely for 48 hours
4. Decommission old infrastructure

---

## 6. Security Considerations

### 6.1 Network Security
- **VPC Isolation**: All backend services in private subnets (no public IPs)
- **Security Groups**: Whitelist only required ports (e.g., ALB → Kong on 8000)
- **WAF**: Deploy AWS WAF/Cloud Armor for DDoS protection, rate limiting
- **Private Service Connectivity**: Use VPC peering or Private Link for DB access

### 6.2 Application Security
- **JWT Authentication**: All API calls validated at Kong gateway
- **Secrets Management**: API keys, DB credentials in Secrets Manager (not env vars)
- **HTTPS Everywhere**: Enforce TLS 1.2+ for all connections
- **CORS**: Strict origin whitelisting (only frontend domains)
- **Input Validation**: Django forms + serializers validate all input
- **SQL Injection Protection**: Django ORM parameterizes all queries

### 6.3 Data Security
- **Encryption at Rest**: Enable for databases (RDS/Cloud SQL), S3 (AES-256)
- **Encryption in Transit**: TLS for all HTTP, PostgreSQL, RabbitMQ connections
- **Backup Encryption**: Automated DB snapshots encrypted
- **Access Control**: IAM roles with least privilege (no root access)

### 6.4 Compliance
- **GDPR**: Implement data retention policies, user data export/delete APIs
- **Audit Logging**: Log all admin actions, role changes, sensitive data access
- **Vulnerability Scanning**: Trivy for container images, Dependabot for dependencies

---

## 7. Scalability & Performance

### 7.1 Auto-Scaling Policies

**Backend Services (ECS Fargate / Cloud Run):**
- CPU utilization > 70%: Scale out (+1 instance)
- CPU utilization < 30%: Scale in (-1 instance)
- Min instances: 2, Max instances: 10

**Celery Workers:**
- RabbitMQ queue depth > 100: Scale out (+1 worker)
- Queue depth < 10: Scale in (-1 worker)
- Min workers: 1, Max workers: 5

### 7.2 Database Optimization
- **Connection Pooling**: Use PgBouncer (100 connections per service)
- **Read Replicas**: Deploy read replicas for reporting queries (AMS assets listing)
- **Indexing**: Add indexes on frequently queried fields (ticket status, asset category)
- **Query Optimization**: Use `select_related` / `prefetch_related` in Django ORM

### 7.3 Caching Strategy
- **Redis**: Deploy ElastiCache/Memorystore for session storage, API response caching
- **CDN Caching**: Cache static assets (JS/CSS) for 1 year, frontend HTML for 1 hour
- **Database Query Caching**: Use Django's `cache_page` decorator for read-heavy views

### 7.4 Performance Targets
- API response time: < 200ms (P95)
- Ticket creation end-to-end: < 2 seconds
- Notification delivery: < 5 seconds (email), < 1 second (in-app)
- Frontend load time: < 2 seconds (LCP)

---

## 8. Cost Optimization

### 8.1 Compute
- Use **Spot Instances** (AWS) / **Preemptible VMs** (GCP) for Celery workers (up to 70% savings)
- Right-size containers (start with 1 vCPU, 2GB RAM, adjust based on metrics)
- Enable **Fargate Spot** for non-critical workloads

### 8.2 Database
- Start with **db.t3.medium** (2 vCPU, 4GB RAM), scale up if needed
- Use **Aurora Serverless v2** (AWS) or **Cloud SQL Enterprise Plus** (GCP) for auto-scaling
- Archive old tickets to S3/Glacier after 1 year (90% cheaper)

### 8.3 Storage
- Use **S3 Intelligent-Tiering** to auto-move infrequently accessed files to cheaper tiers
- Enable **lifecycle policies**: Archive to Glacier after 90 days, delete after 7 years

### 8.4 Networking
- Use **NAT Gateway alternatives** (NAT instance on t3.micro, or VPC endpoints for S3/SES)
- Enable **VPC Flow Logs** only for troubleshooting (expensive)

### 8.5 Monitoring Budget
- Set **billing alerts** at $500, $1000, $1500
- Review cost allocation tags monthly
- Delete unused resources (old snapshots, unattached volumes)

---

## 9. Disaster Recovery & Business Continuity

### 9.1 Recovery Objectives
- **RTO** (Recovery Time Objective): < 2 hours
- **RPO** (Recovery Point Objective): < 15 minutes

### 9.2 Backup Strategy
- **Databases**: Automated daily snapshots (35-day retention), cross-region replication
- **Media Files**: S3 versioning enabled, cross-region replication to secondary region
- **Configuration**: Store all IaC (Terraform/CloudFormation) in Git

### 9.3 Disaster Recovery Plan
1. **Automated Failover**: Deploy multi-region active-passive setup
2. **Manual Failover**: DNS update to point to secondary region (Route 53 failover routing)
3. **Recovery Steps**:
   - Promote read replica to primary (< 5 minutes)
   - Update application DB connection strings
   - Redeploy containers in secondary region
   - Switch DNS to secondary ALB/Load Balancer

### 9.4 Testing
- **Quarterly DR Drills**: Test failover to secondary region
- **Backup Restoration**: Monthly test restore of random DB snapshot

---

## 10. DevOps & CI/CD

### 10.1 Git Workflow
- **Branches**: `main` (production), `dev` (staging), feature branches
- **Pull Requests**: Require 1 approval, pass CI checks

### 10.2 CI/CD Pipeline (GitHub Actions / GitLab CI)

**Build Stage:**
1. Run unit tests (pytest for Django)
2. Lint code (flake8, eslint)
3. Build Docker images
4. Scan images for vulnerabilities (Trivy)
5. Push images to container registry (ECR/GCR)

**Deploy Stage (Staging):**
1. Deploy to staging environment (auto-deploy on merge to `dev`)
2. Run integration tests (Playwright, Postman)
3. Smoke tests (health check endpoints)

**Deploy Stage (Production):**
1. Manual approval required
2. Deploy to production (blue-green deployment)
3. Run smoke tests
4. Monitor error rates for 10 minutes
5. Auto-rollback if error rate > 5%

### 10.3 Infrastructure as Code
- **Terraform** (preferred) or **CloudFormation/Deployment Manager**
- Store state in S3/GCS with state locking (DynamoDB/Cloud Storage)
- Use workspaces for environments (dev, staging, prod)

---

## 11. Maintenance & Support

### 11.1 Monitoring Checklist
- [ ] API response time < 200ms
- [ ] Error rate < 1%
- [ ] Database CPU < 70%
- [ ] RabbitMQ queue depth < 50
- [ ] Disk usage < 80%
- [ ] SSL certificate expiry > 30 days

### 11.2 Alerting Rules
- **Critical**: Service down, database unreachable, queue depth > 1000
- **Warning**: CPU > 70%, error rate > 2%, disk > 80%
- **Info**: Deployment completed, backup successful

### 11.3 On-Call Rotation
- **Primary**: DevOps Engineer (24/7)
- **Secondary**: Backend Lead (escalation)
- **Escalation Path**: DevOps → Backend Lead → CTO (30 min SLA)

---

## 12. Next Steps

### Immediate Actions (Week 1)
1. [ ] Choose cloud provider (AWS/GCP/Azure)
2. [ ] Set up cloud account and billing alerts
3. [ ] Create IAM roles and service accounts
4. [ ] Provision VPC and networking

### Short-Term (Weeks 2-4)
1. [ ] Migrate databases to cloud (start with dev environment)
2. [ ] Deploy auth-service (foundational)
3. [ ] Set up CI/CD pipeline
4. [ ] Configure monitoring and logging

### Long-Term (Weeks 5-12)
1. [ ] Migrate all services to cloud
2. [ ] Implement auto-scaling policies
3. [ ] Conduct load testing
4. [ ] Go live with production workloads
5. [ ] Decommission legacy infrastructure

---

## Appendix

### A. Port Mapping Reference

| Service | Local Port | Cloud Port | Protocol |
|---------|-----------|------------|----------|
| Kong Proxy | 8080 | 80/443 | HTTP/HTTPS |
| Kong Admin | 8001 | N/A (disabled in prod) | HTTP |
| Auth Service | 8000/8003 | 8000 | HTTP |
| TTS Workflow API | 1001 | 8000 | HTTP |
| TTS Helpdesk | 5001 | 8000 | HTTP |
| TTS Messaging | 1002 | 8001 | HTTP/WebSocket |
| TTS Notification | 1003 | 8001 | HTTP |
| AMS Auth | 8001 | 8001 | HTTP |
| AMS Assets | 8002 | 8002 | HTTP |
| AMS Contexts | 8003 | 8003 | HTTP |
| BMS Auth | 8001 | 8001 | HTTP |
| BMS Budget | 8000 | 8000 | HTTP |
| PostgreSQL | 5432/5433/5434 | 5432 | TCP |
| RabbitMQ | 5672 | 5672 | AMQP |
| RabbitMQ UI | 15672 | N/A (VPN only) | HTTP |

### B. Environment Variables Checklist

**Critical for all services:**
- `DJANGO_ENV` (production)
- `DJANGO_SECRET_KEY` (unique per service)
- `DJANGO_JWT_SIGNING_KEY` (shared across all services)
- `DATABASE_URL` (PostgreSQL connection string)
- `DJANGO_CELERY_BROKER_URL` (RabbitMQ connection string)
- `DJANGO_ALLOWED_HOSTS` (domain names)
- `DJANGO_CORS_ALLOWED_ORIGINS` (frontend URLs)

**Service-specific:**
- `SENDGRID_API_KEY` (notification-service, auth-service)
- `DJANGO_AUTH_SERVICE_URL` (all services except auth)
- `RECAPTCHA_ENABLED` (auth-service only)

### C. Technology Stack Summary

| Component | Technology | Version |
|-----------|-----------|---------|
| Backend Framework | Django + Django REST Framework | 4.x |
| Frontend Framework | React | 18-19 |
| Build Tool | Vite | 6.x |
| API Gateway | Kong | 3.4-3.9 |
| Database | PostgreSQL | 15 |
| Message Broker | RabbitMQ | 3.13 |
| Task Queue | Celery | Latest |
| Container Runtime | Docker | Latest |
| Orchestration | Docker Compose (local), ECS/Cloud Run (cloud) | Latest |
| Email Service | SendGrid | API v3 |

### D. Contact & Support

| Role | Name | Email | Responsibilities |
|------|------|-------|------------------|
| DevOps Lead | TBD | devops@mapactive.tech | Infrastructure, deployments |
| Backend Lead | TBD | backend@mapactive.tech | Django services, APIs |
| Frontend Lead | TBD | frontend@mapactive.tech | React applications |
| Database Admin | TBD | dba@mapactive.tech | PostgreSQL, backups |
| Security Lead | TBD | security@mapactive.tech | IAM, compliance, audits |

---

**Document Version:** 1.0  
**Last Updated:** January 11, 2026  
**Author:** GitHub Copilot (AI Assistant)  
**Review Status:** Draft - Pending Technical Review
