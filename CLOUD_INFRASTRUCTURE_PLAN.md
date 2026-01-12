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
