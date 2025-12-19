# auth/hdts/views.py

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.db import transaction
from .forms import UserRegistrationForm
from users.models import User
from roles.models import Role
from systems.models import System
from system_roles.models import UserSystemRole
from .decorators import hdts_admin_required # Import the decorator
from django.views.decorators.http import require_POST
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from users.serializers import UserProfileSerializer
from django.shortcuts import get_object_or_404
from system_roles.models import UserSystemRole

# Import employee views from separated modules
from .employee_api_views import (
    EmployeeRegisterView,
    EmployeeTokenObtainPairView,
    EmployeeTokenRefreshView,
    EmployeeLogoutView,
    EmployeeProfileView,
    EmployeeChangePasswordView,
    RequestEmployeeOTPView,
    VerifyEmployeeOTPView,
    Enable2FAView,
    Disable2FAView,
)
from .employee_template_views import (
    EmployeeLoginView,
    EmployeeVerifyOTPView,
    EmployeeProfileSettingsView,
    EmployeeChangePasswordView as TemplateChangePasswordView,
    EmployeeLogoutView as TemplateLogoutView,
    EmployeeResetPasswordUIView,
)


def register_user_view(request):
    if request.method == 'POST':
        form = UserRegistrationForm(request.POST, request.FILES)
        if form.is_valid():
            try:
                # Use a transaction to ensure user creation and role assignment
                # are all-or-nothing.
                with transaction.atomic():
                    # 1. Find the target System and Role by name
                    # Assumes the system slug is 'hdts' and role name is 'Employee'
                    hdts_system = System.objects.get(slug='hdts')
                    employee_role = Role.objects.get(name='Employee', system=hdts_system)
                    
                    # 2. Save the User using the form's save method
                    # (which calls User.objects.create_user)
                    user = form.save()
                    
                    # 3. Associate the new user with the Employee role in the HDTS system
                    UserSystemRole.objects.create(
                        user=user,
                        system=hdts_system,
                        role=employee_role
                    )
                
                messages.success(request, 'Registration successful! Your account is pending approval.')
                # Redirect to login page
                return redirect('/login/')

            except System.DoesNotExist:
                messages.error(request, "Configuration error: The 'HDTS' system does not exist.")
            except Role.DoesNotExist:
                messages.error(request, "Configuration error: The 'Employee' role does not exist.")
            except Exception as e:
                messages.error(request, f"An unexpected error occurred: {e}")
        
        else:
            messages.error(request, 'Please correct the errors below.')
            
    else:
        form = UserRegistrationForm()
        
    return render(request, 'public/hdts_register.html', {'form': form})


# --- NEW VIEW FOR USER MANAGEMENT ---
@hdts_admin_required
def manage_pending_users_view(request):
    """
    View for HDTS Admins to approve or reject pending Employee registrations.
    """
    # Find users who are assigned the 'Employee' role in the 'hdts' system
    # AND have a status of 'Pending'.
    pending_users = User.objects.filter(
        status='Pending',
        system_roles__system__slug='hdts',
        system_roles__role__name='Employee'
    ).distinct() # Use distinct() in case a user somehow got the role twice

    context = {
        'pending_users': pending_users
    }
    return render(request, 'management/hdts/user_management/pending_approvals.html', context)

@hdts_admin_required
@require_POST # Ensure this view only accepts POST requests
def update_user_status_view(request, user_id):
    """
    Handles the POST request to approve or reject a user.
    """
    from django.utils import timezone
    
    user_to_update = get_object_or_404(User, id=user_id)
    action = request.POST.get('action') # 'approve' or 'reject'

    if user_to_update.status != 'Pending':
        messages.warning(request, f"User {user_to_update.email} is no longer pending.")
        return redirect('hdts:manage_pending_users')

    if action == 'approve':
        user_to_update.status = 'Approved'
        user_to_update.approved_at = timezone.now()  # Set approval timestamp
        user_to_update.approved_by = request.user  # Track who approved
        # Add notification logic here if needed
        # notification_client.send_notification(...)
        messages.success(request, f"User {user_to_update.email} approved.")
    elif action == 'reject':
        user_to_update.status = 'Rejected'
        user_to_update.rejected_at = timezone.now()  # Set rejection timestamp
        user_to_update.rejected_by = request.user  # Track who rejected
        # Optionally deactivate the user or add notification logic
        # user_to_update.is_active = False 
        messages.success(request, f"User {user_to_update.email} rejected.")
    else:
        messages.error(request, "Invalid action.")
        return redirect('hdts:manage_pending_users')

    user_to_update.save(update_fields=['status', 'approved_at', 'rejected_at', 'approved_by', 'rejected_by']) # Save status and audit fields

    return redirect('hdts:manage_pending_users') # Redirect back to the management page


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pending_users_api(request):
    """
    API endpoint to get pending HDTS Employee registrations.
    Returns JSON data for frontend consumption.
    """
    # Find users who have the Employee role in the 'hdts' system AND have status='Pending'
    pending_users = User.objects.filter(
        status='Pending',
        system_roles__system__slug='hdts',
        system_roles__role__name='Employee'
    ).distinct()
    
    serializer = UserProfileSerializer(pending_users, many=True)
    return Response({
        'count': pending_users.count(),
        'users': serializer.data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_hdts_users_api(request):
    """
    API endpoint to get all HDTS users (both system users and employees).
    Returns JSON data for frontend consumption.
    Includes:
    - System users with HDTS roles (Admin, Ticket Coordinator, etc.)
    - HDTS Employees (role: 'Employee')
    All data follows uniform shape matching the User model serialization.
    """
    from django.utils import timezone
    from .models import Employees
    
    # Find all users who have any role in the 'hdts' system
    hdts_users = User.objects.filter(
        system_roles__system__slug='hdts'
    ).distinct()
    
    serializer = UserProfileSerializer(hdts_users, many=True)
    users_data = serializer.data
    
    # Include HDTS employees in the same format
    hdts_employees = Employees.objects.all()
    
    employees_data = []
    for emp in hdts_employees:
        employees_data.append({
            'id': emp.id,
            'email': emp.email,
            'username': emp.username,
            'first_name': emp.first_name,
            'middle_name': emp.middle_name or None,
            'last_name': emp.last_name,
            'suffix': emp.suffix,
            'phone_number': emp.phone_number,
            'company_id': emp.company_id,
            'department': emp.department,
            'status': emp.status,
            'notified': emp.notified,
            'is_active': True,  # Employees can login by default
            'profile_picture': str(emp.profile_picture.url) if emp.profile_picture else None,
            'date_joined': emp.created_at.isoformat() if emp.created_at else None,
            'otp_enabled': emp.otp_enabled,
            'system_roles': [
                {
                    'id': emp.id,
                    'system_name': 'Help Desk and Ticketing System',
                    'system_slug': 'hdts',
                    'role_name': 'Employee',
                    'assigned_at': emp.created_at.isoformat() if emp.created_at else None,
                    'last_logged_on': emp.last_login.isoformat() if emp.last_login else None,
                    'is_active': True  # Employee role is active
                }
            ]
        })
    
    return Response({
        'count': len(users_data) + len(employees_data),
        'system_users_count': len(users_data),
        'employees_count': len(employees_data),
        'users': users_data,
        'all_users': users_data + employees_data
    })

    user_to_update.save(update_fields=['status']) # Only save the status field

    return redirect('hdts:manage_pending_users') # Redirect back to the management page


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_hdts_user_profile_by_id(request, user_id: int):
    """
    Read-only endpoint to fetch a basic user profile by ID for users who belong to the HDTS system.
    This is intended for internal integrations (e.g., HDTS backend) that need to display
    another user's name/department/company_id given only a cookie user_id.

    Security: requires authentication and only returns data for users who are members of the HDTS system.
    """
    # Ensure the target user exists and belongs to the HDTS system
    target_user = get_object_or_404(User, pk=user_id)
    is_hdts_member = UserSystemRole.objects.filter(user=target_user, system__slug='hdts').exists()
    if not is_hdts_member:
        return Response({"error": "User not found in HDTS"}, status=404)

    data = UserProfileSerializer(target_user, context={'request': request}).data
    # Optionally reduce fields if needed; for now return full profile serializer
    return Response(data)
