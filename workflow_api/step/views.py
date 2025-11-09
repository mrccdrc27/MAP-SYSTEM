from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import ListAPIView
from django_filters.rest_framework import DjangoFilterBackend
import logging

from .models import Steps, StepTransition
from .serializers import (
    StepDetailSerializer, 
    StepTransitionSerializer, 
    AvailableTransitionSerializer
)
from authentication import JWTCookieAuthentication
from task.models import Task
from task.serializers import UserTaskListSerializer
from task.utils.assignment import assign_users_for_step

logger = logging.getLogger(__name__)


class StepTransitionsListView(ListAPIView):
    """
    GET endpoint to list all available transitions (edges) from a specific step.
    
    Query Parameters:
    - step_id: The ID of the current step (required)
    
    Example:
    GET /steps/transitions/?step_id=2
    
    Response:
    {
        "count": 2,
        "results": [
            {
                "transition_id": 1,
                "from_step_id": 2,
                "to_step_id": 3,
                "to_step_name": "Approval",
                "to_step_description": "Manager approval required",
                "to_step_instruction": "Review and approve the request",
                "to_step_order": 2,
                "to_step_role": "Manager",
                "name": null
            },
            {
                "transition_id": 2,
                "from_step_id": 2,
                "to_step_id": 4,
                "to_step_name": "Rejection",
                "to_step_description": "Request rejected",
                "to_step_instruction": "Notify user of rejection",
                "to_step_order": 3,
                "to_step_role": "Manager",
                "name": null
            }
        ]
    }
    """
    
    serializer_class = AvailableTransitionSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = StepTransition.objects.select_related(
        'from_step_id', 
        'to_step_id', 
        'to_step_id__role_id'
    )
    
    def get_queryset(self):
        """Filter transitions based on step_id parameter"""
        step_id = self.request.query_params.get('step_id')
        
        if not step_id:
            return StepTransition.objects.none()
        
        # Get all transitions FROM this step
        queryset = StepTransition.objects.filter(
            from_step_id=step_id
        ).select_related(
            'from_step_id',
            'to_step_id',
            'to_step_id__role_id'
        )
        
        logger.info(f"✅ Found {queryset.count()} transitions from step {step_id}")
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Override to provide custom response with helpful metadata"""
        step_id = request.query_params.get('step_id')
        
        if not step_id:
            return Response(
                {'error': 'step_id query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify step exists
        try:
            current_step = Steps.objects.get(step_id=step_id)
            logger.info(f"📍 Current step: {current_step.name} (ID: {step_id})")
        except Steps.DoesNotExist:
            return Response(
                {'error': f'Step with ID {step_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'current_step': {
                'step_id': current_step.step_id,
                'name': current_step.name,
                'description': current_step.description,
                'role': current_step.role_id.name if current_step.role_id else None,
            },
            'available_transitions': serializer.data,
            'count': len(serializer.data),
        })


class StepViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing step details.
    
    Actions:
    - list: GET /steps/ - List all steps
    - retrieve: GET /steps/{id}/ - Get step details
    """
    
    queryset = Steps.objects.select_related('workflow_id', 'role_id')
    serializer_class = StepDetailSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['workflow_id', 'role_id']
