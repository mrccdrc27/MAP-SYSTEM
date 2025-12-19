"""
User management views - handles user CRUD operations and agent management.
"""

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, OpenApiResponse, extend_schema_view, inline_serializer
import rest_framework.serializers as drf_serializers

from django.shortcuts import render, redirect
from django.contrib import messages
from django.db import transaction

from ..models import User
from ..serializers import (
    UserRegistrationSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    AdminUserProfileUpdateSerializer,
)
from auth.permissions import IsSystemAdminOrSuperUser, filter_users_by_system_access
from system_roles.models import UserSystemRole
from systems.models import System
from roles.models import Role
from ..decorators import jwt_cookie_required


def get_or_set_default_system(request):
    """
    Helper function to get the current system from session,
    or auto-select one if not set.
    
    Returns: system slug if found, empty string otherwise
    """
    current_system_slug = request.session.get('last_selected_system')
    
    # If system is already set, return it
    if current_system_slug:
        return current_system_slug
    
    # Otherwise, try to auto-select the first system the user has access to
    user_systems = System.objects.filter(
        user_roles__user=request.user,
        user_roles__is_active=True
    ).distinct().order_by('name')
    
    if user_systems.exists():
        system = user_systems.first()
        request.session['last_selected_system'] = system.slug
        request.session.modified = True
        return system.slug
    
    return ''


@extend_schema_view(
    list=extend_schema(
        tags=['User Management'],
        summary="List all users",
        description="Retrieve a list of all users. Superusers see all users, system admins see only users in their managed systems.",
        responses={
            200: OpenApiResponse(
                response=inline_serializer(
                    name='UserListResponse',
                    fields={
                        'users_count': drf_serializers.IntegerField(),
                        'users': UserProfileSerializer(many=True)
                    }
                ),
                description="Successfully retrieved user list"
            ),
            401: OpenApiResponse(description="Unauthorized - authentication required"),
            403: OpenApiResponse(description="Forbidden - admin privileges required")
        }
    ),
    retrieve=extend_schema(
        tags=['User Management'],
        summary="Retrieve a specific user",
        description="Get detailed information about a specific user by ID. Access is granted based on user permissions.",
        responses={
            200: OpenApiResponse(response=UserProfileSerializer, description="User details retrieved successfully"),
            401: OpenApiResponse(description="Unauthorized - authentication required"),
            403: OpenApiResponse(description="Forbidden - access denied to this user"),
            404: OpenApiResponse(description="User not found or access denied")
        }
    ),
    create=extend_schema(
        tags=['User Management'],
        summary="Create a new user",
        description="Create a new user. This endpoint is restricted - only superusers can directly create users. System admins should use the admin invite endpoint instead.",
        request=UserRegistrationSerializer,
        responses={
            201: OpenApiResponse(response=UserRegistrationSerializer, description="User created successfully"),
            400: OpenApiResponse(description="Bad request - validation errors"),
            403: OpenApiResponse(description="Forbidden - only superusers can create users directly")
        }
    ),
    update=extend_schema(
        tags=['User Management'],
        summary="Update a user profile (full update)",
        description="Fully update a user's profile. Users can update their own profile with limited fields. Admins can update non-admin users in their systems with extended fields, but cannot edit ID fields. Admins cannot edit other admins.",
        request=AdminUserProfileUpdateSerializer,
        responses={
            200: OpenApiResponse(response=UserProfileSerializer, description="User profile updated successfully"),
            400: OpenApiResponse(description="Bad request - validation errors"),
            403: OpenApiResponse(description="Forbidden - access denied or attempting to edit another admin"),
            404: OpenApiResponse(description="User not found or access denied")
        }
    ),
    partial_update=extend_schema(
        tags=['User Management'],
        summary="Partially update a user profile",
        description="Partially update a user's profile (PATCH). Users can update their own profile with limited fields. Admins can update non-admin users in their systems with extended fields, but cannot edit ID fields. Admins cannot edit other admins.",
        request=AdminUserProfileUpdateSerializer,
        responses={
            200: OpenApiResponse(response=UserProfileSerializer, description="User profile updated successfully"),
            400: OpenApiResponse(description="Bad request - validation errors"),
            403: OpenApiResponse(description="Forbidden - access denied or attempting to edit another admin"),
            404: OpenApiResponse(description="User not found or access denied")
        }
    ),
    destroy=extend_schema(
        tags=['User Management'],
        summary="Delete a user",
        description="Delete a user. This is a restricted operation - only superusers can delete users. Superusers cannot delete other superusers.",
        responses={
            204: OpenApiResponse(description="User deleted successfully"),
            403: OpenApiResponse(description="Forbidden - only superusers can delete users"),
            404: OpenApiResponse(description="User not found or access denied")
        }
    )
)
class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users with CRUD operations.
    Superusers can see all users, system admins can only see users in their systems.
    Admins can edit agent (non-admin) profiles in their systems but not other admins.
    """
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsSystemAdminOrSuperUser]

    def get_queryset(self):
        """Filter users based on requesting user's permissions for all operations"""
        queryset = User.objects.all()
        return filter_users_by_system_access(queryset, self.request.user)

    def list(self, request):
        """List users with filtering based on permissions and current system from session"""
        queryset = self.get_queryset()
        
        # Get current system from session
        current_system_slug = request.session.get('last_selected_system')
        
        if current_system_slug:
            # Filter users who have a system role in the current system
            queryset = queryset.filter(
                system_roles__system__slug=current_system_slug
            ).distinct()
        elif not request.user.is_superuser:
            # If no system in session and not superuser, return empty queryset
            queryset = queryset.none()
        
        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return Response({
            'users_count': queryset.count(),
            'users': serializer.data
        })

    def retrieve(self, request, pk=None):
        """Retrieve a specific user if user has access"""
        try:
            user = self.get_queryset().get(pk=pk)
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found or access denied"}, 
                status=status.HTTP_404_NOT_FOUND
            )

    def create(self, request):
        """Create a new user - restricted for system admins"""
        # System admins cannot create users directly through this endpoint
        # They should use the AdminInviteUserViewSet instead
        if not request.user.is_superuser:
            return Response(
                {"error": "System admins should use the admin invite endpoint to create users"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        """Update a user if user has access"""
        try:
            user = self.get_queryset().get(pk=pk)
            
            # Users can only update themselves unless they're superuser or admin
            if user == request.user:
                serializer = UserProfileUpdateSerializer(user, data=request.data, context={'request': request})
            elif request.user.is_superuser:
                serializer = AdminUserProfileUpdateSerializer(user, data=request.data, context={'request': request})
            else:
                # Check if requesting user is admin of any system the target user belongs to
                admin_systems = UserSystemRole.objects.filter(
                    user=request.user,
                    role__name='Admin'
                ).values_list('system_id', flat=True)
                
                user_systems = UserSystemRole.objects.filter(
                    user=user
                ).values_list('system_id', flat=True)
                
                # Check for common systems
                common_systems = set(admin_systems).intersection(set(user_systems))
                if not common_systems:
                    return Response(
                        {"error": "Access denied to modify this user"}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
                
                # Check if target user is NOT an admin in any of those common systems
                target_is_admin = UserSystemRole.objects.filter(
                    user=user,
                    system_id__in=common_systems,
                    role__name='Admin'
                ).exists()
                
                if target_is_admin:
                    return Response(
                        {"error": "Admins cannot edit other admins' profiles"}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
                
                serializer = AdminUserProfileUpdateSerializer(user, data=request.data, context={'request': request})
            
            if serializer.is_valid():
                serializer.save()
                return Response(UserProfileSerializer(user, context={'request': request}).data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found or access denied"}, 
                status=status.HTTP_404_NOT_FOUND
            )

    def partial_update(self, request, pk=None):
        """Partial update a user if user has access"""
        try:
            user = self.get_queryset().get(pk=pk)
            
            # Users can only update themselves unless they're superuser or admin
            if user == request.user:
                serializer = UserProfileUpdateSerializer(user, data=request.data, partial=True, context={'request': request})
            elif request.user.is_superuser:
                serializer = AdminUserProfileUpdateSerializer(user, data=request.data, partial=True, context={'request': request})
            else:
                # Check if requesting user is admin of any system the target user belongs to
                admin_systems = UserSystemRole.objects.filter(
                    user=request.user,
                    role__name='Admin'
                ).values_list('system_id', flat=True)
                
                user_systems = UserSystemRole.objects.filter(
                    user=user
                ).values_list('system_id', flat=True)
                
                # Check for common systems
                common_systems = set(admin_systems).intersection(set(user_systems))
                if not common_systems:
                    return Response(
                        {"error": "Access denied to modify this user"}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
                
                # Check if target user is NOT an admin in any of those common systems
                target_is_admin = UserSystemRole.objects.filter(
                    user=user,
                    system_id__in=common_systems,
                    role__name='Admin'
                ).exists()
                
                if target_is_admin:
                    return Response(
                        {"error": "Admins cannot edit other admins' profiles"}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
                
                serializer = AdminUserProfileUpdateSerializer(user, data=request.data, partial=True, context={'request': request})
            
            if serializer.is_valid():
                serializer.save()
                return Response(UserProfileSerializer(user, context={'request': request}).data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found or access denied"}, 
                status=status.HTTP_404_NOT_FOUND
            )

    def destroy(self, request, pk=None):
        """Delete a user - restricted operation"""
        if not request.user.is_superuser:
            return Response(
                {"error": "Only superusers can delete users"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            user = self.get_queryset().get(pk=pk)
            
            # Prevent deletion of superusers by other superusers
            if user.is_superuser and user != request.user:
                return Response(
                    {"error": "Cannot delete other superusers"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found or access denied"}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get', 'post'], permission_classes=[IsSystemAdminOrSuperUser])
    @extend_schema(
        tags=['User Management'],
        summary="Invite Agent - Get available users or invite user to system/role",
        description="GET: Get list of users who are not yet assigned to the admin's system. POST: Invite a user to a system with a specific role.",
        request=inline_serializer(
            name='InviteAgentRequest',
            fields={
                'user_id': drf_serializers.IntegerField(help_text="ID of the user to invite"),
                'system_id': drf_serializers.IntegerField(help_text="ID of the system"),
                'role_id': drf_serializers.IntegerField(help_text="ID of the role"),
            }
        ),
        responses={
            200: OpenApiResponse(
                response=inline_serializer(
                    name='InviteAgentResponse',
                    fields={
                        'available_users': UserProfileSerializer(many=True),
                        'systems': inline_serializer(
                            name='SystemInfo',
                            fields={
                                'id': drf_serializers.IntegerField(),
                                'name': drf_serializers.CharField(),
                                'slug': drf_serializers.CharField(),
                                'roles': inline_serializer(
                                    name='RoleInfo',
                                    fields={
                                        'id': drf_serializers.IntegerField(),
                                        'name': drf_serializers.CharField(),
                                    },
                                    many=True
                                ),
                            },
                            many=True
                        ),
                    }
                ),
                description="Available users and systems/roles (GET) or invitation result (POST)"
            ),
            201: OpenApiResponse(description="User successfully invited to system"),
            400: OpenApiResponse(description="Bad request - missing required fields or invalid data"),
            403: OpenApiResponse(description="Forbidden - insufficient permissions"),
            404: OpenApiResponse(description="User, system, or role not found"),
            409: OpenApiResponse(description="Conflict - user already assigned to this system/role"),
        }
    )
    def invite_agent(self, request):
        """
        GET: Retrieve list of available users to invite and available systems/roles
        POST: Invite a user to a system with a specific role
        """
        if request.method == 'GET':
            return self._handle_invite_agent_get(request)
        elif request.method == 'POST':
            return self._handle_invite_agent_post(request)
        
        return Response(
            {"error": "Method not allowed"}, 
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    def _handle_invite_agent_get(self, request):
        """Get list of available users to invite and available systems/roles"""
        user = request.user
        
        # Get systems the admin can invite users to
        if user.is_superuser:
            # Superusers can see all systems
            admin_systems = System.objects.all()
        else:
            # System admins can only see their managed systems
            admin_system_ids = UserSystemRole.objects.filter(
                user=user,
                role__name='Admin'
            ).values_list('system_id', flat=True)
            admin_systems = System.objects.filter(id__in=admin_system_ids)
        
        if not admin_systems.exists():
            return Response(
                {"error": "You are not an admin of any system"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get users not yet assigned to these systems
        assigned_user_ids = UserSystemRole.objects.filter(
            system__in=admin_systems
        ).values_list('user_id', flat=True)
        
        available_users = User.objects.exclude(
            id__in=assigned_user_ids
        ).exclude(is_superuser=True).order_by('first_name', 'last_name')
        
        # Build systems and roles response
        systems_data = []
        for system in admin_systems:
            roles = system.roles.all().values('id', 'name')
            systems_data.append({
                'id': system.id,
                'name': system.name,
                'slug': system.slug,
                'roles': list(roles)
            })
        
        serializer = UserProfileSerializer(available_users, many=True, context={'request': request})
        
        return Response({
            'available_users': serializer.data,
            'systems': systems_data
        }, status=status.HTTP_200_OK)

    def _handle_invite_agent_post(self, request):
        """Invite a user to a system with a specific role"""
        user = request.user
        
        # Get request data
        user_id = request.data.get('user_id')
        system_id = request.data.get('system_id')
        role_id = request.data.get('role_id')
        
        # Validate required fields
        if not all([user_id, system_id, role_id]):
            return Response(
                {"error": "user_id, system_id, and role_id are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the user to invite
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get the system
        try:
            system = System.objects.get(id=system_id)
        except System.DoesNotExist:
            return Response(
                {"error": "System not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get the role
        try:
            role = Role.objects.get(id=role_id, system=system)
        except Role.DoesNotExist:
            return Response(
                {"error": "Role not found or does not belong to this system"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verify that the requesting user is admin of this system
        if not user.is_superuser:
            is_admin = UserSystemRole.objects.filter(
                user=user,
                system=system,
                role__name='Admin'
            ).exists()
            
            if not is_admin:
                return Response(
                    {"error": "You are not an admin of this system"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Check if user is already assigned to this system
        existing_assignment = UserSystemRole.objects.filter(
            user=target_user,
            system=system
        ).exists()
        
        if existing_assignment:
            return Response(
                {"error": "User is already assigned to this system"}, 
                status=status.HTTP_409_CONFLICT
            )
        
        # Create the assignment
        try:
            with transaction.atomic():
                user_system_role = UserSystemRole.objects.create(
                    user=target_user,
                    system=system,
                    role=role,
                    is_active=True
                )
                
                return Response({
                    'message': f"User {target_user.email} successfully invited to {system.name} as {role.name}",
                    'assignment': {
                        'id': user_system_role.id,
                        'user_id': target_user.id,
                        'system_id': system.id,
                        'role_id': role.id,
                        'role_name': role.name,
                        'system_name': system.name
                    }
                }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {"error": f"Failed to create assignment: {str(e)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )


@jwt_cookie_required
def agent_management_view(request):
    """
    Render the agent management page for system admins and superusers.
    This view uses the same permissions as the UserViewSet API.
    Automatically selects a system if one isn't already selected.
    """
    user = request.user
    
    # Check if user has permission to manage agents
    if not user.is_superuser:
        # Check if user is a system admin
        is_system_admin = UserSystemRole.objects.filter(
            user=user,
            role__name='Admin'
        ).exists()
        
        if not is_system_admin:
            messages.error(request, 'Access denied. You need admin privileges to access agent management.')
            return redirect('profile-settings')
    
    # Get or set current system from session
    current_system_slug = get_or_set_default_system(request)
    
    context = {
        'user': user,
        'current_system': current_system_slug,
    }
    return render(request, 'management/agent_management.html', context)


@jwt_cookie_required
def invite_agent_view(request):
    """
    Render the invite agent page for system admins and superusers.
    This page allows admins to invite new agents to the system.
    Automatically selects a system if one isn't already selected.
    """
    user = request.user
    
    # Check if user has permission to invite agents
    if not user.is_superuser:
        # Check if user is a system admin
        is_system_admin = UserSystemRole.objects.filter(
            user=user,
            role__name='Admin'
        ).exists()
        
        if not is_system_admin:
            messages.error(request, 'Access denied. You need admin privileges to invite agents.')
            return redirect('profile-settings')
    
    # Get or set current system from session
    current_system_slug = get_or_set_default_system(request)
    
    context = {
        'user': user,
        'current_system': current_system_slug,
    }
    return render(request, 'management/invite_agent.html', context)


# Internal endpoint for service-to-service lookups (no auth required)
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

class UserByIdView(APIView):
    """
    Internal endpoint for service-to-service lookups.
    Returns basic user info (first_name, last_name, email) by user ID.
    No authentication required - for internal use only.
    """
    authentication_classes = []
    permission_classes = [AllowAny]
    
    def get(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
            return Response({
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'full_name': f"{user.first_name} {user.last_name}".strip(),
            })
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
