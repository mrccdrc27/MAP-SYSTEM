"""
REST API views for audit event retrieval and analysis.
"""

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils.timezone import now, timedelta
from django.db import models
from .models import AuditEvent, AuditLog
from .serializers import AuditEventSerializer, AuditLogSerializer
from authentication import MultiSystemPermission
import logging

logger = logging.getLogger(__name__)


class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for querying audit events.
    
    Permissions:
        - Requires TTS system access
        - Users can see their own events
        - Admins can see all events
    
    Features:
        - Filter by user, action, target type, date range
        - Full-text search on username, email, description
        - Retrieve detailed change information
        - Get object audit history
    """
    queryset = AuditEvent.objects.all()
    serializer_class = AuditEventSerializer
    permission_classes = [MultiSystemPermission.require('tts')]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'action', 'target_type', 'description']
    ordering_fields = ['timestamp', 'action', 'username']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        """
        Filter queryset based on user permissions.
        Users see only their own events unless they're admins.
        """
        queryset = super().get_queryset()
        user = self.request.user
        
        # TODO: Add admin check based on system roles
        # For now, filter to user's own events
        if user and hasattr(user, 'user_id'):
            # Regular users see only their own events
            # Admins can see all (check system role)
            if not self._is_admin(user):
                queryset = queryset.filter(user_id=user.user_id)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """List audit events with optional filtering"""
        # Apply query parameter filters
        user_id = request.query_params.get('user_id')
        action = request.query_params.get('action')
        target_type = request.query_params.get('target_type')
        target_id = request.query_params.get('target_id')
        days = request.query_params.get('days')
        
        queryset = self.get_queryset()
        
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if action:
            queryset = queryset.filter(action=action)
        if target_type:
            queryset = queryset.filter(target_type=target_type)
        if target_id:
            queryset = queryset.filter(target_id=target_id)
        if days:
            try:
                days_int = int(days)
                cutoff = now() - timedelta(days=days_int)
                queryset = queryset.filter(timestamp__gte=cutoff)
            except ValueError:
                pass
        
        # Apply search and ordering
        queryset = self.filter_queryset(queryset)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_object(self, request):
        """
        Get audit history for a specific object.
        
        Query params:
            - target_type: Model name (required)
            - target_id: Object ID (required)
        
        Example: GET /api/audit/events/by_object/?target_type=Workflow&target_id=5
        """
        target_type = request.query_params.get('target_type')
        target_id = request.query_params.get('target_id')
        
        if not target_type or not target_id:
            return Response(
                {'error': 'target_type and target_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(
            target_type=target_type,
            target_id=target_id
        ).order_by('-timestamp')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_user(self, request):
        """
        Get audit history for a specific user.
        
        Query params:
            - user_id: User ID (required)
            - days: Last N days (optional, default: 30)
        
        Example: GET /api/audit/events/by_user/?user_id=123&days=7
        """
        user_id = request.query_params.get('user_id')
        days = request.query_params.get('days', '30')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check permissions: user can see own events, admins can see all
        if not self._is_admin(request.user):
            if hasattr(request.user, 'user_id') and request.user.user_id != int(user_id):
                return Response(
                    {'error': 'You cannot view other users\' audit logs'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        try:
            days_int = int(days)
            cutoff = now() - timedelta(days=days_int)
        except ValueError:
            cutoff = now() - timedelta(days=30)
        
        queryset = AuditEvent.objects.filter(
            user_id=user_id,
            timestamp__gte=cutoff
        ).order_by('-timestamp')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_action(self, request):
        """
        Get audit history for a specific action type.
        
        Query params:
            - action: Action type (required)
            - days: Last N days (optional, default: 30)
        
        Example: GET /api/audit/events/by_action/?action=update_workflow&days=7
        """
        action = request.query_params.get('action')
        days = request.query_params.get('days', '30')
        
        if not action:
            return Response(
                {'error': 'action is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            days_int = int(days)
            cutoff = now() - timedelta(days=days_int)
        except ValueError:
            cutoff = now() - timedelta(days=30)
        
        queryset = self.get_queryset().filter(
            action=action,
            timestamp__gte=cutoff
        ).order_by('-timestamp')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get summary statistics about audit events.
        
        Query params:
            - days: Last N days (optional, default: 30)
        
        Returns:
            - total_events
            - unique_users
            - actions_count (by action type)
            - top_objects (most modified)
        """
        try:
            days = int(request.query_params.get('days', '30'))
            cutoff = now() - timedelta(days=days)
        except ValueError:
            cutoff = now() - timedelta(days=30)
        
        events = self.get_queryset().filter(timestamp__gte=cutoff)
        
        # Get statistics
        total_events = events.count()
        unique_users = events.values('user_id').distinct().count()
        
        # Count by action
        actions = {}
        for event in events.values('action').annotate(count=models.Count('id')):
            actions[event['action']] = event['count']
        
        # Top modified objects
        top_objects = []
        obj_counts = {}
        for event in events:
            if event.target_type and event.target_id:
                key = f"{event.target_type}#{event.target_id}"
                obj_counts[key] = obj_counts.get(key, 0) + 1
        
        for obj_key, count in sorted(obj_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
            target_type, target_id = obj_key.split('#')
            top_objects.append({
                'target_type': target_type,
                'target_id': int(target_id),
                'event_count': count
            })
        
        return Response({
            'days': days,
            'total_events': total_events,
            'unique_users': unique_users,
            'actions_count': actions,
            'top_objects': top_objects
        })
    
    def _is_admin(self, user):
        """Check if user has admin role in TTS system"""
        if not user:
            return False
        
        # TODO: Implement proper admin check based on system roles
        # For now, just return False
        return False


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for simple audit logs.
    
    Use when you don't need full change tracking capabilities.
    """
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [MultiSystemPermission.require('tts')]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'action', 'entity_type']
    ordering = ['-timestamp']
