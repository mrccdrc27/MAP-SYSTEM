"""
Role management views - handles role creation, viewing, and management across all systems.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import render, redirect
from django.contrib import messages

from users.authentication import CookieJWTAuthentication
from users.decorators import jwt_cookie_required
from roles.models import Role
from systems.models import System
from system_roles.models import UserSystemRole


def get_or_set_default_system(request):
    """
    Helper function to get the current system from session,
    or auto-select one if not set.
    
    Returns: system slug if found, None otherwise
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
    
    return None


class CreateRoleView(APIView):
    """
    API endpoint for creating new roles and retrieving roles in the current system.
    Requires JWT authentication and admin privileges for the current system.
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            user = request.user
            
            # Get current system from session
            current_system_slug = request.session.get('last_selected_system')
            if not current_system_slug:
                return Response(
                    {"error": "No system selected. Please select a system first."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check admin privileges for the current system
            if not user.is_superuser:
                is_admin = UserSystemRole.objects.filter(
                    user=user,
                    role__name='Admin',
                    system__slug=current_system_slug
                ).exists()
                if not is_admin:
                    return Response(
                        {"error": f"You don't have permission to view roles in {current_system_slug.upper()} system"},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Get current system
            try:
                current_system = System.objects.get(slug=current_system_slug)
            except System.DoesNotExist:
                return Response(
                    {"error": f"{current_system_slug.upper()} system not found"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Get all roles in current system
            all_roles = Role.objects.filter(system=current_system).values('id', 'name', 'description', 'is_custom', 'created_at')
            
            return Response({
                "roles": list(all_roles)
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        try:
            user = request.user
            
            # Get current system from session
            current_system_slug = request.session.get('last_selected_system')
            if not current_system_slug:
                return Response(
                    {"error": "No system selected. Please select a system first."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check admin privileges for the current system
            if not user.is_superuser:
                is_admin = UserSystemRole.objects.filter(
                    user=user,
                    role__name='Admin',
                    system__slug=current_system_slug
                ).exists()
                if not is_admin:
                    return Response(
                        {"error": f"You don't have permission to create roles in {current_system_slug.upper()} system"},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Get current system
            try:
                current_system = System.objects.get(slug=current_system_slug)
            except System.DoesNotExist:
                return Response(
                    {"error": f"{current_system_slug.upper()} system not found"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Get data from request
            name = request.data.get('name', '').strip()
            description = request.data.get('description', '').strip()
            
            if not name:
                return Response(
                    {"error": "Role name is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if role already exists in current system
            existing_role = Role.objects.filter(
                system=current_system,
                name__iexact=name
            ).first()
            
            if existing_role:
                return Response(
                    {
                        "error": f"Role '{name}' already exists in {current_system_slug.upper()} system",
                        "role": {
                            "id": existing_role.id,
                            "name": existing_role.name
                        }
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create new role
            role = Role.objects.create(
                system=current_system,
                name=name,
                description=description,
                is_custom=True
            )
            
            return Response(
                {
                    "message": f"Role '{name}' created successfully",
                    "role": {
                        "id": role.id,
                        "name": role.name,
                        "description": role.description
                    }
                },
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UpdateAssignmentView(APIView):
    """
    API endpoint for updating role assignment settings.
    Requires JWT authentication and admin privileges.
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def put(self, request, assignment_id):
        try:
            user = request.user
            
            # Check admin privileges (any admin)
            if not user.is_superuser:
                is_admin = UserSystemRole.objects.filter(
                    user=user,
                    role__name='Admin'
                ).exists()
                if not is_admin:
                    return Response(
                        {"error": "You don't have permission to update assignments"},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Get the assignment
            try:
                assignment = UserSystemRole.objects.get(id=assignment_id)
            except UserSystemRole.DoesNotExist:
                return Response(
                    {"error": "Assignment not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Update is_active if provided
            if 'is_active' in request.data:
                assignment.is_active = request.data['is_active']
            
            # Update settings with is_deployed flag
            if 'settings' in request.data:
                settings = request.data['settings']
                if isinstance(settings, dict):
                    assignment.settings = settings
            
            assignment.save()
            
            return Response(
                {
                    "message": "Assignment updated successfully",
                    "id": assignment.id,
                    "is_active": assignment.is_active,
                    "settings": assignment.settings
                },
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def delete(self, request, assignment_id):
        try:
            user = request.user
            
            # Check admin privileges
            if not user.is_superuser:
                is_admin = UserSystemRole.objects.filter(
                    user=user,
                    role__name='Admin'
                ).exists()
                if not is_admin:
                    return Response(
                        {"error": "You don't have permission to delete assignments"},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Get and delete the assignment
            try:
                assignment = UserSystemRole.objects.get(id=assignment_id)
                assignment.delete()
            except UserSystemRole.DoesNotExist:
                return Response(
                    {"error": "Assignment not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            return Response(
                {"message": "Assignment deleted successfully"},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

