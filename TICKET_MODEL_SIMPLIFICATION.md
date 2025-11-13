# Ticket Model Simplification - Summary of Changes

## Overview
Simplified the `WorkflowTicket` model from a complex schema with 40+ individual database columns to a clean, minimal schema with only 3 fields:
- `ticket_number` (CharField, indexed)
- `fetched_at` (DateTimeField, auto-populated)
- `ticket_data` (JSONField - stores all incoming ticket data as-is)

## Model Changes

### Before
- 40+ individual columns for ticket metadata (subject, description, priority, status, etc.)
- Complex field mapping logic in data ingestion
- Type conversion and validation scattered across multiple fields
- Difficult to extend without database migrations

### After
```python
class WorkflowTicket(models.Model):
    ticket_number = models.CharField(max_length=64, db_index=True)
    fetched_at = models.DateTimeField(auto_now_add=True)
    ticket_data = models.JSONField()
    is_task_allocated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Convenience properties for backward compatibility
    @property
    def subject(self):
        return self.ticket_data.get('subject', '')
    
    @property
    def description(self):
        return self.ticket_data.get('description', '')
    
    @property
    def attachments(self):
        return self.ticket_data.get('attachments', [])
```

## Files Modified

### 1. `tickets/models.py`
- **TicketSnapshot** class added (basic model with just ticket_number, fetched_at, ticket_data)
- **WorkflowTicket** refactored to use JSONField for ticket_data
- Added convenience properties: `subject`, `description`, `attachments`
- Simplified save() logic to work with ticket_data

### 2. `tickets/serializers.py`
- Updated all serializers to work with ticket_data JSONField
- Added SerializerMethodField for convenience access to nested ticket_data fields
- WorkflowTicketSerializer now returns: id, ticket_number, fetched_at, ticket_data, is_task_allocated
- WorkflowTicketDetailSerializer provides computed fields from ticket_data

### 3. `tickets/tasks.py`
- **receive_ticket()**: Drastically simplified
  - Only validates `ticket_number` (required field)
  - Saves ticket_data directly without field mapping
  - Creates ticket with: `ticket_number` and `ticket_data` (raw JSON)
  
- **create_task_for_ticket()**: Updated to extract fields from ticket_data
  - Gets subject from: `ticket.ticket_data.get('subject')`
  - Gets department from: `ticket.ticket_data.get('department')`
  - Gets category from: `ticket.ticket_data.get('category')`

### 4. `tickets/views.py`
- Updated all filter queries to use ticket_data lookups
  - From: `queryset.filter(status=status)` 
  - To: `queryset.filter(ticket_data__status=status)`
- Updated by_ticket_number endpoint (replaced by_original_ticket)
- Updated stats() to query ticket_data fields using __status, __priority, __department

### 5. `tickets/serializers.py` (Management)
- seedtix.py command updated to create ticket_data as JSON structure
- Attachments now stored as list of dicts: `[{"file": "path/to/file"}]`

### 6. `task/models.py`
- **_process_attachments_from_ticket()** updated:
  - Accesses ticket data: `ticket.ticket_data` instead of direct attributes
  - Gets subject/description from ticket_data dict
  - Gets attachments from ticket_data

### 7. `task/serializers.py`
- **TaskSerializer**: Added SerializerMethodField methods for ticket_subject, ticket_description
- **UserTaskListSerializer**: Updated to extract ticket fields from ticket_data
- All related serializers updated to use SerializerMethodField for dynamic data extraction

### 8. `tickets/utils.py`
- allocate_task_for_ticket(): Updated to access department/category from ticket.ticket_data
- manually_assign_task(): No direct changes needed (uses WorkflowTicket instance)

### 9. `amscheckout/views.py`
- CheckoutResolveView: Updated to query by ticket_data__ticket_id
- Status update changed from direct attribute to: `ticket.ticket_data['status'] = "Resolved"`

### 10. `bmscheckout/views.py`
- Similar updates to query by ticket_data and update via ticket_data dict

### 11. `test_workflow.py`
- Updated test functions to work with new ticket_data structure
- test_automatic_task_creation(): Creates ticket with ticket_data JSON
- test_manual_task_creation(): Uses ticket_data for ticket creation

## Migration Strategy

### Step 1: Create Migration
```bash
python manage.py makemigrations tickets
python manage.py migrate
```

### Step 2: Data Migration (if keeping old data)
Optional: Create a data migration to convert old ticket columns to JSON format in ticket_data

### Step 3: Update Celery Task
Ensure the receive_ticket Celery task passes ticket data as expected

## API Changes

### Request Format (Receiving Tickets)
**Before**: Required field mapping (ticket_id → original_ticket_id, etc.)

**After**: Just send ticket data as-is
```json
{
    "ticket_number": "TK-001",
    "subject": "Issue title",
    "category": "IT",
    "department": "Support",
    "description": "Detailed description",
    ...
}
```

### Response Format
**Tickets endpoint** now returns:
```json
{
    "id": 1,
    "ticket_number": "TK-001",
    "fetched_at": "2025-11-13T10:30:00Z",
    "ticket_data": { ...all original data... },
    "is_task_allocated": false,
    "created_at": "2025-11-13T10:30:00Z",
    "updated_at": "2025-11-13T10:30:00Z"
}
```

## Benefits

1. **Simpler Schema**: 3 core fields instead of 40+
2. **Flexible**: No need for migrations when adding new ticket fields
3. **Cleaner Code**: No complex field mapping logic
4. **Performance**: Fewer columns to index and query
5. **Maintainability**: Incoming data stored as-is, easier to debug
6. **Backward Compatible**: Convenience properties (subject, description, attachments) for existing code

## Backward Compatibility Notes

- Properties like `ticket.subject`, `ticket.description` still work via @property decorators
- Serializers return cleaned data that's API-compatible
- Task models and views continue to work without changes to their core logic
- Django ORM queries on ticket_data work seamlessly with JSONField lookups

## Testing Recommendations

1. Test receive_ticket() with sample JSON data
2. Test task creation workflow with new ticket data structure
3. Test serializers return expected fields
4. Test filtering/searching by department, category, status
5. Test attachment processing from ticket_data
6. Test checkout integrations (AMS/BMS) with new status update mechanism
