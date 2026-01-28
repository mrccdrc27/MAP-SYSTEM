# auth/hdts/views.py

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
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
from .serializers import EmployeeProfileSerializer
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
@csrf_exempt  # Exempt from CSRF for API calls from frontend
def update_user_status_view(request, user_id):
    """
    Handles the POST request to approve or reject a user.
    Accepts both form-encoded and JSON data.
    Updates both User and Employees tables for consistency.
    """
    from django.utils import timezone
    from .models import Employees
    
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    # Parse action from either form data or JSON
    try:
        if request.content_type == 'application/json':
            data = json.loads(request.body)
            action = data.get('action')
        else:
            action = request.POST.get('action')
    except json.JSONDecodeError:
        action = request.POST.get('action')
    
    # Try to find in User table first, then Employees table
    user_to_update = None
    employee_to_update = None
    
    try:
        user_to_update = User.objects.get(id=user_id)
    except User.DoesNotExist:
        pass
    
    try:
        employee_to_update = Employees.objects.get(id=user_id)
    except Employees.DoesNotExist:
        pass
    
    if not user_to_update and not employee_to_update:
        return JsonResponse({'error': 'User not found'}, status=404)
    
    # Check if either is pending
    is_user_pending = user_to_update and user_to_update.status == 'Pending'
    is_employee_pending = employee_to_update and employee_to_update.status == 'Pending'
    
    if not is_user_pending and not is_employee_pending:
        return JsonResponse({'error': 'User is no longer pending'}, status=400)
    
    if action not in ['approve', 'reject']:
        return JsonResponse({'error': 'Invalid action'}, status=400)
    
    # Update User table if exists
    if user_to_update:
        user_to_update.status = 'Approved' if action == 'approve' else 'Rejected'
        user_to_update.status_at = timezone.now()
        user_to_update.status_by = request.user
        user_to_update.save(update_fields=['status', 'status_at', 'status_by'])
    
    # Update Employees table if exists
    if employee_to_update:
        employee_to_update.status = 'Approved' if action == 'approve' else 'Rejected'
        employee_to_update.updated_at = timezone.now()
        employee_to_update.save(update_fields=['status', 'updated_at'])
    
    status_text = 'approved' if action == 'approve' else 'rejected'
    email = user_to_update.email if user_to_update else employee_to_update.email
    messages.success(request, f"User {email} {status_text}.")
    
    return JsonResponse({
        'success': True,
        'message': f'User {status_text} successfully',
        'user_id': user_id,
        'status': 'Approved' if action == 'approve' else 'Rejected'
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pending_users_api(request):
    """
    API endpoint to get pending HDTS Employee registrations from hdts_employees table.
    Returns JSON data for frontend consumption.
    """
    from .models import Employees
    
    # Find employees with status='Pending' from hdts_employees table
    pending_users = Employees.objects.filter(status='Pending')
    
    serializer = EmployeeProfileSerializer(pending_users, many=True)
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
