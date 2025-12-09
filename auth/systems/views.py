from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema_view, extend_schema
from .models import *
from .serializers import *
from django.contrib.auth import get_user_model
from auth.permissions import IsSystemAdminOrSuperUser, filter_queryset_by_system_access
User = get_user_model()

class PublicSystemsListView(APIView):
    """
    Public endpoint to list all systems (for login page)
    No authentication required
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, format=None):
        """Get all systems for the login page"""
        systems = System.objects.all().values('id', 'name', 'slug')
        return Response({
            'results': list(systems),
            'count': systems.count()
        })

@extend_schema_view(
    list=extend_schema(tags=['Systems'], summary="List all systems", description="Retrieve a list of all systems accessible to the authenticated user"),
    create=extend_schema(tags=['Systems'], summary="Create a new system", description="Create a new system (superuser only)"),
    retrieve=extend_schema(tags=['Systems'], summary="Get system details", description="Retrieve details of a specific system"),
    update=extend_schema(tags=['Systems'], summary="Update system", description="Update a system (full update)"),
    partial_update=extend_schema(tags=['Systems'], summary="Partially update system", description="Update specific fields of a system"),
    destroy=extend_schema(tags=['Systems'], summary="Delete system", description="Delete a system")
)
class SystemViewset(viewsets.ModelViewSet):
    permission_classes = [IsSystemAdminOrSuperUser]
    queryset = System.objects.all()
    serializer_class = SystemSerializer

    def get_queryset(self):
        """Filter systems based on user permissions for all operations"""
        queryset = System.objects.all()
        
        # Filter systems based on user access
        if not self.request.user.is_superuser:
            # Get systems where user is admin
            from system_roles.models import UserSystemRole
            admin_systems = UserSystemRole.objects.filter(
                user=self.request.user,
                role__name='Admin'
            ).values_list('system_id', flat=True)
            queryset = queryset.filter(id__in=admin_systems)
        
        return queryset

    def list(self, request):
        """List systems based on user permissions"""
        queryset = self.get_queryset()
        
        # Support filtering by slug from query parameters
        slug = request.query_params.get('slug')
        if slug:
            queryset = queryset.filter(slug=slug)
        
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)
    
    def create(self, request):
        """Create a new system - superuser only"""
        if not request.user.is_superuser:
            return Response(
                {"error": "Only superusers can create new systems"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def retrieve(self, request, pk=None):
        """Retrieve a system if user has access"""
        try:
            system = self.get_queryset().get(pk=pk)
            serializer = self.serializer_class(system)
            return Response(serializer.data)
        except System.DoesNotExist:
            return Response(
                {"error": "System not found or access denied"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def update(self, request, pk=None):
        """Update a system if user has access"""
        try:
            system = self.get_queryset().get(pk=pk)
            serializer = self.serializer_class(system, data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except System.DoesNotExist:
            return Response(
                {"error": "System not found or access denied"}, 
                status=status.HTTP_404_NOT_FOUND
            )

    def partial_update(self, request, pk=None):
        """Partial update a system if user has access"""
        try:
            system = self.get_queryset().get(pk=pk)
            serializer = self.serializer_class(system, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except System.DoesNotExist:
            return Response(
                {"error": "System not found or access denied"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
    def destroy(self, request, pk=None):
        """Delete a system - superuser only"""
        if not request.user.is_superuser:
            return Response(
                {"error": "Only superusers can delete systems"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            system = self.get_queryset().get(pk=pk)
            system.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except System.DoesNotExist:
            return Response(
                {"error": "System not found or access denied"}, 
                status=status.HTTP_404_NOT_FOUND
            )

