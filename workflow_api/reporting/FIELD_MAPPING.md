# Reporting App - Field Mapping Reference

## TaskItem Model Field Corrections

The reporting app has been updated to use the correct field names from the `TaskItem` model.

### Key Field Mappings

| Purpose | Correct Field | Previous (Incorrect) |
|---------|---------------|-------------------|
| Get user ID from TaskItem | `role_user__user_id` | `user_id` ❌ |
| Get role ID from TaskItem | `role_user__role_id` | Various attempts ❌ |
| Get role name | `role_user__role_id__name` | N/A |
| Get user full name | `role_user__user_full_name` | N/A |

### Model Relationships

```
TaskItem
├── role_user (ForeignKey → RoleUsers)
│   ├── user_id (IntegerField)
│   ├── user_full_name (CharField)
│   └── role_id (ForeignKey → Roles)
│       └── name (CharField)
├── task (ForeignKey → Task)
├── status (CharField)
└── assigned_on (DateTimeField)
```

### Fixed Views

1. **DashboardSummaryView**
   - Fixed: `total_users` count using `role_user__user_id`

2. **TeamPerformanceView**
   - Fixed: All user_id references to use `role_user__user_id`
   - Fixed: Escalation counts properly filtering TaskItem

3. **AssignmentAnalyticsView**
   - Fixed: Role grouping using `role_user__role_id`
   - Fixed: User count in role using `role_user__user_id`

### Query Examples

**Get all unique users with assignments:**
```python
TaskItem.objects.values('role_user__user_id').distinct()
```

**Get tasks for a specific user:**
```python
Task.objects.filter(taskitem__role_user__user_id=5)
```

**Get assignments by role:**
```python
TaskItem.objects.values(
    role_id=F('role_user__role_id')
).annotate(count=Count('id'))
```

### Authentication

All reporting endpoints use `JWTCookieAuthentication` from `authentication.py` for cookie-based JWT authentication.
