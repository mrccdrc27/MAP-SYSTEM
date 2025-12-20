"""
Profile-related views - handles user profile retrieval and updates.
"""

from rest_framework import generics, serializers as drf_serializers, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer, extend_schema_view

from django.shortcuts import render, redirect
from django.contrib import messages
from django.views.decorators.cache import never_cache
from django.utils.decorators import method_decorator

import logging
from django.http import QueryDict

from ..models import User
from ..serializers import (
    UserProfileSerializer,
    UserProfileUpdateSerializer,
)
from ..forms import ProfileSettingsForm
from ..decorators import jwt_cookie_required

logger = logging.getLogger(__name__)


@extend_schema_view(
    get=extend_schema(
        tags=['User Profile'],
        summary="Retrieve authenticated user's profile",
        description="Fetches the profile information for the user whose JWT is provided in the `Authorization: Bearer <token>` header.",
        responses={
            200: OpenApiResponse(
                response=UserProfileSerializer,
                description="Successfully retrieved the user's profile."
            ),
            401: OpenApiResponse(
                response=inline_serializer(
                    name='ProfileGetUnauthorizedError',
                    fields={'detail': drf_serializers.CharField()}
                ),
                description="Unauthorized. This occurs if the JWT is missing, invalid, or expired."
            )
        }
    ),
    patch=extend_schema(
        tags=['User Profile'],
        summary="Update authenticated user's profile",
        description="Partially update the profile information for the authenticated user. Only provided fields will be updated. Supports both JSON and multipart/form-data for file uploads.",
        request={
            'multipart/form-data': UserProfileUpdateSerializer,
            'application/json': UserProfileUpdateSerializer,
        },
        responses={
            200: OpenApiResponse(
                response=UserProfileSerializer,
                description="Successfully updated the user's profile."
            ),
            400: OpenApiResponse(
                response=inline_serializer(
                    name='ProfileUpdateErrorResponse',
                    fields={
                        'email': drf_serializers.ListField(child=drf_serializers.CharField(), required=False),
                        'username': drf_serializers.ListField(child=drf_serializers.CharField(), required=False),
                        'phone_number': drf_serializers.ListField(child=drf_serializers.CharField(), required=False),
                    }
                ),
                description="Bad Request. This occurs when input data is invalid, such as a duplicate email or username."
            ),
            401: OpenApiResponse(
                response=inline_serializer(
                    name='ProfileUpdateUnauthorizedError',
                    fields={'detail': drf_serializers.CharField()}
                ),
                description="Unauthorized. This occurs if the JWT is missing, invalid, or expired."
            )
        }
    )
)
class ProfileView(generics.RetrieveUpdateAPIView):
    """
    API view to retrieve and partially update the profile of the currently authenticated user.
    
    GET: Returns the user's profile information
    PATCH/PUT: Partially updates the user's profile information (only provided fields)
    """
    permission_classes = (IsAuthenticated,)
    serializer_class = UserProfileSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)  # Support file uploads
    http_method_names = ['get', 'patch', 'put', 'head', 'options']  # Allow GET, PATCH, and PUT

    def get_object(self):
        # get_object is overridden to return the user attached to the request
        return self.request.user

    def get_serializer_class(self):
        """Return different serializers for different HTTP methods."""
        if self.request.method in ['PATCH', 'PUT']:
            return UserProfileUpdateSerializer
        return UserProfileSerializer

    def update(self, request, *args, **kwargs):
        """Handle profile updates with custom response."""
        print(f"\n[AUTH_PROFILE_UPDATE] START - Profile update request received")
        print(f"{'='*80}")
        
        partial = kwargs.get('partial', True)  # Default to partial update
        instance = self.get_object()
        
        print(f"[AUTH_PROFILE_UPDATE] User instance: {instance}")
        print(f"[AUTH_PROFILE_UPDATE] User ID: {instance.id}")
        print(f"[AUTH_PROFILE_UPDATE] User email: {instance.email}")
        
        # Check if user is admin or superuser
        user = request.user
        is_admin_or_superuser = user.is_superuser or user.is_staff
        
        print(f"[AUTH_PROFILE_UPDATE] Current user: {user}")
        print(f"[AUTH_PROFILE_UPDATE] Is admin or superuser: {is_admin_or_superuser}")
        print(f"[AUTH_PROFILE_UPDATE] Request method: {request.method}")
        print(f"[AUTH_PROFILE_UPDATE] Request.data keys: {list(request.data.keys())}")
        print(f"[AUTH_PROFILE_UPDATE] Request.FILES keys: {list(request.FILES.keys())}")
        
        # Log all request data
        print(f"[AUTH_PROFILE_UPDATE] Request data (all fields):")
        for key, value in request.data.items():
            if key == 'profile_picture':
                print(f"[AUTH_PROFILE_UPDATE]   - {key}: <FILE OBJECT>")
            else:
                print(f"[AUTH_PROFILE_UPDATE]   - {key}: {value}")
        
        print(f"[AUTH_PROFILE_UPDATE] Request files (all):")
        for key, file_obj in request.FILES.items():
            print(f"[AUTH_PROFILE_UPDATE]   - {key}: {file_obj.name} ({file_obj.content_type}, {file_obj.size} bytes)")
        
        # If not admin/superuser, restrict which fields can be updated
        if not is_admin_or_superuser:
            allowed_fields = {'username', 'phone_number', 'profile_picture'}
            restricted_fields = set(request.data.keys()) - allowed_fields
            
            print(f"[AUTH_PROFILE_UPDATE] Non-admin user detected")
            print(f"[AUTH_PROFILE_UPDATE] Allowed fields: {allowed_fields}")
            print(f"[AUTH_PROFILE_UPDATE] Requested fields: {set(request.data.keys())}")
            print(f"[AUTH_PROFILE_UPDATE] Restricted fields: {restricted_fields}")
            
            if restricted_fields:
                print(f"[AUTH_PROFILE_UPDATE] ✗ REJECTED: Restricted fields detected")
                print(f"{'='*80}\n")
                return Response(
                    {
                        'error': 'Permission denied',
                        'detail': f'You can only update: {", ".join(allowed_fields)}. '
                                 f'Attempted to update restricted fields: {", ".join(restricted_fields)}'
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
        
        print(f"[AUTH_PROFILE_UPDATE] Permission check: PASSED")
        print(f"[AUTH_PROFILE_UPDATE] Creating serializer...")
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        print(f"[AUTH_PROFILE_UPDATE] Serializer created: {type(serializer).__name__}")
        print(f"[AUTH_PROFILE_UPDATE] Validating serializer...")
        
        is_valid = serializer.is_valid(raise_exception=False)
        print(f"[AUTH_PROFILE_UPDATE] Serializer valid: {is_valid}")
        
        if not is_valid:
            print(f"[AUTH_PROFILE_UPDATE] ✗ VALIDATION ERRORS:")
            for field, errors in serializer.errors.items():
                print(f"[AUTH_PROFILE_UPDATE]   - {field}: {errors}")
            print(f"{'='*80}\n")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        print(f"[AUTH_PROFILE_UPDATE] ✓ Validation passed")
        print(f"[AUTH_PROFILE_UPDATE] Saving changes...")
        
        self.perform_update(serializer)
        
        print(f"[AUTH_PROFILE_UPDATE] ✓ Serializer saved")
        print(f"[AUTH_PROFILE_UPDATE] Refreshing instance from database...")
        
        instance.refresh_from_db()
        
        print(f"[AUTH_PROFILE_UPDATE] Instance refreshed from DB")
        print(f"[AUTH_PROFILE_UPDATE] User.profile_picture value: {instance.profile_picture}")
        print(f"[AUTH_PROFILE_UPDATE] User.profile_picture type: {type(instance.profile_picture)}")
        if instance.profile_picture:
            print(f"[AUTH_PROFILE_UPDATE] User.profile_picture.name: {instance.profile_picture.name}")
            print(f"[AUTH_PROFILE_UPDATE] User.profile_picture.url: {instance.profile_picture.url}")

        # Return the updated user profile using the read serializer with request context
        response_serializer = UserProfileSerializer(instance, context={'request': request})
        response_data = response_serializer.data
        
        print(f"[AUTH_PROFILE_UPDATE] Response data keys: {list(response_data.keys())}")
        print(f"[AUTH_PROFILE_UPDATE] Response profile_picture: {response_data.get('profile_picture')}")
        print(f"[AUTH_PROFILE_UPDATE] ✓✓✓ SUCCESS: Profile updated")
        print(f"{'='*80}\n")
        
        return Response(response_data, status=status.HTTP_200_OK)

    def perform_update(self, serializer):
        """Save the updated user instance."""
        serializer.save()


from ..decorators import staff_required

@staff_required
def profile_settings_view(request):
    """
    Render and process the profile settings form for authenticated staff users.
    
    Authentication is handled by:
    1. AuthenticationRoutingMiddleware (checks JWT, sets user_type and user_id)
    2. @staff_required decorator (verifies staff type and fetches User object)
    
    The decorator ensures request.user is set to the authenticated User object.
    """
    # The decorator has already set request.user
    user = request.user
    is_admin_or_superuser = user.is_superuser or user.is_staff
    # Allow otp_enabled and profile_picture-clear (the clear checkbox) as well
    allowed_fields = {'username', 'phone_number', 'profile_picture', 'otp_enabled', 'profile_picture-clear'}

    if request.method == 'POST':
        post_data = request.POST.copy()
        file_data = request.FILES

        # For non-admin users, check and restrict fields (matching API behavior)
        if not is_admin_or_superuser:
            # Get list of fields that are being submitted (excluding CSRF token)
            submitted_fields = set(post_data.keys()) - {'csrfmiddlewaretoken'}
            restricted_fields = submitted_fields - allowed_fields

            # Log what restricted fields were attempted but don't show error to user
            if restricted_fields:
                logger.info(
                    f'User {user.username} attempted to update restricted fields: {", ".join(sorted(restricted_fields))}. '
                    f'These fields will be filtered out.'
                )

            # Build a filtered POST that contains only allowed fields
            filtered = QueryDict(mutable=True)
            for key in allowed_fields:
                if key in post_data:
                    filtered[key] = post_data.get(key)

            # Also copy CSRF token so form validation still works
            if 'csrfmiddlewaretoken' in post_data:
                filtered['csrfmiddlewaretoken'] = post_data.get('csrfmiddlewaretoken')

            post_data = filtered

        # Pass request.user for form-level permission checks
        form = ProfileSettingsForm(post_data, file_data, instance=user, request_user=user)

        if form.is_valid():
            form.save()
            messages.success(request, 'Profile updated successfully!')
            return redirect('profile-settings')
        else:
            # Log the actual errors for debugging
            logger.error(f'Form validation errors for user {user.username}: {form.errors}')
            
            # Display specific error messages to the user
            for field, errors in form.errors.items():
                for error in errors:
                    if field == '__all__':
                        messages.error(request, error)
                    else:
                        messages.error(request, f'{field}: {error}')
            
            if not form.errors:
                messages.error(request, 'Please correct the errors below.')

    else:
        # Pass the already authenticated user from the decorator
        form = ProfileSettingsForm(instance=user, request_user=user) 

    context = {
        'form': form,
        'user': user,
    }
    return render(request, 'users/profile_settings.html', context)


class UserByCompanyIdView(generics.RetrieveAPIView):
    """
    API view to retrieve a user's profile by their company ID.
    Searches both User table (system users) and hdts.Employees table (employees).
    
    GET: Returns the user's profile information matching the company_id
    """
    permission_classes = (IsAuthenticated,)
    serializer_class = UserProfileSerializer
    lookup_field = 'company_id'
    lookup_value_regex = r'[A-Za-z0-9\-_]+'

    def get_queryset(self):
        # Return users filtered by company_id
        return User.objects.filter(company_id=self.kwargs.get('company_id'))

    def get_serializer_class(self):
        """Dynamically select serializer based on object type."""
        if hasattr(self, '_employee_obj') and self._employee_obj:
            from hdts.serializers import EmployeeProfileSerializer
            return EmployeeProfileSerializer
        return UserProfileSerializer

    def get_object(self):
        """Get the user by company_id. Searches User table first, then Employees table."""
        from rest_framework.exceptions import NotFound
        
        company_id = self.kwargs.get('company_id')
        
        # First, try to find in User table (system users)
        queryset = self.get_queryset()
        obj = queryset.first()
        
        if obj:
            # Check object permissions
            self.check_object_permissions(self.request, obj)
            self._employee_obj = False
            return obj
        
        # If not found in User table, search in hdts.Employees table (newly registered employees)
        try:
            from hdts.models import Employees
            
            employee = Employees.objects.get(company_id=company_id)
            self._employee_obj = True
            return employee
        except Employees.DoesNotExist:
            raise NotFound(f"User with company_id {company_id} not found.")
