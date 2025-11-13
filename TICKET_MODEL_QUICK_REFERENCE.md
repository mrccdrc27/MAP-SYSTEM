# Ticket Model - Quick Reference for Developers

## Model Structure

```python
class WorkflowTicket(models.Model):
    ticket_number = CharField(max_length=64, db_index=True)  # Unique identifier
    fetched_at = DateTimeField(auto_now_add=True)            # When received
    ticket_data = JSONField()                                 # All ticket data as JSON
    is_task_allocated = BooleanField(default=False)          # Task assignment flag
    created_at = DateTimeField(auto_now_add=True)            # Created timestamp
    updated_at = DateTimeField(auto_now=True)                # Updated timestamp
```

## Accessing Ticket Data

### Convenience Properties (Recommended for common fields)
```python
ticket = WorkflowTicket.objects.first()

# These work as properties
ticket.subject           # Gets ticket_data['subject']
ticket.description       # Gets ticket_data['description']
ticket.attachments       # Gets ticket_data['attachments']
```

### Direct JSONField Access
```python
ticket = WorkflowTicket.objects.first()

# For any field in ticket_data
status = ticket.ticket_data.get('status')
category = ticket.ticket_data.get('category')
department = ticket.ticket_data.get('department')
attachments = ticket.ticket_data.get('attachments', [])
subject = ticket.ticket_data['subject']  # Will raise KeyError if missing
```

## Creating/Saving Tickets

### From receive_ticket() Task
```python
# Just pass raw JSON - no field mapping needed
ticket_data = {
    "ticket_number": "TK-001",
    "subject": "User Issue",
    "category": "IT",
    "department": "Support",
    "description": "Detailed description",
    "status": "open",
    "priority": "high",
    "attachments": [
        {"file": "path/to/file1.pdf"},
        {"file": "path/to/file2.docx"}
    ]
}

ticket, created = WorkflowTicket.objects.update_or_create(
    ticket_number=ticket_data['ticket_number'],
    defaults={'ticket_data': ticket_data}
)
```

### Manually Creating Tickets
```python
ticket_data = {
    "subject": "Manual test ticket",
    "category": "IT",
    "department": "Support",
    "description": "Test description",
    # ... any other fields
}

ticket = WorkflowTicket.objects.create(
    ticket_number=f"TK-{unique_id}",
    ticket_data=ticket_data,
    is_task_allocated=False
)
```

## Updating Ticket Data

### Updating Specific Fields
```python
ticket = WorkflowTicket.objects.get(ticket_number="TK-001")

# Update a field in ticket_data
ticket.ticket_data['status'] = 'resolved'
ticket.save()

# Update multiple fields
ticket.ticket_data.update({
    'status': 'in_progress',
    'assigned_to': 'john.doe'
})
ticket.save()
```

## Querying Tickets

### By ticket_number
```python
ticket = WorkflowTicket.objects.get(ticket_number="TK-001")
tickets = WorkflowTicket.objects.filter(ticket_number__contains="TK")
```

### By ticket_data fields (JSONField lookups)
```python
# Filter by status
open_tickets = WorkflowTicket.objects.filter(ticket_data__status='open')

# Filter by department (case-insensitive lookup)
it_tickets = WorkflowTicket.objects.filter(
    ticket_data__department__icontains='IT'
)

# Filter by category
hardware_tickets = WorkflowTicket.objects.filter(
    ticket_data__category='Hardware'
)

# Multiple conditions
critical_tickets = WorkflowTicket.objects.filter(
    ticket_data__status='open',
    ticket_data__priority='critical'
)

# Using in-lookups
statuses = ['open', 'in_progress']
active_tickets = WorkflowTicket.objects.filter(
    ticket_data__status__in=statuses
)
```

### Annotation on JSONField
```python
from django.db.models import Value, Q, Count

# Count by status
status_counts = WorkflowTicket.objects.values('ticket_data__status').annotate(
    count=Count('id')
)

# Get tickets with specific department
from django.db.models.functions import Lower
support_tickets = WorkflowTicket.objects.annotate(
    dept=Lower('ticket_data__department')
).filter(dept='support')
```

## In Serializers

### Simple Access with SerializerMethodField
```python
from rest_framework import serializers

class TicketSerializer(serializers.ModelSerializer):
    subject = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkflowTicket
        fields = ['id', 'ticket_number', 'fetched_at', 'ticket_data', 'subject', 'status']
    
    def get_subject(self, obj):
        return obj.ticket_data.get('subject', '')
    
    def get_status(self, obj):
        return obj.ticket_data.get('status', '')
```

## In Views/ViewSets

### Filtering with Query Params
```python
def get_queryset(self):
    queryset = WorkflowTicket.objects.all()
    
    # Filter by query parameters
    status = self.request.query_params.get('status')
    if status:
        queryset = queryset.filter(ticket_data__status=status)
    
    department = self.request.query_params.get('department')
    if department:
        queryset = queryset.filter(
            ticket_data__department__icontains=department
        )
    
    return queryset
```

### Updating Ticket Status
```python
def update_ticket_status(request, pk):
    ticket = WorkflowTicket.objects.get(pk=pk)
    new_status = request.data.get('status')
    
    ticket.ticket_data['status'] = new_status
    ticket.save()
    
    return Response({"status": "updated"})
```

## Common Patterns

### Check if ticket has attachments
```python
ticket = WorkflowTicket.objects.first()
attachments = ticket.attachments  # Uses @property
if attachments:
    for att in attachments:
        process_file(att.get('file'))
```

### Extract nested ticket data safely
```python
# Using get() method (safe - returns None if missing)
priority = ticket.ticket_data.get('priority', 'low')

# Direct access (safe with defaults)
category = ticket.ticket_data.get('category', '')

# Nested access with defaults
employee_id = ticket.ticket_data.get('employee', {}).get('id')
```

### Task-related operations
```python
# Create task with matching workflow
ticket = WorkflowTicket.objects.get(ticket_number="TK-001")
department = ticket.ticket_data.get('department')
category = ticket.ticket_data.get('category')

workflow = Workflows.objects.filter(
    department=department,
    category=category
).first()

if workflow:
    task = Task.objects.create(
        ticket_id=ticket,
        workflow_id=workflow
    )
    ticket.is_task_allocated = True
    ticket.save()
```

## Migration Notes

If upgrading from the old model with individual columns:

1. The old columns are still present in the model definition (for backward compatibility reading)
2. All new code should use ticket_data
3. A data migration can be created to move old column data into ticket_data
4. The old columns can be removed after migration is tested

Example migration command:
```bash
python manage.py makemigrations tickets
python manage.py migrate
```

## Performance Tips

1. **Use `select_related()` for related objects**:
   ```python
   tasks = Task.objects.select_related('ticket_id', 'workflow_id').all()
   ```

2. **Index frequently queried JSONField keys** (already done for ticket_number)

3. **Use `only()` or `defer()` for large queries**:
   ```python
   tickets = WorkflowTicket.objects.defer('ticket_data').all()
   ```

4. **Batch operations when updating multiple tickets**:
   ```python
   from django.db.models import F
   # Bulk update (more efficient)
   WorkflowTicket.objects.filter(
       ticket_data__status='pending'
   ).update(...)  # Use raw SQL or custom update
   ```
