# 4.6.3 Network and Security Design

## Overview
The MAP System implements a comprehensive network and security architecture designed to protect a multi-tenant platform with sensitive data across multiple business systems. The design follows zero-trust principles with defense-in-depth, combining network segmentation, authentication, authorization, and continuous monitoring.

## Network Architecture

### Multi-Layered Network Design

**Public Entry Points:**
- **Digital Ocean Load Balancer**: Initial traffic entry point with SSL termination
- **Nginx Reverse Proxy**: Advanced routing, caching, and request filtering
- **Kong API Gateway**: Application-level routing and security enforcement

**Internal Network Zones:**
- **DMZ (Demilitarized Zone)**: Load balancers and API gateway handle external traffic
- **Application Zone**: Backend services with controlled inter-service communication
- **Data Zone**: Database clusters with strict access controls and encryption
- **Storage Zone**: File storage with presigned URL access patterns

**Network Security Controls:**
- **Firewall Rules**: Digital Ocean cloud firewalls restrict inbound/outbound traffic
- **VPC Isolation**: Private networking between services and databases
- **Security Groups**: Service-level network access controls
- **Network ACLs**: Subnet-level traffic filtering

### Service Communication Patterns

**External Communication:**
```
Internet → Load Balancer → Nginx → Kong → Backend Services
```

**Internal Communication:**
```
Service A → Kong (Internal) → Service B
Database → Private Network → Application Services
```

**Asynchronous Communication:**
```
Services → RabbitMQ → Celery Workers
```

## Authentication & Authorization Architecture

### JWT-Based Authentication System

**Token Architecture:**
- **Access Tokens**: Short-lived (5 minutes) for API authentication
- **Refresh Tokens**: Long-lived (7 days) stored in HttpOnly cookies
- **Token Rotation**: Automatic rotation on refresh with blacklisting
- **Shared Secret**: Single JWT signing key across all services

**Token Configuration:**
```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=5),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': JWT_SIGNING_KEY,
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'ISSUER': 'tts-jwt-issuer',
}
```

### Kong JWT Validation

**Gateway-Level Authentication:**
- **JWT Plugin**: Validates tokens at network edge before reaching services
- **Issuer Verification**: Ensures tokens come from trusted auth service
- **Expiration Checks**: Automatic rejection of expired tokens
- **Claim Extraction**: User information passed to downstream services

**Kong Configuration:**
```yaml
jwt_secrets:
  - consumer: auth-service
    key: tts-jwt-issuer
    secret: "${KONG_JWT_SECRET}"
    algorithm: HS256

plugins:
  - name: jwt
    config:
      key_claim_name: iss
      claims_to_verify: [exp]
      run_on_preflight: false
```

### Cookie-Based Token Management

**Secure Cookie Configuration:**
- **Access Token**: Non-HttpOnly (frontend access needed)
- **Refresh Token**: HttpOnly (prevents XSS access)
- **SameSite Policy**: Lax for development, None for production cross-domain
- **Secure Flag**: HTTPS-only in production
- **Domain Settings**: Configurable for multi-domain support

**Cookie Settings Logic:**
```python
def get_cookie_settings():
    cookie_domain = settings.COOKIE_DOMAIN
    use_secure = not settings.DEBUG
    
    if production_domain and use_secure:
        samesite = 'None'
    else:
        samesite = 'Lax'
    
    return {
        'domain': cookie_domain,
        'secure': use_secure,
        'samesite': samesite,
        'httponly': True,  # Refresh tokens only
    }
```

## Frontend Authentication Flow

### AuthContext Architecture

**Centralized Auth Management:**
- **React Context**: Global authentication state across the application
- **Token Storage**: Secure localStorage for access tokens
- **Automatic Refresh**: Background token renewal every 10 minutes
- **Profile Caching**: User data cached with role information

**AuthContext Structure:**
```jsx
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  
  // Auth methods: login, logout, verifyToken, fetchUserProfile
  // Role checking: isAdmin, isOperator, hasSystemAccess
};
```

### Authentication Flow Sequence

**1. Application Initialization:**
```
App Load → AuthContext Init → Check Local Token → Verify with Auth Service → Fetch User Profile → Set Auth State
```

**2. Login Process:**
```
User Input → AuthContext.login() → POST /api/v1/token/obtain/ → Receive Tokens → Store Access Token → Verify Auth Status → Fetch Full Profile → Update Context
```

**3. API Request Authorization:**
```
Component Action → API Call → Axios Interceptor → Attach Bearer Token → Kong Validation → Service Processing → Response
```

**4. Token Refresh:**
```
Background Timer (10min) → POST /api/v1/token/refresh/ → Update Access Token → Continue Normal Operation
```

**5. Logout Process:**
```
User Logout → AuthContext.logout() → POST /api/v1/users/logout/ → Clear Local Storage → Redirect to Login
```

## Service-to-Service Authentication

### Internal API Communication

**Kong Internal Routing:**
- **Service Trust**: Backend services trust Kong's JWT validation
- **Header Forwarding**: User claims passed via headers
- **Internal Endpoints**: Direct service communication for microservice calls

**Cross-Service Authentication:**
```
Frontend → Kong → Auth Service (JWT Validated)
Workflow Service → Kong Internal → Notification Service
```

### API Key Management

**Service Authentication:**
- **REST API Keys**: For external integrations and service accounts
- **Key Rotation**: Automatic key cycling with grace periods
- **Scope Limitation**: Keys restricted to specific operations

## CORS (Cross-Origin Resource Sharing)

### Global CORS Configuration

**Kong-Level CORS:**
```yaml
plugins:
  - name: cors
    config:
      origins:
        - "http://localhost:1000"    # TTS Frontend
        - "http://localhost:5173"    # HDTS Frontend
        - "https://*.mapactive.tech" # Production domains
      methods: [GET, POST, PUT, PATCH, DELETE, OPTIONS]
      headers: [Authorization, Content-Type, X-Requested-With]
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

## Security Measures

### Authentication Security

**Password Security:**
- **Argon2 Hashing**: Memory-hard function resistant to brute force
- **Complexity Requirements**: Minimum length, character variety
- **Password History**: Prevention of recently used passwords

**Multi-Factor Authentication (2FA):**
- **Email OTP**: Time-based one-time passwords via email
- **Backup Codes**: Emergency access codes
- **Device Trust**: Remembered devices for reduced friction

**Account Protection:**
- **Progressive Delays**: Increasing lockout times for failed attempts
- **Account Lockout**: Temporary suspension after multiple failures
- **Suspicious Activity**: Detection of unusual login patterns

### API Security

**Request Validation:**
- **Input Sanitization**: DRF serializers prevent injection attacks
- **Rate Limiting**: Kong enforces request limits (100/minute globally)
- **Request Size Limits**: Prevention of oversized payload attacks

**Response Security:**
- **Content-Type Validation**: Strict content-type enforcement
- **Security Headers**: Django security middleware adds protection headers
- **Error Handling**: Generic error messages prevent information leakage

### Data Protection

**Encryption in Transit:**
- **TLS 1.3**: End-to-end encryption for all external communications
- **Certificate Management**: Automatic renewal via Let's Encrypt
- **HSTS Headers**: Strict transport security enforcement

**Encryption at Rest:**
- **Database Encryption**: Managed PostgreSQL with AES-256 encryption
- **File Storage**: Digital Ocean Spaces with server-side encryption
- **Backup Encryption**: Encrypted backup storage and transmission

**Data Handling:**
- **PII Protection**: Sensitive data masked in logs and responses
- **Data Retention**: Automatic cleanup of temporary and expired data
- **Audit Logging**: Comprehensive logging of data access and modifications

## Authorization Architecture

### Role-Based Access Control (RBAC)

**System-Level Roles:**
- **Multi-System Support**: Users can have different roles across systems
- **Role Inheritance**: Hierarchical permissions within systems
- **Dynamic Assignment**: Runtime role checking and enforcement

**Permission Structure:**
```
User → System Roles → Permissions → Resource Access
```

**Role Examples:**
- **TTS**: Admin, Manager, Agent, User
- **AMS**: Admin, Operator, Viewer
- **HDTS**: Admin, Technician, User
- **BMS**: Admin, Finance, Approver

### API Authorization

**Endpoint Protection:**
- **View-Level Permissions**: DRF permission classes
- **Object-Level Permissions**: Row-level security for data access
- **Custom Permissions**: Business logic-based access control

**Middleware Enforcement:**
- **JWT Middleware**: Extracts user from tokens
- **Permission Middleware**: Validates access before view execution
- **Audit Middleware**: Logs all access attempts

## Monitoring & Incident Response

### Security Monitoring

**Log Aggregation:**
- **Centralized Logging**: ELK stack for security event correlation
- **Real-time Alerts**: Automated alerts for suspicious activities
- **Log Retention**: 90-day retention for security investigations

**Intrusion Detection:**
- **Pattern Matching**: Detection of common attack patterns
- **Anomaly Detection**: Machine learning-based threat identification
- **Automated Response**: IP blocking and rate limit increases

### Incident Response

**Response Procedures:**
- **Alert Triage**: 15-minute initial response for high-priority alerts
- **Containment**: Immediate isolation of compromised systems
- **Investigation**: Forensic analysis with timeline reconstruction
- **Recovery**: System restoration with security enhancements

**Communication:**
- **Stakeholder Notification**: Automated alerts to security team
- **Status Updates**: Regular progress reports during incidents
- **Post-Mortem**: Detailed analysis and prevention recommendations

## Compliance & Governance

### Security Standards

**Framework Alignment:**
- **OWASP Top 10**: Protection against web application vulnerabilities
- **NIST Cybersecurity Framework**: Risk management and security controls
- **GDPR Compliance**: Data protection and privacy regulations

**Regular Assessments:**
- **Vulnerability Scanning**: Weekly automated scans
- **Penetration Testing**: Quarterly external assessments
- **Code Reviews**: Security-focused review of all changes

### Access Governance

**Principle of Least Privilege:**
- **Minimal Access**: Users granted only necessary permissions
- **Just-in-Time Access**: Temporary privilege elevation for maintenance
- **Regular Reviews**: Quarterly access entitlement reviews

**Identity Management:**
- **Centralized Directory**: Single source of user identity
- **Automated Provisioning**: Self-service account creation
- **Lifecycle Management**: Automatic account deactivation

This comprehensive security architecture ensures the MAP System maintains the highest standards of data protection, user privacy, and system integrity while supporting the complex access patterns of a multi-tenant, multi-system platform.