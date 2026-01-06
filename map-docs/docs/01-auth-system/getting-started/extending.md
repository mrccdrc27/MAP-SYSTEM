---
title: Extending the Service
sidebar_label: Extending
sidebar_position: 7
---

# Extending the Auth Service

Guide for adding new systems, roles, middleware, and custom features.

## Adding a New System Integration

When onboarding a new downstream service (e.g., "Inventory Management System"):

### 1. Register the System

```bash
python manage.py shell
```

```python
from systems.models import System

ims = System.objects.create(
    name='Inventory Management System',
    slug='IMS',
    description='Track inventory and stock levels',
    is_active=True
)
print(f'Created: {ims}')
```

### 2. Create System Roles

```python
from roles.models import Role

roles = [
    {'name': 'Admin', 'description': 'Full IMS access'},
    {'name': 'Manager', 'description': 'Manage inventory'},
    {'name': 'Viewer', 'description': 'View-only access'},
]

for role_data in roles:
    Role.objects.create(
        system=ims,
        name=role_data['name'],
        description=role_data['description']
    )
```

### 3. Create System Admin User

```python
from users.models import User
from system_roles.models import UserSystemRole

# Create admin user
admin = User.objects.create_user(
    email='adminIMS@example.com',
    password='admin',
    first_name='IMS',
    last_name='Admin'
)
admin.status = 'Approved'
admin.save()

# Assign admin role
admin_role = Role.objects.get(system=ims, name='Admin')
UserSystemRole.objects.create(
    user=admin,
    system=ims,
    role=admin_role,
    is_active=True
)
```

### 4. Add to Seeder

Create or update `auth/systems/management/commands/seed_systems.py`:

```python
# Add to SYSTEMS list
SYSTEMS = [
    # ... existing systems ...
    {
        'name': 'Inventory Management System',
        'slug': 'IMS',
        'description': 'Track inventory and stock levels',
    },
]
```

### 5. Create API Endpoints (Optional)

If the new system needs custom endpoints, create a new Django app:

```bash
python manage.py startapp ims
```

Register in `auth/settings.py`:

```python
INSTALLED_APPS = [
    # ...
    'ims',
]
```

Add URL patterns in `auth/urls.py`:

```python
urlpatterns = [
    # ...
    path('api/v1/ims/', include('ims.urls')),
]
```

---

## Adding a New Role Type

### 1. Define the Role

```python
from systems.models import System
from roles.models import Role

tts = System.objects.get(slug='TTS')

Role.objects.create(
    system=tts,
    name='Auditor',
    description='Read-only access for audit purposes',
    is_custom=False  # System-defined role
)
```

### 2. Create Permission Class (Optional)

If the role needs custom permission logic:

```python
# auth/permissions.py

class IsAuditor(BasePermission):
    """
    Allows access only to users with Auditor role.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        system_slug = getattr(view, 'system_slug', None)
        if not system_slug:
            return False
        
        return UserSystemRole.objects.filter(
            user=request.user,
            system__slug=system_slug,
            role__name='Auditor',
            is_active=True
        ).exists()
```

### 3. Apply to Views

```python
from auth.permissions import IsAuditor

class AuditReportView(APIView):
    permission_classes = [IsAuthenticated, IsAuditor]
    system_slug = 'TTS'
    
    def get(self, request):
        # Auditor-only logic
        pass
```

---

## Creating Custom Middleware

### 1. Create Middleware Class

Create `auth/middleware/custom_middleware.py`:

```python
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware:
    """
    Log all incoming requests with timing information.
    """
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Before request
        start_time = timezone.now()
        
        # Process request
        response = self.get_response(request)
        
        # After request
        duration = (timezone.now() - start_time).total_seconds()
        logger.info(
            f'{request.method} {request.path} '
            f'- {response.status_code} '
            f'- {duration:.3f}s'
        )
        
        return response
```

### 2. Register Middleware

Add to `auth/settings.py`:

```python
MIDDLEWARE = [
    # ... existing middleware ...
    'auth.middleware.custom_middleware.RequestLoggingMiddleware',
]
```

### 3. Example: System Context Middleware

Inject current system into request based on header:

```python
class SystemContextMiddleware:
    """
    Add system context to request based on X-System-Slug header.
    """
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        system_slug = request.headers.get('X-System-Slug')
        
        if system_slug:
            try:
                from systems.models import System
                request.current_system = System.objects.get(
                    slug=system_slug,
                    is_active=True
                )
            except System.DoesNotExist:
                request.current_system = None
        else:
            request.current_system = None
        
        return self.get_response(request)
```

---

## Adding Custom User Fields

### 1. Add Field to Model

Edit `users/models.py`:

```python
class User(AbstractBaseUser, PermissionsMixin):
    # ... existing fields ...
    
    # New field
    department = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )
```

### 2. Create and Run Migration

```bash
python manage.py makemigrations users
python manage.py migrate
```

### 3. Update Serializer

Edit `users/serializers.py`:

```python
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            # ... existing fields ...
            'department',
        ]
```

---

## Creating Custom Management Commands

### 1. Create Command File

Create `auth/management/commands/sync_users.py`:

```python
from django.core.management.base import BaseCommand
from users.models import User

class Command(BaseCommand):
    help = 'Sync users with external directory'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be synced without making changes'
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write('DRY RUN - No changes will be made')
        
        users = User.objects.all()
        self.stdout.write(f'Found {users.count()} users')
        
        # Your sync logic here
        
        self.stdout.write(
            self.style.SUCCESS('Sync completed!')
        )
```

### 2. Run Command

```bash
python manage.py sync_users --dry-run
python manage.py sync_users
```

---

## Adding Celery Tasks

### 1. Create Task

Create or edit `auth/tasks.py`:

```python
from celery import shared_task
from users.models import User

@shared_task(name='auth.tasks.cleanup_inactive_users')
def cleanup_inactive_users(days=90):
    """
    Deactivate users inactive for specified days.
    """
    from django.utils import timezone
    from datetime import timedelta
    
    cutoff = timezone.now() - timedelta(days=days)
    
    inactive = User.objects.filter(
        last_login__lt=cutoff,
        is_active=True
    )
    
    count = inactive.count()
    inactive.update(is_active=False)
    
    return f'Deactivated {count} users'
```

### 2. Add to Celery Beat Schedule

```python
# auth/settings.py
CELERY_BEAT_SCHEDULE = {
    'cleanup-inactive-users': {
        'task': 'auth.tasks.cleanup_inactive_users',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
        'args': (90,),  # 90 days
    },
}
```

### 3. Call Task Manually

```python
from auth.tasks import cleanup_inactive_users

# Sync call
cleanup_inactive_users(days=30)

# Async call
cleanup_inactive_users.delay(days=30)
```

---

## Best Practices

### Follow Existing Patterns

- Use existing serializers as templates
- Follow URL naming conventions (`/api/v1/{resource}/`)
- Use existing permission classes where possible

### Document Changes

- Update API documentation
- Add docstrings to new classes/functions
- Update seeders for new data

### Test New Features

- Write unit tests for new models/views
- Test permissions with different user roles
- Verify API responses match expected format

### Database Migrations

- Always create migrations for model changes
- Test migrations on a copy of production data
- Provide rollback migration if needed
