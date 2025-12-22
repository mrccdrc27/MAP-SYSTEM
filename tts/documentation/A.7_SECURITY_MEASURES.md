# A.7 Security Measures

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Authentication Mechanisms](#authentication-mechanisms)
3. [Authorization and Access Control](#authorization-and-access-control)
4. [Data Encryption](#data-encryption)
5. [API Security](#api-security)
6. [Network Security](#network-security)
7. [Database Security](#database-security)
8. [Session Management](#session-management)
9. [Rate Limiting and DDoS Protection](#rate-limiting-and-ddos-protection)
10. [Security Headers](#security-headers)
11. [Audit Logging](#audit-logging)
12. [Compliance and Best Practices](#compliance-and-best-practices)
13. [Security Incident Response](#security-incident-response)

---

## Executive Summary

The Ticket Tracking System implements a comprehensive security architecture protecting user data, system resources, and API endpoints. The security model includes:

- **Authentication**: JWT-based tokens with refresh rotation
- **Authorization**: Role-Based Access Control (RBAC) with multi-system support
- **Encryption**: TLS/SSL in transit, Argon2 password hashing at rest
- **API Security**: API key validation, CORS restrictions, CSRF protection
- **Rate Limiting**: IP-based and device fingerprint-based brute force detection
- **Monitoring**: Comprehensive audit logging of all state changes
- **Compliance**: OWASP Top 10 prevention, GDPR-ready architecture

---

## Authentication Mechanisms

### JWT (JSON Web Token) Authentication

#### **Architecture**

```
Client                    Auth Service                 Protected Service
  │                            │                              │
  ├─ POST /api/token ────────→ │                              │
  │   (username/password)      │                              │
  │                       ┌─────────────────────┐              │
  │                       │ Validate credentials │              │
  │                       │ Hash password check  │              │
  │                       └─────────────────────┘              │
  │ ← ─ Access + Refresh Tokens ─ │                            │
  │                               │                            │
  ├─ GET /api/tickets ────────────────────────────────────────→│
  │   Authorization: Bearer <access_token>                    │
  │                                      ┌──────────────────┐ │
  │                                      │ Verify JWT token │ │
  │                                      │ Extract user_id  │ │
  │                                      └──────────────────┘ │
  │ ← ─ ─ ─ ─ ─ ─ Ticket Data ─ ─ ─ ─ ─ │
```

#### **Token Configuration**

Located in `auth/auth/settings.py`:

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': config('DJANGO_JWT_SIGNING_KEY', default=SECRET_KEY),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}
```

**Token Lifetime**:
- **Access Token**: 60 minutes (short-lived)
- **Refresh Token**: 7 days (long-lived)
- **Auto-rotation**: Refresh token rotated on each use
- **Blacklisting**: Old refresh tokens blacklisted after rotation

#### **Token Claims**

Access token payload:

```json
{
    "user_id": 123,
    "username": "john.doe",
    "email": "john@example.com",
    "iat": 1700000000,
    "exp": 1700003600,
    "token_type": "access"
}
```

#### **Token Verification Process**

```python
# Custom Cookie-Based JWT Authentication
class CookieJWTAuthentication(JWTAuthentication):
    def get_validated_token(self, raw_token):
        # Extract token from Authorization header or cookies
        # Validate token signature using SIGNING_KEY
        # Verify token hasn't expired
        # Return decoded token
        pass
```

**Verification Steps**:
1. Extract token from `Authorization: Bearer <token>` header
2. Decode using HS256 algorithm
3. Verify signature using `SIGNING_KEY`
4. Check token expiration time
5. Validate token type (access vs refresh)
6. Extract and validate `user_id` claim
7. Load user from database
8. Return authenticated request

#### **Token Refresh Flow**

```python
# POST /api/v1/token/refresh/
{
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

# Response
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Refresh Token Rotation**:
1. Client sends refresh token
2. Server validates refresh token
3. Server blacklists old refresh token
4. Server generates new access token
5. Server generates new refresh token
6. Client receives both tokens
7. Old refresh token becomes invalid

### Password Hashing

#### **Algorithm: Argon2**

Configuration in `auth/auth/settings.py`:

```python
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',  # Primary
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',  # Fallback
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]
```

**Argon2 Parameters**:
- **Algorithm**: Argon2id (resistant to GPU/ASIC attacks)
- **Memory**: 512 MB per hash
- **Time**: 2 iterations minimum
- **Parallelism**: 8 threads
- **Salt Length**: 16 bytes

**Why Argon2?**
- Memory-hard algorithm (expensive to brute force)
- Time-hard algorithm (slow by design)
- GPU-resistant (uses memory bandwidth effectively)
- Parallelism-aware (benefit from multiple cores)
- Newer than bcrypt/PBKDF2

#### **Password Storage Example**

```python
# Django User Model
class User(AbstractUser):
    # Password stored as:
    # argon2$argon2id$v=19$m=512,t=2,p=8$base64salt$base64hash
    password = models.CharField(max_length=128)
```

#### **Password Validation**

Django password validators enforce:

```python
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8}
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]
```

**Validation Rules**:
- Minimum 8 characters
- Not similar to username/email
- Not in common password list
- Not purely numeric

### Two-Factor Authentication (Planned)

CAPTCHA implementation for login protection:

```python
from django_simple_captcha.fields import CaptchaField

class LoginForm(forms.Form):
    username = forms.CharField()
    password = forms.CharField(widget=forms.PasswordInput)
    captcha = CaptchaField(required=False)  # Added after failed attempts
```

---

## Authorization and Access Control

### Role-Based Access Control (RBAC)

#### **Role Hierarchy**

The system supports two distinct role systems:

**System-Agnostic Roles** (Core Django):
- Superuser: Full system access
- Staff: Admin panel access

**System-Specific Roles** (Multi-tenant):
- Admin: System administrator
- Agent: Ticket handler
- Supervisor: Team lead (extensible)

#### **Data Models**

```python
# auth/roles/models.py
class Role(models.Model):
    system = ForeignKey('System', on_delete=models.CASCADE)
    name = CharField(max_length=100)
    description = TextField()
    is_custom = BooleanField(default=False)
    permissions = ManyToManyField('Permission')

# auth/system_roles/models.py
class UserSystemRole(models.Model):
    user = ForeignKey(User, on_delete=models.CASCADE, related_name='system_roles')
    system = ForeignKey(System, on_delete=models.CASCADE)
    role = ForeignKey(Role, on_delete=models.CASCADE)
    assigned_date = DateTimeField(auto_now_add=True)
```

#### **Permission Checking**

```python
# auth/permissions.py
class IsSystemAdminOrSuperUser(BasePermission):
    """
    Allow superusers or system admins to modify data
    """
    def has_permission(self, request, view):
        # Require authentication
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superusers always allowed
        if request.user.is_superuser:
            return True
        
        # Check if user is a system admin
        return self._is_system_admin(request.user)
    
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        
        admin_systems = self._get_user_admin_systems(request.user)
        
        # Restrict write operations for non-superusers
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            if isinstance(obj, Role) and not obj.is_custom:
                return False
        
        # Check if object belongs to user's administered system
        return hasattr(obj, 'system') and obj.system in admin_systems
```

#### **Permission Application in Views**

```python
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from auth.permissions import IsSystemAdminOrSuperUser

class RoleUpdateView(APIView):
    permission_classes = [IsAuthenticated, IsSystemAdminOrSuperUser]
    
    def put(self, request, pk):
        # Only superusers and system admins can update roles
        role = Role.objects.get(pk=pk)
        # ... update logic
```

### Multi-System Role Management

#### **System Isolation**

Each system is isolated in the database:

```
System A           System B           System C
├── Users         ├── Users         ├── Users
├── Roles         ├── Roles         ├── Roles
└── Permissions   └── Permissions   └── Permissions
```

Users can have different roles in different systems:

```
User: john@example.com
├── System: TTS (Ticket Tracking)
│   └── Role: Admin
├── System: AMS (Asset Management)
│   └── Role: Agent
└── System: HDTS (Help Desk)
    └── Role: Supervisor
```

#### **API Endpoints for Role Management**

```
POST   /api/v1/systems/                    # Create system
GET    /api/v1/systems/                    # List systems
GET    /api/v1/systems/{system_slug}/      # Retrieve system

POST   /api/v1/systems/{system_slug}/roles/          # Create role
GET    /api/v1/systems/{system_slug}/roles/          # List roles
PUT    /api/v1/systems/{system_slug}/roles/{pk}/     # Update role

POST   /api/v1/systems/{system_slug}/user-roles/     # Assign role to user
GET    /api/v1/systems/{system_slug}/user-roles/     # List user roles
```

### CORS and Cross-Origin Security

#### **CORS Configuration**

```python
# auth/auth/settings.py
CORS_ALLOWED_ORIGINS = config(
    'DJANGO_CORS_ALLOWED_ORIGINS',
    default='http://localhost:1000,http://127.0.0.1:1000',
    cast=lambda v: [s.strip() for s in v.split(',')]
)

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
```

**Configuration Explanation**:
- **CORS_ALLOW_CREDENTIALS**: Allows credentials (cookies, auth headers)
- **CORS_ALLOW_ORIGINS**: Whitelist of allowed origins
- **CORS_ALLOW_HEADERS**: Headers allowed in requests

#### **CORS Flow**

```
Browser Request (with credentials)
┌─────────────────────────────────────────┐
│ OPTIONS /api/tickets                    │
│ Origin: http://localhost:1000           │
└─────────────────────────────────────────┘
                    ↓
          Django CORS Middleware
          (Check origin against whitelist)
                    ↓
┌─────────────────────────────────────────┐
│ HTTP 200 OK                             │
│ Access-Control-Allow-Origin: ...        │
│ Access-Control-Allow-Credentials: true  │
└─────────────────────────────────────────┘
                    ↓
Browser sends actual request with credentials
```

### CSRF Protection

#### **CSRF Token Configuration**

```python
CSRF_COOKIE_SECURE = config(
    'DJANGO_CSRF_COOKIE_SECURE',
    default='False' if not IS_PRODUCTION else 'True',
    cast=lambda x: x.lower() in ('true', '1', 'yes')
)

CSRF_TRUSTED_ORIGINS = config(
    'DJANGO_CSRF_TRUSTED_ORIGINS',
    default='http://localhost:3000',
    cast=lambda v: [s.strip() for s in v.split(',')]
)
```

#### **CSRF Protection Flow**

```
1. Frontend retrieves CSRF token from /api/csrf-token/
2. Frontend stores token in memory
3. Frontend includes X-CSRFToken header in state-changing requests
4. Django middleware validates token
5. Request proceeds if valid, rejected if missing/invalid
```

#### **CSRF Implementation**

```python
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from rest_framework.decorators import api_view

@api_view(['GET'])
@ensure_csrf_cookie
def get_csrf_token(request):
    return Response({'detail': 'CSRF token set'})

@api_view(['POST'])
def create_ticket(request):
    # Django middleware automatically validates X-CSRFToken header
    # Request only succeeds if token matches
    # ...
```

---

## Data Encryption

### Encryption in Transit (TLS/SSL)

#### **HTTPS Configuration**

**Development** (HTTP allowed):
```python
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
```

**Production** (HTTPS required):
```python
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
```

**Railway Automatic HTTPS**:
- Railway provides automatic SSL certificates
- All services accessible via HTTPS
- Automatic HTTP → HTTPS redirect
- Certificate auto-renewal

#### **TLS 1.2+ Required**

```nginx
# Nginx configuration (if used as reverse proxy)
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
ssl_prefer_server_ciphers on;
```

### Encryption at Rest

#### **Database Password Hashing**

All passwords stored as Argon2 hashes (never plaintext):

```sql
-- Example: User password in database
SELECT id, username, password FROM auth_user LIMIT 1;

-- Output:
-- id | username | password
-- 1  | john     | argon2$argon2id$v=19$m=512,t=2,p=8$...
```

#### **Sensitive Data Fields**

Recommended encryption for:
- Social security numbers (if stored)
- Credit card numbers (avoid, use Stripe)
- API keys (use environment variables only)
- PHI/PII (consider field-level encryption)

#### **Django Field Encryption**

```python
# Example using django-encrypted-model-fields
from encrypted_model_fields.fields import EncryptedCharField

class SensitiveData(models.Model):
    ssn = EncryptedCharField(max_length=11)
    # Stored encrypted in database
    # Automatically decrypted on retrieval
```

#### **Media Files**

- Stored in `/app/media/` directory
- Should be served over HTTPS
- Consider adding ACL/authentication for sensitive files

---

## API Security

### Authentication Headers

#### **Token-Based Authentication**

```bash
# Authorization header format
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Example request
curl -H "Authorization: Bearer TOKEN" https://api.example.com/tickets
```

#### **Multiple Authentication Methods**

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'users.authentication.CookieJWTAuthentication',  # Cookie-based
        'rest_framework_simplejwt.authentication.JWTAuthentication',  # Header-based
        'rest_framework.authentication.SessionAuthentication',  # Session (fallback)
    ),
}
```

**Priority Order**:
1. Cookie-based JWT (from session)
2. Header-based JWT (Authorization header)
3. Session authentication (legacy)

### API Key Validation

#### **API Key Model**

```python
from rest_framework_api_key.models import APIKey

class APIKey(models.Model):
    name = CharField(max_length=50)
    key = CharField(max_length=40, unique=True)
    created = DateTimeField(auto_now_add=True)
    is_active = BooleanField(default=True)
```

#### **API Key Usage**

```bash
# Include in header
curl -H "Authorization: Api-Key your-api-key-here" https://api.example.com/tickets

# Include in query parameter (not recommended, less secure)
curl https://api.example.com/tickets?api_key=your-api-key-here
```

#### **API Key Validation in Views**

```python
from rest_framework_api_key.permissions import HasAPIKey

class TicketListView(APIView):
    permission_classes = [HasAPIKey]
    
    def get(self, request):
        # Only accessible with valid API key
        return Response(tickets)
```

### Rate Limiting

#### **IP-Based Rate Limiting**

Location: `auth/users/authentication.py`

```python
class IPAddressRateLimit(models.Model):
    ip_address = GenericIPAddressField(unique=True)
    failed_attempts = IntegerField(default=0)
    last_attempt = DateTimeField(auto_now=True)
    blocked_until = DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'ip_address_rate_limit'
```

**Rate Limit Thresholds**:
- **10 failed attempts** → 30-minute IP block
- **Automatic unblock** → After duration expires
- **Per-IP tracking** → Prevents account enumeration attacks

#### **Device Fingerprint-Based Rate Limiting**

```python
class DeviceFingerprint(models.Model):
    fingerprint_hash = CharField(max_length=64, unique=True)
    failed_attempts = IntegerField(default=0)
    requires_captcha = BooleanField(default=False)
    blocked_until = DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'device_fingerprint'
```

**Device Fingerprint Components**:
- User-Agent
- Accept-Language
- Accept-Encoding
- IP address (masked)

**CAPTCHA Triggers**:
- **5 failed attempts** → CAPTCHA required
- **8+ failed attempts** → 20-minute block
- **Automatic reset** → After 20 minutes

#### **Implementation Example**

```python
def check_rate_limit(request):
    ip = get_client_ip(request)
    
    # Check IP-based rate limit
    ip_limit = IPAddressRateLimit.objects.get_or_create(ip_address=ip)[0]
    if ip_limit.blocked_until and ip_limit.blocked_until > timezone.now():
        return {'blocked': True, 'reason': 'IP blocked'}
    
    # Check device fingerprint
    fingerprint = generate_device_fingerprint(request)
    device = DeviceFingerprint.objects.get_or_create(fingerprint_hash=fingerprint)[0]
    if device.requires_captcha:
        return {'blocked': False, 'requires_captcha': True}
    
    return {'blocked': False, 'requires_captcha': False}
```

### Request Validation

#### **Input Validation**

```python
from rest_framework import serializers

class TicketSerializer(serializers.ModelSerializer):
    title = serializers.CharField(
        max_length=200,
        min_length=1,
        required=True,
        allow_blank=False
    )
    description = serializers.CharField(
        max_length=5000,
        required=False,
        allow_blank=True
    )
    priority = serializers.ChoiceField(
        choices=['low', 'medium', 'high', 'critical'],
        required=True
    )
    
    def validate_title(self, value):
        if len(value.strip()) == 0:
            raise serializers.ValidationError("Title cannot be empty")
        return value
    
    def validate(self, data):
        # Cross-field validation
        if data.get('priority') == 'critical' and not data.get('description'):
            raise serializers.ValidationError({
                'description': 'Description required for critical tickets'
            })
        return data
```

#### **Output Filtering**

```python
class TicketDetailView(APIView):
    def get(self, request, pk):
        ticket = Ticket.objects.get(pk=pk)
        serializer = TicketDetailSerializer(ticket)
        
        # Automatically exclude sensitive fields
        # Only show fields user has permission to see
        return Response(serializer.data)
```

### Content Type Validation

```python
# Only allow JSON
REST_FRAMEWORK = {
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}
```

---

## Network Security

### Service-to-Service Communication

#### **Internal Service Calls**

```python
# ticket_service/tickets/views.py
import requests

class TicketWorkflowView(APIView):
    def post(self, request):
        ticket = Ticket.objects.create(**request.data)
        
        # Internal call to workflow service
        workflow_response = requests.post(
            'http://workflow-api:8000/api/v1/workflows/execute/',
            json={'ticket_id': ticket.id},
            headers={
                'Authorization': f'Bearer {self.get_service_token()}',
                'X-Service-Name': 'ticket-service'
            },
            timeout=30
        )
        
        return Response(workflow_response.json())
```

**Security Measures**:
- Uses service-to-service JWT tokens
- Includes service identifier header
- Validates response before processing
- Timeouts prevent hanging

#### **Service Authentication Tokens**

```python
# Generated for service-to-service calls
SERVICE_TOKENS = {
    'ticket-service': 'service_token_xxx',
    'workflow-api': 'service_token_yyy',
    'notification-service': 'service_token_zzz',
}
```

### Firewall Rules (Recommended)

```
# Allow from internet
- 443:8000/tcp (HTTPS to auth service)
- 443:8002/tcp (HTTPS to workflow-api)
- 443:8004/tcp (HTTPS to ticket service)

# Allow from load balancer
- 5672:5672/tcp (RabbitMQ AMQP)
- 15672:15672/tcp (RabbitMQ Management)

# Deny all other inbound
```

### VPC Configuration

For production deployment, use:
- Private subnets for services
- Public subnet only for load balancer
- Security groups limiting traffic
- Network ACLs for additional control

---

## Database Security

### Connection Security

#### **Connection String**

```
DATABASE_URL=postgres://user:password@host:5432/database
```

**Security Practices**:
- Never commit credentials to git
- Use environment variables
- Change default passwords immediately
- Use strong passwords (20+ characters)

#### **Connection Pooling**

```python
DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL'),
        conn_max_age=600,
        conn_health_checks=True,
    )
}
```

**Benefits**:
- Reuses connections (reduces overhead)
- Health checks prevent stale connections
- Connection limit prevents exhaustion

### SQL Injection Prevention

#### **ORM Protection**

Always use Django ORM, never raw SQL:

```python
# ✅ SAFE - Uses parameterized queries
tickets = Ticket.objects.filter(status='open')

# ❌ UNSAFE - SQL injection risk
tickets = Ticket.objects.raw(f"SELECT * FROM tickets WHERE status='{status}'")

# ✅ SAFE - If raw SQL required, use parameters
tickets = Ticket.objects.raw("SELECT * FROM tickets WHERE status=%s", [status])
```

#### **Query Parameterization Example**

```python
# Django ORM automatically parameterizes
query = "SELECT * FROM tickets WHERE title LIKE %s"
Ticket.objects.raw(query, [f'%{search_term}%'])

# Sent to database as:
# Prepared statement: "SELECT * FROM tickets WHERE title LIKE $1"
# Parameters: [user_input]  # User input completely separated
```

### Database User Permissions

```sql
-- Create service-specific database users (recommended)
CREATE USER ticket_service_user WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE ticketmanagement TO ticket_service_user;
GRANT USAGE ON SCHEMA public TO ticket_service_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ticket_service_user;

-- Current setup: Single user (acceptable for MVP)
CREATE USER postgres WITH SUPERUSER;
```

### Row-Level Security (Recommended)

```sql
-- Enable RLS on sensitive tables
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tickets
CREATE POLICY user_tickets ON tickets
    USING (assignee_id = current_user_id);
```

---

## Session Management

### Session Configuration

```python
# auth/auth/settings.py
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_AGE = 3600  # 1 hour
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = True  # HTTPS only in production
SESSION_COOKIE_SAMESITE = 'Strict'
```

**Configuration Explanation**:
- **DATABASE**: Sessions stored in database (survives restarts)
- **AGE**: Session expires after 1 hour
- **HTTPONLY**: Not accessible via JavaScript (prevents XSS theft)
- **SECURE**: Only sent over HTTPS
- **SAMESITE**: Protects against CSRF attacks

### Token Blacklisting

```python
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        refresh_token = request.data.get('refresh')
        
        # Add token to blacklist
        token = RefreshToken(refresh_token)
        token.blacklist()  # Blacklist refresh token
        
        return Response({'detail': 'Successfully logged out'})
```

**Blacklist Implementation**:
- Refresh tokens added to blacklist table on logout
- Tokens checked against blacklist during refresh
- Old refresh tokens cannot be reused

### Session Fixation Prevention

```python
# Automatic in Django
# Session ID regenerated on login
# Old session ID invalidated
```

---

## Rate Limiting and DDoS Protection

### DDoS Mitigation Strategy

#### **Layer 1: Network Level**

- Railway provides DDoS protection
- Automatic attack detection
- Traffic rate limiting at edge

#### **Layer 2: Application Level**

IP-based rate limiting (implemented):

```python
# Block after 10 failed login attempts for 30 minutes
if failed_attempts >= 10:
    block_until = timezone.now() + timedelta(minutes=30)
    return {'blocked': True, 'try_again_after': '30 minutes'}
```

#### **Layer 3: Database Level**

```sql
-- Monitor database connections
SELECT * FROM pg_stat_activity;

-- Kill excessive connections if needed
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
    WHERE usename = 'attacker_ip';
```

### Recommended DDoS Services

- **Cloudflare**: Free tier with basic DDoS protection
- **AWS Shield Standard**: Included, automatic
- **AWS WAF**: Web application firewall rules

### Request Throttling

Recommended implementation:

```python
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle

class BurstRateThrottle(UserRateThrottle):
    scope = 'burst'

class SustainedRateThrottle(UserRateThrottle):
    scope = 'sustained'

REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',  # Unauthenticated users
        'user': '1000/hour'  # Authenticated users
    }
}
```

---

## Security Headers

### Response Headers

```python
# Recommended middleware additions
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_SECURITY_POLICY = {
    'default-src': ("'self'",),
    'script-src': ("'self'", "'unsafe-inline'"),
    'style-src': ("'self'", "'unsafe-inline'"),
}
```

### HTTP Headers Checklist

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | max-age=31536000; includeSubDomains | Force HTTPS |
| `X-Content-Type-Options` | nosniff | Prevent MIME sniffing |
| `X-Frame-Options` | DENY | Prevent clickjacking |
| `X-XSS-Protection` | 1; mode=block | XSS protection (legacy) |
| `Content-Security-Policy` | default-src 'self' | Prevent XSS, injection |
| `Referrer-Policy` | strict-origin-when-cross-origin | Control referrer |
| `Permissions-Policy` | geolocation=(), microphone=() | Control browser features |

---

## Audit Logging

### Audit Log Model

Location: `workflow_api/audit/models.py`

```python
class AuditLog(models.Model):
    ACTIONS = [
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('READ', 'Read'),
        ('ASSIGN', 'Assign'),
    ]
    
    timestamp = DateTimeField(auto_now_add=True)
    user = ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = CharField(max_length=20, choices=ACTIONS)
    model_name = CharField(max_length=100)
    object_id = IntegerField()
    changes = JSONField(default=dict)  # What changed
    ip_address = GenericIPAddressField()
    user_agent = TextField()
    status = CharField(max_length=20, choices=[('SUCCESS', 'Success'), ('FAILED', 'Failed')])
```

### Audit Logging Implementation

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from audit.models import AuditLog

def log_action(user, action, model_name, object_id, changes, request):
    AuditLog.objects.create(
        user=user,
        action=action,
        model_name=model_name,
        object_id=object_id,
        changes=changes,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        status='SUCCESS'
    )

class TicketUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    
    def put(self, request, pk):
        ticket = Ticket.objects.get(pk=pk)
        old_data = model_to_dict(ticket)
        
        # Update ticket
        for key, value in request.data.items():
            setattr(ticket, key, value)
        ticket.save()
        
        new_data = model_to_dict(ticket)
        changes = {k: (old_data.get(k), new_data.get(k)) 
                  for k in new_data if old_data.get(k) != new_data.get(k)}
        
        # Log the change
        log_action(request.user, 'UPDATE', 'Ticket', pk, changes, request)
        
        return Response(TicketSerializer(ticket).data)
```

### Audit Log Queries

```python
# View changes made by user
AuditLog.objects.filter(user=request.user).order_by('-timestamp')

# View all changes to specific object
AuditLog.objects.filter(model_name='Ticket', object_id=123).order_by('-timestamp')

# View all login attempts
AuditLog.objects.filter(action='LOGIN').order_by('-timestamp')

# Export audit logs for compliance
logs = AuditLog.objects.all()
# Convert to CSV/JSON for archival
```

---

## Compliance and Best Practices

### OWASP Top 10 Protection

| Vulnerability | Implementation |
|---|---|
| A1: Injection | ORM parameterized queries, input validation |
| A2: Authentication | JWT tokens, password hashing (Argon2) |
| A3: Sensitive Data | TLS/SSL, encryption at rest, no hardcoded secrets |
| A4: XML External Entities | No XML parsing required |
| A5: Broken Access Control | RBAC, permission checks, audit logging |
| A6: Security Misconfiguration | Environment-based config, no defaults in prod |
| A7: XSS | HTTPOnly cookies, CSRF tokens, output encoding |
| A8: Insecure Deserialization | JSON only, no pickle, no unsafe eval |
| A9: Using Components with Known Vulnerabilities | Regular dependency updates, Dependabot |
| A10: Insufficient Logging | Comprehensive audit logging, Sentry monitoring |

### GDPR Compliance (if applicable)

**Data Subject Rights**:
1. Right to access (data export)
2. Right to rectification (update data)
3. Right to erasure (delete data)
4. Right to restrict processing
5. Right to data portability

**Implementation**:
```python
class UserDataExportView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Export user's personal data
        user = request.user
        data = {
            'profile': UserSerializer(user).data,
            'tickets': TicketSerializer(user.tickets.all(), many=True).data,
            'audit_logs': AuditLogSerializer(
                AuditLog.objects.filter(user=user), 
                many=True
            ).data,
        }
        return Response(data)

class UserDeleteView(APIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request):
        # Delete user and all associated data
        user = request.user
        # Delete related objects (cascade)
        user.delete()
        return Response({'detail': 'User deleted successfully'})
```

### Security Best Practices Checklist

- [x] All passwords hashed (Argon2)
- [x] HTTPS enforced in production
- [x] CSRF tokens enabled
- [x] SQL injection prevented (ORM)
- [x] XSS prevention (HTTPOnly cookies)
- [x] Rate limiting implemented
- [x] Audit logging enabled
- [x] API authentication required
- [x] CORS properly configured
- [x] Secrets in environment variables
- [x] Dependencies regularly updated
- [x] Security headers configured
- [ ] Automated security scanning (SAST)
- [ ] Penetration testing (annual)
- [ ] Incident response plan
- [ ] Data backup and recovery tested

---

## Security Incident Response

### Incident Response Plan

#### **Phase 1: Detection**

- Sentry error tracking
- Audit log monitoring
- Intrusion detection alerts
- User reports

#### **Phase 2: Containment**

```python
# Immediate actions
1. Disable compromised accounts
2. Rotate API keys
3. Block suspicious IP addresses
4. Review recent access logs

# Implementation
from users.models import User

def lock_account(username):
    user = User.objects.get(username=username)
    user.is_active = False
    user.save()
    # Log the action
    log_action(None, 'SECURITY_LOCK', 'User', user.id, 
               {'reason': 'suspected compromise'}, request)
```

#### **Phase 3: Investigation**

```bash
# Check recent API calls
docker logs <container_name> | tail -1000

# Query audit logs
SELECT * FROM audit_log WHERE timestamp > now() - interval 1 hour;

# Check database connections
SELECT * FROM pg_stat_activity;

# Analyze failed login attempts
SELECT ip_address, COUNT(*) as attempts 
FROM ip_address_rate_limit 
GROUP BY ip_address 
ORDER BY attempts DESC;
```

#### **Phase 4: Recovery**

```bash
# Restore from backup (if needed)
# 1. Stop application
docker-compose down

# 2. Restore database
pg_restore -d <database> backup.sql

# 3. Verify integrity
python manage.py check --deploy

# 4. Restart services
docker-compose up -d
```

#### **Phase 5: Post-Incident**

- Conduct post-mortem
- Update security policies
- Implement preventive measures
- Notify affected users
- Document lessons learned

### Security Contacts

- **Security Team Lead**: [contact]
- **Database Administrator**: [contact]
- **DevOps Engineer**: [contact]
- **Incident Commander**: [contact]
- **Legal/Compliance**: [contact]

---

## Conclusion

The Ticket Tracking System implements defense-in-depth security across all layers:

1. **Application Layer**: Authentication, authorization, input validation
2. **Transport Layer**: TLS/SSL encryption
3. **Database Layer**: Parameterized queries, hashed passwords
4. **Network Layer**: CORS restrictions, rate limiting
5. **Monitoring Layer**: Audit logging, error tracking

Regular security reviews, dependency updates, and incident response drills ensure the system remains secure against emerging threats.

---

## References

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Django Security: https://docs.djangoproject.com/en/5.2/topics/security/
- JWT Best Practices: https://tools.ietf.org/html/rfc8725
- Argon2 Specifications: https://github.com/P-H-C/phc-winner-argon2
- GDPR Compliance: https://gdpr-info.eu/
- Railway Security: https://docs.railway.app/reference/security
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
