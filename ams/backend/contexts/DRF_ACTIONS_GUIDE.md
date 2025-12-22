# Django REST Framework Actions - Complete Guide

## What are ViewSet Actions?

Actions are custom endpoints you can add to ViewSets using the `@action` decorator. They automatically generate URLs without manual URL configuration.

## Basic Action Syntax

```python
from rest_framework.decorators import action
from rest_framework.response import Response

class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    
    # List action (operates on collection)
    @action(detail=False, methods=['get'])
    def resolved(self, request):
        tickets = self.queryset.filter(is_resolved=True)
        serializer = self.get_serializer(tickets, many=True)
        return Response(serializer.data)
    
    # Detail action (operates on single object)
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        ticket = self.get_object()
        ticket.is_resolved = True
        ticket.save()
        return Response({'status': 'ticket resolved'})
```

## Action Parameters

### `detail` Parameter
- **`detail=False`**: List action - operates on collection
  - URL: `/tickets/action-name/`
  - Example: `/tickets/resolved/`
  
- **`detail=True`**: Detail action - operates on single object
  - URL: `/tickets/{id}/action-name/`
  - Example: `/tickets/5/resolve/`

### `methods` Parameter
- Specifies HTTP methods allowed
- Default: `['get']`
- Examples: `['get']`, `['post']`, `['get', 'post']`

### `url_path` Parameter
- Customizes the URL path
- Default: function name with underscores replaced by hyphens
- Example: `url_path='by-asset/(?P<asset_id>\d+)'`

### `url_name` Parameter
- Customizes the URL name for reverse lookups
- Default: function name with underscores
- Example: `url_name='by-asset'`

## URL Naming Convention

DRF automatically generates URL names for actions:

```
ViewSet basename: 'tickets'
Action function: resolved()

Generated URL name: 'tickets-resolved'
```

You can use this in `reverse()`:
```python
from rest_framework.reverse import reverse

url = reverse('tickets-resolved', request=request)
```

## Complete Examples

### Example 1: Simple List Action
```python
@action(detail=False, methods=['get'])
def unresolved(self, request):
    """GET /tickets/unresolved/"""
    tickets = self.queryset.filter(is_resolved=False)
    serializer = self.get_serializer(tickets, many=True)
    return Response(serializer.data)
```

### Example 2: Custom URL Path with Parameters
```python
@action(detail=False, methods=['get'], url_path='by-asset/(?P<asset_id>\d+)')
def by_asset(self, request, asset_id=None):
    """GET /tickets/by-asset/5/"""
    tickets = self.queryset.filter(asset=asset_id)
    serializer = self.get_serializer(tickets, many=True)
    return Response(serializer.data)
```

### Example 3: Detail Action (POST)
```python
@action(detail=True, methods=['post'])
def resolve(self, request, pk=None):
    """POST /tickets/5/resolve/"""
    ticket = self.get_object()
    ticket.is_resolved = True
    ticket.save()
    serializer = self.get_serializer(ticket)
    return Response(serializer.data)
```

### Example 4: Multiple HTTP Methods
```python
@action(detail=False, methods=['get', 'post'])
def bulk_operations(self, request):
    """
    GET /tickets/bulk_operations/  - List pending bulk ops
    POST /tickets/bulk_operations/ - Create bulk operation
    """
    if request.method == 'GET':
        # Handle GET
        return Response({'pending': []})
    else:
        # Handle POST
        return Response({'created': True})
```

## How to Include Actions in API Root

### Method 1: Custom API Root View
```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse

@api_view(['GET'])
def api_root(request, format=None):
    return Response({
        'tickets': reverse('tickets-list', request=request, format=format),
        'tickets-resolved': reverse('tickets-resolved', request=request, format=format),
        'tickets-unresolved': reverse('tickets-unresolved', request=request, format=format),
    })
```

### Method 2: Add to Serializer
```python
class TicketSerializer(serializers.HyperlinkedModelSerializer):
    actions = serializers.SerializerMethodField()
    
    def get_actions(self, obj):
        request = self.context.get('request')
        return {
            'resolve': reverse('tickets-resolve', args=[obj.pk], request=request),
        }
```

## Testing Actions

### Using curl
```bash
# List action
curl http://localhost:8003/tickets/resolved/

# Detail action
curl -X POST http://localhost:8003/tickets/5/resolve/

# Action with URL parameters
curl http://localhost:8003/tickets/by-asset/10/
```

### Using Python requests
```python
import requests

# List action
response = requests.get('http://localhost:8003/tickets/resolved/')

# Detail action
response = requests.post('http://localhost:8003/tickets/5/resolve/')

# Action with parameters
response = requests.get('http://localhost:8003/tickets/by-asset/10/')
```

## Common Patterns

### Filtering Actions
```python
@action(detail=False)
def recent(self, request):
    recent_tickets = self.queryset.filter(
        created_at__gte=timezone.now() - timedelta(days=7)
    )
    serializer = self.get_serializer(recent_tickets, many=True)
    return Response(serializer.data)
```

### Bulk Operations
```python
@action(detail=False, methods=['post'])
def bulk_resolve(self, request):
    ids = request.data.get('ticket_ids', [])
    self.queryset.filter(id__in=ids).update(is_resolved=True)
    return Response({'resolved': len(ids)})
```

### Export Actions
```python
@action(detail=False, methods=['get'])
def export(self, request):
    tickets = self.queryset.all()
    # Generate CSV/Excel
    return Response(data, content_type='text/csv')
```

