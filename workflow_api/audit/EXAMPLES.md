# Example: Audit Logging Integration with Workflow Views

This file shows practical examples of integrating audit logging into your existing workflow API endpoints.

## Example 1: Create Workflow Endpoint

```python
# workflow/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from audit.utils import log_action
from audit.decorators import audit_action
from workflow.models import Workflows
from workflow.serializers import WorkflowSerializer

class CreateWorkflowView(APIView):
    """Create a new workflow with automatic audit logging"""
    
    def post(self, request):
        serializer = WorkflowSerializer(data=request.data)
        
        if serializer.is_valid():
            # Create the workflow
            workflow = serializer.save(user_id=request.user.user_id)
            
            # Log the action internally
            log_action(
                user_data=request.user,
                action='create_workflow',
                target=workflow,
                description=f"Created workflow: {workflow.name}",
                request=request  # Include for IP tracking
            )
            
            return Response(
                WorkflowSerializer(workflow).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

## Example 2: Update Workflow Endpoint

```python
# workflow/views.py
from copy import deepcopy
from audit.utils import log_action, compare_models

class UpdateWorkflowView(APIView):
    """Update a workflow with change tracking"""
    
    def put(self, request, workflow_id):
        try:
            workflow = Workflows.objects.get(workflow_id=workflow_id)
        except Workflows.DoesNotExist:
            return Response(
                {'error': 'Workflow not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Save old state for comparison
        old_workflow = deepcopy(workflow)
        
        serializer = WorkflowSerializer(workflow, data=request.data, partial=True)
        
        if serializer.is_valid():
            workflow = serializer.save()
            
            # Auto-detect changes
            changes = compare_models(
                old_workflow,
                workflow,
                exclude=['updated_at', 'created_at']
            )
            
            if changes:  # Only log if something changed
                log_action(
                    user_data=request.user,
                    action='update_workflow',
                    target=workflow,
                    changes=changes,
                    request=request
                )
            
            return Response(WorkflowSerializer(workflow).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

## Example 3: Publish Workflow Endpoint

```python
# workflow/views.py
class PublishWorkflowView(APIView):
    """Publish a workflow"""
    
    def post(self, request, workflow_id):
        try:
            workflow = Workflows.objects.get(workflow_id=workflow_id)
        except Workflows.DoesNotExist:
            return Response(
                {'error': 'Workflow not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        old_status = workflow.status
        workflow.is_published = True
        workflow.status = 'deployed'
        workflow.save()
        
        # Log the publish action with status change
        log_action(
            user_data=request.user,
            action='publish_workflow',
            target=workflow,
            changes={
                'is_published': {'old': False, 'new': True},
                'status': {'old': old_status, 'new': 'deployed'}
            },
            request=request
        )
        
        return Response(
            {
                'message': 'Workflow published',
                'workflow': WorkflowSerializer(workflow).data
            }
        )
```

## Example 4: Delete Workflow Endpoint

```python
# workflow/views.py
class DeleteWorkflowView(APIView):
    """Delete a workflow"""
    
    def delete(self, request, workflow_id):
        try:
            workflow = Workflows.objects.get(workflow_id=workflow_id)
        except Workflows.DoesNotExist:
            return Response(
                {'error': 'Workflow not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Log before deletion
        log_action(
            user_data=request.user,
            action='delete_workflow',
            target=workflow,
            description=f"Deleted workflow: {workflow.name}",
            request=request
        )
        
        workflow_id = workflow.workflow_id
        workflow.delete()
        
        return Response(
            {'message': f'Workflow {workflow_id} deleted'}
        )
```

## Example 5: Using Decorator Approach

```python
# workflow/views.py
from audit.decorators import audit_action
from rest_framework.decorators import api_view

@api_view(['POST'])
@audit_action('create_workflow')
def create_workflow(request):
    """Simplified with decorator"""
    serializer = WorkflowSerializer(data=request.data)
    
    if serializer.is_valid():
        workflow = serializer.save(user_id=request.user.user_id)
        return Response(
            WorkflowSerializer(workflow).data,
            status=status.HTTP_201_CREATED
        )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

## Example 6: Service Layer Pattern

Best practice: handle logging in service layer, not in views

```python
# workflow/services.py
from audit.utils import log_action, compare_models
from copy import deepcopy

class WorkflowService:
    """Business logic for workflows"""
    
    @staticmethod
    def create_workflow(user_data, workflow_data, request=None):
        """Create workflow with automatic audit logging"""
        workflow = Workflows.objects.create(**workflow_data)
        
        # Automatic logging
        log_action(
            user_data=user_data,
            action='create_workflow',
            target=workflow,
            request=request
        )
        
        return workflow
    
    @staticmethod
    def update_workflow(user_data, workflow_id, updates, request=None):
        """Update workflow with change tracking"""
        workflow = Workflows.objects.get(workflow_id=workflow_id)
        old_workflow = deepcopy(workflow)
        
        # Apply updates
        for field, value in updates.items():
            if hasattr(workflow, field):
                setattr(workflow, field, value)
        workflow.save()
        
        # Auto-detect and log changes
        changes = compare_models(old_workflow, workflow)
        
        if changes:
            log_action(
                user_data=user_data,
                action='update_workflow',
                target=workflow,
                changes=changes,
                request=request
            )
        
        return workflow
    
    @staticmethod
    def delete_workflow(user_data, workflow_id, request=None):
        """Delete workflow"""
        workflow = Workflows.objects.get(workflow_id=workflow_id)
        
        log_action(
            user_data=user_data,
            action='delete_workflow',
            target=workflow,
            request=request
        )
        
        workflow.delete()
    
    @staticmethod
    def publish_workflow(user_data, workflow_id, request=None):
        """Publish workflow"""
        workflow = Workflows.objects.get(workflow_id=workflow_id)
        old_status = workflow.status
        
        workflow.is_published = True
        workflow.status = 'deployed'
        workflow.save()
        
        log_action(
            user_data=user_data,
            action='publish_workflow',
            target=workflow,
            changes={
                'is_published': {'old': False, 'new': True},
                'status': {'old': old_status, 'new': 'deployed'}
            },
            request=request
        )
        
        return workflow


# Then in views, just call the service:
# workflow/views.py
class UpdateWorkflowView(APIView):
    def put(self, request, workflow_id):
        try:
            workflow = WorkflowService.update_workflow(
                user_data=request.user,
                workflow_id=workflow_id,
                updates=request.data,
                request=request
            )
            return Response(WorkflowSerializer(workflow).data)
        except Workflows.DoesNotExist:
            return Response(
                {'error': 'Workflow not found'},
                status=status.HTTP_404_NOT_FOUND
            )
```

## Example 7: API View to Retrieve Audit History

```python
# workflow/views.py
from audit.utils import get_object_audit_history
from audit.serializers import AuditEventSerializer

class WorkflowAuditHistoryView(APIView):
    """Get audit history for a workflow"""
    
    def get(self, request, workflow_id):
        try:
            workflow = Workflows.objects.get(workflow_id=workflow_id)
        except Workflows.DoesNotExist:
            return Response(
                {'error': 'Workflow not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get audit history
        events = get_object_audit_history(workflow)
        serializer = AuditEventSerializer(events, many=True)
        
        return Response({
            'workflow_id': workflow_id,
            'workflow_name': workflow.name,
            'audit_history': serializer.data
        })
```

## Integration Checklist

- [ ] Create migration: `python manage.py makemigrations audit`
- [ ] Run migration: `python manage.py migrate audit`
- [ ] Add audit app to `INSTALLED_APPS` in settings
- [ ] Import `log_action` in your views/services
- [ ] Add logging calls to CREATE endpoints
- [ ] Add logging calls to UPDATE endpoints
- [ ] Add logging calls to DELETE endpoints
- [ ] Test via Django admin: `/admin/audit/auditevent/`
- [ ] Query via API: `/audit/events/`
- [ ] Query via code: `get_object_audit_history(workflow)`

## Notes

- **No POST requests needed**: Logging happens automatically when you call `log_action()`
- **Query only**: Use the audit API to RETRIEVE logs, not to create them
- **Automatic tracking**: Use `compare_models()` to auto-detect changes
- **Service layer**: Best practice is to log in business logic, not in views
- **Decorators**: Use `@audit_action()` for simple automatic logging
