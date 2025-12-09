from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from drf_spectacular.utils import extend_schema_view, extend_schema
from .models import *
from .serializers import *
from django.contrib.auth import get_user_model
from auth.permissions import IsSystemAdminOrSuperUser, filter_queryset_by_system_access, CanCreateForSystem
from systems.models import System
User = get_user_model()

@extend_schema_view(
    list=extend_schema(tags=['Roles'], summary="List all roles", description="Retrieve a list of all roles accessible to the authenticated user"),
    create=extend_schema(tags=['Roles'], summary="Create a new role", description="Create a new system role with permission validation"),
    retrieve=extend_schema(tags=['Roles'], summary="Get role details", description="Retrieve details of a specific role"),
    update=extend_schema(tags=['Roles'], summary="Update role", description="Update a role (full update)"),
    partial_update=extend_schema(tags=['Roles'], summary="Partially update role", description="Update specific fields of a role"),
    destroy=extend_schema(tags=['Roles'], summary="Delete role", description="Delete a role (custom roles only)")
)
class RegisterViewset(viewsets.ModelViewSet):
    permission_classes = [IsSystemAdminOrSuperUser, CanCreateForSystem]
    queryset = Role.objects.all()
    serializer_class = RegisterSerializer
    
    def get_queryset(self):
        """Filter roles based on user permissions for all operations"""
        # For schema generation, return the base queryset
        if not hasattr(self.request, 'user') or not self.request.user.is_authenticated:
            return Role.objects.all()
            
        queryset = Role.objects.all()
        return filter_queryset_by_system_access(queryset, self.request.user)
    
    def create(self, request):
        """Create a new system role with permission validation"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # Additional check for system access
            system = serializer.validated_data['system']
            if not request.user.is_superuser:
                from system_roles.models import UserSystemRole
                if not UserSystemRole.objects.filter(
                    user=request.user,
                    system=system,
                    role__name='Admin'
                ).exists():
                    return Response(
                        {"error": "Access denied to create roles for this system"}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@extend_schema_view(
    list=extend_schema(tags=['Roles'], summary="List system roles", description="Retrieve a list of all system roles accessible to the authenticated user"),
    create=extend_schema(tags=['Roles'], summary="Create a new system role", description="Create a new system role with permission validation"),
    retrieve=extend_schema(tags=['Roles'], summary="Get system role details", description="Retrieve details of a specific system role"),
    update=extend_schema(tags=['Roles'], summary="Update system role", description="Update a system role (full update)"),
    partial_update=extend_schema(tags=['Roles'], summary="Partially update system role", description="Update specific fields of a system role"),
    destroy=extend_schema(tags=['Roles'], summary="Delete system role", description="Delete a system role (custom roles only)")
)
class SystemRolesViewset(viewsets.ModelViewSet):
    permission_classes = [IsSystemAdminOrSuperUser]
    queryset = Role.objects.all()
    serializer_class = SystemRolesSerializer

    def get_queryset(self):
        """Filter roles based on user permissions for all operations"""
        # For schema generation, return the base queryset
        if not hasattr(self.request, 'user') or not self.request.user.is_authenticated:
            return Role.objects.all()
        
        queryset = Role.objects.all()
        return filter_queryset_by_system_access(queryset, self.request.user)

    def get_serializer_class(self):
        """Return the appropriate serializer class"""
        return self.serializer_class

    def create(self, request):
        """Create a new system role with permission validation"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # Additional check for system access
            system = serializer.validated_data['system']
            if not request.user.is_superuser:
                from system_roles.models import UserSystemRole
                if not UserSystemRole.objects.filter(
                    user=request.user,
                    system=system,
                    role__name='Admin'
                ).exists():
                    return Response(
                        {"error": "Access denied to create roles for this system"}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def list(self, request):
        """List system roles based on user permissions"""
        queryset = self.get_queryset()
        
        # Support filtering by system slug from query parameters
        system_slug = request.query_params.get('system__slug')
        if system_slug:
            queryset = queryset.filter(system__slug=system_slug)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def retrieve(self, request, pk=None):
        """Retrieve a system role if user has access"""
        try:
            queryset = self.get_queryset().get(id=pk)
            serializer = self.serializer_class(queryset, context={'request': request})
            return Response(serializer.data)
        except Role.DoesNotExist:
            return Response(
                {"error": "Role not found or access denied"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def update(self, request, pk=None):
        """Update a system role if user has access"""
        try:
            queryset = self.get_queryset().get(id=pk)
            
            # Prevent system admins from editing critical system roles
            if not request.user.is_superuser and not queryset.is_custom:
                return Response(
                    {"error": "Cannot modify system default roles"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer = self.serializer_class(queryset, data=request.data, context={'request': request})
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Role.DoesNotExist:
            return Response(
                {"error": "Role not found or access denied"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def partial_update(self, request, pk=None):
        """Partial update a system role if user has access"""
        try:
            queryset = self.get_queryset().get(id=pk)
            
            # Prevent system admins from editing critical system roles
            if not request.user.is_superuser and not queryset.is_custom:
                return Response(
                    {"error": "Cannot modify system default roles"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer = self.serializer_class(queryset, data=request.data, partial=True, context={'request': request})
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Role.DoesNotExist:
            return Response(
                {"error": "Role not found or access denied"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def destroy(self, request, pk=None):
        """Delete a system role if user has access"""
        try:
            queryset = self.get_queryset().get(id=pk)
            
            # Prevent deletion of critical system roles
            if queryset.name == 'Admin' and not queryset.is_custom:
                return Response(
                    {"error": "Cannot delete system Admin role"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Only allow deletion of custom roles or if superuser
            if not request.user.is_superuser and not queryset.is_custom:
                return Response(
                    {"error": "Cannot delete system default roles"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            queryset.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Role.DoesNotExist:
            return Response(
                {"error": "Role not found or access denied"}, 
                status=status.HTTP_404_NOT_FOUND
            )


