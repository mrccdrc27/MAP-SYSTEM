---
title: Seeding Data
sidebar_label: Seeding Data
sidebar_position: 3
---

# Seeding Data

The Auth Service includes management commands to populate the database with systems, roles, and test users.

## Available Seed Commands

| Command | Description |
|---------|-------------|
| `seed_systems` | Create AMS, TTS, BMS, HDTS systems |
| `seed_tts` | Create TTS roles and test users |
| `seed_hdts` | Create HDTS employees |
| `seed_accounts` | Create all user accounts |
| `seed_ams` | Create AMS-specific data (if available) |

## Quick Seed (Development)

Run all seeders in order:

```bash
cd auth

# 1. Create systems first (required)
python manage.py seed_systems

# 2. Create TTS roles and users
python manage.py seed_tts

# 3. Create HDTS employees
python manage.py seed_hdts

# 4. Create additional accounts
python manage.py seed_accounts
```

Or use the dev script:

```bash
bash dev.sh
```

## Seed Command Details

### seed_systems

Creates the core downstream systems:

```bash
python manage.py seed_systems
```

**Creates:**

| System | Slug | Description |
|--------|------|-------------|
| Ticket Tracking System | `TTS` | Ticket management |
| Asset Management System | `AMS` | Asset tracking |
| Budget Management System | `BMS` | Budget proposals |
| Help Desk Ticket System | `HDTS` | Employee help desk |

**Auto-Generated Admin Users:**

For each system, an admin user is automatically created:

| System | Email | Password |
|--------|-------|----------|
| TTS | `adminTTS@example.com` | `admin` |
| AMS | `adminAMS@example.com` | `admin` |
| BMS | `adminBMS@example.com` | `admin` |
| HDTS | `adminHDTS@example.com` | `admin` |

---

### seed_tts

Creates TTS-specific roles and test users:

```bash
python manage.py seed_tts
```

**Roles Created:**

| Role | Description |
|------|-------------|
| Admin | Full TTS access |
| Manager | Team management, reports |
| Technician | Handle tickets |
| User | Submit tickets |

**Test Users:**

| Email | Role | Password |
|-------|------|----------|
| `manager1@example.com` | Manager | `admin` |
| `tech1@example.com` | Technician | `admin` |
| `tech2@example.com` | Technician | `admin` |
| `user1@example.com` | User | `admin` |

---

### seed_hdts

Creates HDTS employee accounts:

```bash
python manage.py seed_hdts
```

**Test Employees:**

| Email | Status | Password |
|-------|--------|----------|
| `employee1@company.com` | Approved | `employee123` |
| `employee2@company.com` | Approved | `employee123` |
| `pending@company.com` | Pending | `employee123` |

---

### seed_accounts

Creates the superadmin and additional accounts:

```bash
python manage.py seed_accounts
```

**Creates:**

| Email | Type | Password | Access |
|-------|------|----------|--------|
| `superadmin@example.com` | Superuser | `admin` | All |

---

## Re-Seeding Data

### Force Re-Seed

Some seeders support `--force` to reset data:

```bash
python manage.py seed_tts --force
```

### Clear and Re-Seed

To completely reset:

```bash
# Clear database
python manage.py flush --no-input

# Re-run migrations
python manage.py migrate

# Re-seed everything
python manage.py seed_systems
python manage.py seed_tts
python manage.py seed_hdts
python manage.py seed_accounts
```

:::warning Data Loss
`flush` removes ALL data including manually created records!
:::

---

## Creating Custom Seed Data

### Via Django Shell

```bash
python manage.py shell
```

```python
from users.models import User
from systems.models import System
from roles.models import Role
from system_roles.models import UserSystemRole

# Create a new user
user = User.objects.create_user(
    email='newuser@example.com',
    password='securepassword',
    first_name='New',
    last_name='User'
)

# Get system and role
tts = System.objects.get(slug='TTS')
tech_role = Role.objects.get(name='Technician', system=tts)

# Assign role
UserSystemRole.objects.create(
    user=user,
    system=tts,
    role=tech_role,
    is_active=True
)
```

### Via Custom Management Command

Create `auth/management/commands/seed_custom.py`:

```python
from django.core.management.base import BaseCommand
from users.models import User
from systems.models import System
from roles.models import Role
from system_roles.models import UserSystemRole

class Command(BaseCommand):
    help = 'Seed custom data'

    def handle(self, *args, **options):
        # Your seeding logic here
        self.stdout.write(self.style.SUCCESS('Custom data seeded!'))
```

Run with:

```bash
python manage.py seed_custom
```

---

## Production Seeding

For production, only seed essential data:

```bash
# Only create systems (no test users)
python manage.py seed_systems

# Create superadmin manually
python manage.py createsuperuser
```

Then use the admin portal or API to create real users.

---

## Credential Reference

All seeded credentials are documented in:

```
auth/SEEDED_CREDENTIALS.md
```

This file lists all test accounts with their passwords and system access.
