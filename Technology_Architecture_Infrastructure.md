# 4.6 Technology Architecture & Infrastructure

## 4.6.1 Technology Stack Justification

### Frontend Technologies
**React with Vite**: The system employs React 18/19 for all frontend applications (TTS, AMS, HDTS, BMS, Auth), built using Vite as the build tool. 

**Justification for React**:
- **Component-Based Architecture**: React's component model enables reusable UI components across the multi-system platform, reducing development time and ensuring consistency.
- **Virtual DOM**: Efficient rendering and updates, crucial for dynamic ticket workflows, asset management interfaces, and real-time notifications.
- **Rich Ecosystem**: Extensive library support (Redux for state management in AMS, React Router for navigation, Chart.js for data visualization, React Flow for workflow diagrams).
- **Developer Experience**: Hot module replacement during development, TypeScript support, and strong community tooling.
- **Performance**: Client-side routing and lazy loading optimize user experience for complex SPAs.

**Justification for Vite**:
- **Fast Development Server**: Instant hot reloads during development, significantly improving developer productivity.
- **Optimized Production Builds**: Advanced bundling with tree-shaking, code splitting, and minification.
- **Modern ES Modules**: Native support for ES modules without complex configuration.
- **Plugin Ecosystem**: Integrates seamlessly with React and other tools.

### Backend Technologies
**Django with Django REST Framework (DRF)**: All backend services are built with Django 5.x and DRF.

**Justification for Django**:
- **Rapid Development**: Built-in admin interface, ORM, and authentication system accelerate development of complex business logic.
- **Security**: Comprehensive security features including CSRF protection, SQL injection prevention, and secure password handling.
- **Scalability**: Proven architecture for handling high loads, with async support via Celery.
- **Ecosystem**: Rich package ecosystem for email (SendGrid), file handling (Pillow), and API development.
- **Python**: Strong data processing capabilities, essential for workflow automation and reporting.

**Justification for PostgreSQL**:
- **ACID Compliance**: Ensures data integrity for financial data (BMS), asset tracking (AMS), and ticket workflows (TTS).
- **Advanced Features**: JSON fields for flexible data storage, full-text search, and complex queries.
- **Performance**: Excellent for read-heavy operations and complex joins required by the multi-system architecture.
- **Reliability**: Robust transaction handling and concurrent access management.

### Supporting Technologies
**Kong API Gateway**: Chosen for its lightweight, high-performance API management.

**Justification**:
- **Microservices Architecture**: Efficiently routes traffic to 15+ backend services.
- **Security**: JWT validation at the edge, rate limiting, and CORS handling.
- **Observability**: Request/response logging and monitoring capabilities.
- **Declarative Configuration**: YAML-based config management simplifies deployment.

**RabbitMQ**: Selected for reliable message queuing.

**Justification**:
- **AMQP Protocol**: Industry-standard for enterprise messaging.
- **Persistence**: Ensures message delivery even during service restarts.
- **Management UI**: Built-in monitoring and queue inspection.
- **Celery Integration**: Seamless integration with Django's async task system.

**Celery**: For distributed task processing.

**Justification**:
- **Asynchronous Processing**: Handles long-running tasks (email sending, workflow processing) without blocking APIs.
- **Scalability**: Worker pools can be scaled independently.
- **Reliability**: Automatic retries and error handling.

**SendGrid**: For email delivery.

**Justification**:
- **Transactional Email**: Reliable delivery for notifications, password resets, and system alerts.
- **API Integration**: Simple REST API integration with Django.
- **Analytics**: Delivery tracking and bounce handling.

## 4.6.2 Deployment Architecture

### Development Environment
- **Local Development**: Docker Compose orchestrates all services locally.
- **Service Isolation**: Each service runs in its own container with proper networking.
- **Hot Reloading**: Frontend applications use Vite's dev server for instant updates.
- **Database**: Single PostgreSQL instance with multiple databases for different systems.
- **Message Broker**: RabbitMQ for local async processing.
- **Email Testing**: Mailpit provides local email testing interface.

### Staging Environment
- **Infrastructure as Code**: Docker Compose configurations serve as IaC templates.
- **Environment Variables**: Separate configs for staging vs production.
- **Load Testing**: Validates performance before production deployment.
- **Data Seeding**: Automated seeding scripts for consistent test data.

### Production Environment (Digital Ocean)
- **Container Orchestration**: Services deployed as containers on Digital Ocean Droplets.
- **Process Management**: PM2 manages frontend Node.js processes for production builds.
- **Reverse Proxy**: Nginx handles SSL termination, load balancing, and routing to Kong/API Gateway.
- **Database**: Digital Ocean Managed PostgreSQL clusters for high availability.
- **File Storage**: Digital Ocean Spaces for media files and static assets.
- **Load Balancing**: Digital Ocean Load Balancers distribute traffic across multiple Droplets.
- **CDN**: Digital Ocean CDN for static frontend assets.

### Deployment Strategy
- **Blue-Green Deployment**: Zero-downtime deployments using load balancer switching.
- **Rolling Updates**: Services updated incrementally to maintain availability.
- **Health Checks**: Automated health monitoring ensures service reliability.
- **Backup Strategy**: Automated database backups with point-in-time recovery.

## 4.6.3 Network and Security Design

### Network Architecture

The MAP System implements a sophisticated multi-layered network architecture designed for security, scalability, and cross-system integration:

**Public Entry Points:**
- **Nginx Reverse Proxy**: Handles SSL termination, load balancing, and initial request routing
- **Kong API Gateway**: Internal routing, security enforcement, and API management
- **Frontend Applications**: Served via PM2 process manager with Vite development servers

**Internal Network:**
- **Docker Networking**: Service-to-service communication within containerized environment
- **Database Layer**: PostgreSQL with private networking, no direct external access
- **Message Broker**: RabbitMQ for async communication between services
- **File Storage**: Digital Ocean Spaces with presigned URLs for secure access

**Security Zones:**
- **DMZ (Demilitarized Zone)**: Nginx and Kong handle external traffic
- **Application Zone**: Backend services with controlled inter-service communication
- **Data Zone**: Databases and storage with strict access controls

### Authentication & Authorization Architecture

The system employs a hybrid authentication approach combining JWT tokens, cookies, and session-based authentication:

#### JWT Token Management
**Token Configuration (from Django settings):**
```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=5),  # Short-lived for security
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),   # Longer refresh period
    'ROTATE_REFRESH_TOKENS': True,                 # Security best practice
    'BLACKLIST_AFTER_ROTATION': True,              # Prevent token reuse
    'ALGORITHM': 'HS256',                          # Symmetric encryption
    'SIGNING_KEY': JWT_SIGNING_KEY,                # Shared across services
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'ISSUER': 'tts-jwt-issuer',                    # Kong validation
}
```

**Cookie-Based JWT Implementation:**
- **Access Token**: Stored in `access_token` cookie (non-HttpOnly for frontend access)
- **Refresh Token**: Stored in `refresh_token` cookie (HttpOnly for security)
- **Cookie Settings**: Configurable SameSite, Secure, and Domain policies

```python
# Cookie configuration logic
def get_cookie_settings():
    cookie_domain = getattr(settings, 'COOKIE_DOMAIN', 'localhost')
    use_secure = not settings.DEBUG
    
    if is_production_domain and use_secure:
        samesite = 'None'  # Cross-subdomain support
    else:
        samesite = 'Lax'   # Development default
    
    return {
        'domain': cookie_domain,
        'secure': use_secure,
        'samesite': samesite,
        'httponly': True,  # For refresh tokens
    }
```

#### Kong JWT Validation
**Kong Configuration:**
```yaml
jwt_secrets:
  - consumer: auth-service
    key: tts-jwt-issuer
    secret: "${KONG_JWT_SECRET:signing-key-1234}"
    algorithm: HS256

plugins:
  - name: jwt
    config:
      key_claim_name: iss
      claims_to_verify:
        - exp
      run_on_preflight: false
```

**Protected Routes:**
- `/api/auth/*` - User management
- `/api/workflow/*` - Ticket operations
- `/api/tickets/*` - Ticket management
- `/api/departments/*`, `/api/categories/*`, `/api/priorities/*`, `/api/statuses/*`

#### CORS (Cross-Origin Resource Sharing)
**Global CORS Configuration in Kong:**
```yaml
plugins:
  - name: cors
    config:
      origins:
        - "http://localhost:1000"    # TTS Frontend
        - "http://127.0.0.1:1000"
        - "http://localhost:5173"    # HDTS Frontend
        - "http://127.0.0.1:5173"
        - "https://*.mapactive.tech" # Production domains
      methods:
        - GET, POST, PUT, PATCH, DELETE, OPTIONS
      headers:
        - Authorization, Content-Type, X-Requested-With
      credentials: true
      max_age: 3600
```

**Django CORS Settings:**
```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:1000', 'http://127.0.0.1:1000',
    'http://localhost:5173', 'http://127.0.0.1:5173',
    'https://*.mapactive.tech'
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept', 'accept-encoding', 'authorization', 
    'content-type', 'dnt', 'origin', 'user-agent',
    'x-csrftoken', 'x-requested-with'
]
```

### Security Flow Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   End User      │    │   Nginx Reverse  │    │   Kong Gateway  │
│   Browser       │────│   Proxy (SSL)    │────│   (JWT Auth)    │
│                 │    │                  │    │                 │
│ • Cookies       │    │ • SSL Termination│    │ • JWT Validation│
│ • CORS Headers  │    │ • Load Balancing │    │ • Rate Limiting │
│ • HTTPS         │    │ • Request Routing│    │ • CORS Handling │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                           │                   │
         │                           │                   │
         ▼                           ▼                   ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Frontend Apps   │    │   Auth Service   │    │ Backend APIs    │
│ (React/Vite)    │    │   (Django)       │    │ (Django)        │
│                 │    │                  │    │                 │
│ • JWT from      │    │ • Token Issuance │    │ • JWT Trust     │
│   Cookies       │    │ • Cookie Mgmt    │    │ • Business Logic│
│ • API Calls     │    │ • Session Auth   │    │ • Data Access   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                           │                   │
         │                           │                   │
         ▼                           ▼                   ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │   RabbitMQ       │    │   Digital Ocean │
│   Databases     │    │   Message Queue  │    │   Spaces        │
│                 │    │                  │    │                 │
│ • Private       │    │ • Async Tasks    │    │ • Presigned URLs│
│   Network       │    │ • Celery Workers │    │ • Secure Access │
│ • No Direct     │    │ • Task Queues    │    │ • CDN Delivery  │
│   Access        │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Authentication Flow

1. **User Login Request:**
   - Frontend sends email/password to `/api/auth/login/`
   - Auth service validates credentials
   - Generates JWT tokens with custom claims (user_id, roles, systems)

2. **Token Distribution:**
   - Access token: `access_token` cookie (non-HttpOnly, 5min expiry)
   - Refresh token: `refresh_token` cookie (HttpOnly, 7 days expiry)
   - Cookies configured for cross-subdomain support in production

3. **API Request Flow:**
   - Frontend includes cookies in requests
   - Kong validates JWT signature and expiry
   - Backend services trust Kong validation
   - Custom middleware extracts user from JWT

4. **Token Refresh:**
   - Frontend calls `/api/auth/token/refresh/` when access token expires
   - Uses refresh token from HttpOnly cookie
   - Issues new access token with updated claims

### Security Measures

**Authentication & Authorization:**
- **JWT Tokens**: Stateless authentication with short-lived access tokens
- **Kong JWT Plugin**: Gateway-level token validation prevents unauthorized API access
- **Role-Based Access Control**: System-wide roles managed centrally
- **Session Management**: Secure cookies with HttpOnly, Secure, and SameSite flags

**API Security:**
- **CORS Configuration**: Restricted origins prevent cross-site request forgery
- **Rate Limiting**: Kong enforces 100 requests/minute globally
- **Input Validation**: DRF serializers prevent injection attacks
- **API Keys**: Service-to-service authentication for internal communications

**Data Protection:**
- **Encryption in Transit**: TLS 1.3 for all external communications
- **Encryption at Rest**: Managed PostgreSQL with automatic encryption
- **Secure Headers**: Django security middleware adds security headers
- **File Upload Security**: Type validation and secure storage URLs

**Infrastructure Security:**
- **Network Isolation**: Services in private networks, only load balancer exposed
- **Firewall Rules**: Restrictive security groups on Digital Ocean
- **Secret Management**: Environment variables for sensitive data
- **Monitoring**: Comprehensive logging and alerting for security events

**Additional Security Features:**
- **Two-Factor Authentication (2FA)**: OTP via email for enhanced security
- **reCAPTCHA Integration**: Bot protection on authentication forms
- **Password Security**: Argon2 hashing with complexity requirements
- **Account Lockout**: Progressive delays on failed login attempts
- **Audit Logging**: Comprehensive logging of authentication events

This multi-layered security architecture ensures comprehensive protection while maintaining usability and performance across the distributed MAP System.

## 4.6.4 Cloud Infrastructure (Digital Ocean Services)

### Compute Services
- **Droplets**: Virtual machines running containerized services.
  - **Standard Droplets**: For backend APIs and workers.
  - **CPU-Optimized**: For Celery workers processing heavy workflows.
- **Scaling**: Horizontal scaling using multiple Droplet instances behind load balancers.

### Database Services
- **Managed PostgreSQL**: Fully managed database clusters.
  - **High Availability**: Multi-node clusters with automatic failover.
  - **Automated Backups**: Daily backups with 7-day retention.
  - **Connection Pooling**: Optimized connection management.
  - **Monitoring**: Built-in performance monitoring and alerting.

### Storage Services
- **Spaces**: S3-compatible object storage.
  - **Media Files**: User uploads, ticket attachments, asset images.
  - **Static Assets**: Compiled frontend bundles served via CDN.
  - **Backup Storage**: Database backups and logs.

### Networking Services
- **Load Balancers**: Distribute traffic across Droplet instances.
  - **SSL Termination**: Handles HTTPS certificates.
  - **Health Checks**: Automatic removal of unhealthy instances.
  - **Session Persistence**: Sticky sessions for WebSocket connections.

- **CDN**: Global content delivery network.
  - **Static Asset Delivery**: Frontend applications and media files.
  - **Caching**: Reduces load on origin servers.
  - **DDoS Protection**: Built-in protection against attacks.

### Additional Services
- **DNS**: Digital Ocean DNS for domain management.
- **Monitoring**: Built-in monitoring and alerting.
- **Firewalls**: Network-level security controls.
- **Snapshots**: Server backups and disaster recovery.

### Cost Optimization
- **Reserved Instances**: For predictable workloads.
- **Auto-scaling**: Scale resources based on demand.
- **Storage Lifecycle**: Automatic archiving of old data.
- **CDN Caching**: Reduce bandwidth costs.

This architecture provides a scalable, secure, and maintainable foundation for the MAP System, leveraging Digital Ocean's managed services to minimize operational overhead while ensuring high availability and performance.</content>
<parameter name="filePath">/root/MAP-SYSTEM/Technology_Architecture_Infrastructure.md