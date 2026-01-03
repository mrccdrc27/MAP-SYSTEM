---
title: API Keys & Service Authentication
sidebar_label: API Keys
sidebar_position: 5
---

# API Keys & Service Authentication

The Auth Service provides API key management for secure service-to-service communication.

## Use Cases

| Scenario | Authentication Method |
|----------|----------------------|
| User → System | JWT tokens (via cookies/header) |
| System → Auth (on behalf of user) | JWT token forwarding |
| System → Auth (service call) | API key |
| Background worker → Auth | API key |

## API Key Model

```python
class APIKey(models.Model):
    name = models.CharField(max_length=100)      # Descriptive name
    key = models.CharField(max_length=40)        # 40-char secure token
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

Keys are auto-generated using `secrets.token_hex(20)` for cryptographic security.

## Creating API Keys

### Via Django Admin

1. Access `/admin/`
2. Navigate to Keys → API Keys
3. Click "Add API Key"
4. Enter a descriptive name (e.g., "TTS-Production")
5. Key is auto-generated on save

### Via Management Command

```bash
python manage.py shell
>>> from keys.models import APIKey
>>> key = APIKey.objects.create(name="TTS-Backend")
>>> print(key.key)  # Save this securely!
```

## Using API Keys

### Request Header

```bash
curl -X GET https://auth.example.com/api/v1/users/internal/123/ \
  -H "X-API-Key: your-40-character-api-key"
```

### In Python (requests)

```python
import requests

API_KEY = "your-40-character-api-key"
AUTH_SERVICE_URL = "http://auth-service:8000"

response = requests.get(
    f"{AUTH_SERVICE_URL}/api/v1/users/internal/123/",
    headers={"X-API-Key": API_KEY}
)
```

## Internal Endpoints

These endpoints accept API key authentication for service-to-service calls:

| Endpoint | Purpose |
|----------|---------|
| `/api/v1/users/internal/<id>/` | Get user details without user auth |
| `/api/v1/hdts/employees/internal/<id>/` | Get employee details |
| `/api/v1/tts/users-info/` | Batch user lookup |

## JWT Token Forwarding

For endpoints that require user context, forward the user's JWT:

```python
def call_auth_service(request, user_id):
    # Forward user's token to maintain auth context
    access_token = request.COOKIES.get('access_token')
    
    response = requests.get(
        f"{AUTH_SERVICE_URL}/api/v1/users/{user_id}/",
        cookies={"access_token": access_token}
    )
    return response.json()
```

## Security Best Practices

### Key Storage

```python
# ❌ Don't hardcode in source
API_KEY = "abc123..."

# ✅ Use environment variables
import os
API_KEY = os.environ.get("AUTH_API_KEY")
```

### Key Rotation

1. Create new key with descriptive name (e.g., "TTS-Prod-2024-Q1")
2. Update consuming services to use new key
3. Verify all services using new key
4. Deactivate old key (`is_active = False`)
5. Delete old key after confirmation period

### Monitoring

Log API key usage for auditing:

```python
import logging
logger = logging.getLogger('api_keys')

def authenticate_api_key(request):
    key = request.headers.get('X-API-Key')
    api_key = APIKey.objects.filter(key=key, is_active=True).first()
    
    if api_key:
        logger.info(f"API Key used: {api_key.name}")
        return True
    
    logger.warning(f"Invalid API key attempt from {request.META.get('REMOTE_ADDR')}")
    return False
```

## Configuration

In downstream services, configure the API key:

```bash
# .env
AUTH_SERVICE_URL=http://auth-service:8000
AUTH_API_KEY=your-40-character-api-key
```

```python
# settings.py
from decouple import config

AUTH_SERVICE_URL = config('AUTH_SERVICE_URL', default='http://localhost:8000')
AUTH_API_KEY = config('AUTH_API_KEY', default='')
```
