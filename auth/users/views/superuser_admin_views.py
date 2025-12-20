"""
Superuser Admin Portal Views - Django session-based authentication for superuser management.

This module provides views for the superuser administration portal:
- Session-based authentication (not JWT)
- User masterlist management (CRUD)
- User import functionality
- No system redirection logic - purely for auth system upkeep
"""

import csv
import io
import logging
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.views.generic import TemplateView, View
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.cache import never_cache
from django.utils.decorators import method_decorator
from django.shortcuts import redirect, render
from django.http import JsonResponse
from django.urls import reverse
from django.contrib import messages
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db.models import Q
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication

from ..models import User
from ..serializers import UserRegistrationSerializer

logger = logging.getLogger(__name__)


class SuperuserRequiredMixin(LoginRequiredMixin, UserPassesTestMixin):
    """
    Mixin that requires the user to be authenticated as a superuser.
    Uses Django session authentication.
    """
    login_url = '/superadmin/login/'
    
    def test_func(self):
        return self.request.user.is_superuser
    
    def handle_no_permission(self):
        if not self.request.user.is_authenticated:
            return redirect(self.login_url)
        # User is authenticated but not a superuser
        messages.error(self.request, 'Access denied. Superuser privileges required.')
        return redirect(self.login_url)


class IsSuperuserSessionAuth(IsAuthenticated):
    """
    Permission class that requires session-authenticated superuser.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_superuser
        )


# ===================== Authentication Views =====================

@method_decorator([csrf_protect, never_cache], name='dispatch')
class SuperAdminLoginView(TemplateView):
    """
    Superuser login view using Django sessions.
    No JWT, no system redirection - purely session-based.
    """
    template_name = 'superadmin/login.html'
    
    def dispatch(self, request, *args, **kwargs):
        # If already authenticated as superuser, redirect to dashboard
        if request.user.is_authenticated and request.user.is_superuser:
            return redirect('superadmin-dashboard')
        return super().dispatch(request, *args, **kwargs)
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['error'] = self.request.GET.get('error', '')
        return context
    
    def post(self, request, *args, **kwargs):
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '')
        
        if not email or not password:
            return render(request, self.template_name, {
                'error': 'Email and password are required.',
                'email': email
            })
        
        # Authenticate user
        user = authenticate(request, username=email, password=password)
        
        if user is None:
            logger.warning(f"Superadmin login failed for email: {email}")
            return render(request, self.template_name, {
                'error': 'Invalid email or password.',
                'email': email
            })
        
        # Check if user is superuser
        if not user.is_superuser:
            logger.warning(f"Non-superuser attempted superadmin login: {email}")
            return render(request, self.template_name, {
                'error': 'Access denied. Superuser privileges required.',
                'email': email
            })
        
        # Check if account is locked
        if user.is_locked:
            return render(request, self.template_name, {
                'error': 'Account is locked. Please contact an administrator.',
                'email': email
            })
        
        # Log the user in using Django session
        login(request, user)
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        logger.info(f"Superuser logged in: {email}")
        return redirect('superadmin-dashboard')


class SuperAdminLogoutView(View):
    """
    Superuser logout view - clears Django session.
    """
    def get(self, request, *args, **kwargs):
        logout(request)
        messages.success(request, 'You have been logged out.')
        return redirect('superadmin-login')
    
    def post(self, request, *args, **kwargs):
        logout(request)
        return redirect('superadmin-login')


# ===================== Dashboard Views =====================

@method_decorator([csrf_protect, never_cache], name='dispatch')
class SuperAdminDashboardView(SuperuserRequiredMixin, TemplateView):
    """
    Main dashboard for superuser administration.
    Shows system overview and quick stats.
    """
    template_name = 'superadmin/dashboard.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # User statistics
        context['total_users'] = User.objects.count()
        context['active_users'] = User.objects.filter(is_active=True).count()
        context['pending_users'] = User.objects.filter(status='Pending').count()
        context['approved_users'] = User.objects.filter(status='Approved').count()
        context['rejected_users'] = User.objects.filter(status='Rejected').count()
        context['superusers'] = User.objects.filter(is_superuser=True).count()
        context['staff_users'] = User.objects.filter(is_staff=True).count()
        context['locked_users'] = User.objects.filter(is_locked=True).count()
        
        # Recent users
        context['recent_users'] = User.objects.order_by('-date_joined')[:10]
        
        return context


@method_decorator([csrf_protect, never_cache], name='dispatch')
class UserMasterlistView(SuperuserRequiredMixin, TemplateView):
    """
    User masterlist management view.
    Lists all users with search, filter, and pagination.
    """
    template_name = 'superadmin/user_masterlist.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Get query parameters
        search = self.request.GET.get('search', '')
        status_filter = self.request.GET.get('status', '')
        is_active = self.request.GET.get('is_active', '')
        is_staff = self.request.GET.get('is_staff', '')
        is_superuser = self.request.GET.get('is_superuser', '')
        page = self.request.GET.get('page', 1)
        per_page = self.request.GET.get('per_page', 25)
        
        # Build query
        queryset = User.objects.all().order_by('-date_joined')
        
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(company_id__icontains=search)
            )
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        if is_active:
            queryset = queryset.filter(is_active=is_active == 'true')
        
        if is_staff:
            queryset = queryset.filter(is_staff=is_staff == 'true')
        
        if is_superuser:
            queryset = queryset.filter(is_superuser=is_superuser == 'true')
        
        # Paginate
        paginator = Paginator(queryset, per_page)
        try:
            users = paginator.page(page)
        except PageNotAnInteger:
            users = paginator.page(1)
        except EmptyPage:
            users = paginator.page(paginator.num_pages)
        
        context['users'] = users
        context['search'] = search
        context['status_filter'] = status_filter
        context['is_active_filter'] = is_active
        context['is_staff_filter'] = is_staff
        context['is_superuser_filter'] = is_superuser
        context['status_choices'] = ['Pending', 'Approved', 'Rejected']
        
        return context


@method_decorator([csrf_protect, never_cache], name='dispatch')
class UserCreateView(SuperuserRequiredMixin, TemplateView):
    """
    Create new user form view.
    """
    template_name = 'superadmin/user_form.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['action'] = 'create'
        context['departments'] = ['IT Department', 'Asset Department', 'Budget Department']
        context['status_choices'] = ['Pending', 'Approved', 'Rejected']
        return context


@method_decorator([csrf_protect, never_cache], name='dispatch')
class UserEditView(SuperuserRequiredMixin, TemplateView):
    """
    Edit existing user form view.
    """
    template_name = 'superadmin/user_form.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user_id = self.kwargs.get('user_id')
        
        try:
            user = User.objects.get(id=user_id)
            context['user_obj'] = user
            context['action'] = 'edit'
            context['departments'] = ['IT Department', 'Asset Department', 'Budget Department']
            context['status_choices'] = ['Pending', 'Approved', 'Rejected']
        except User.DoesNotExist:
            context['error'] = 'User not found'
        
        return context


@method_decorator([csrf_protect, never_cache], name='dispatch')
class UserImportView(SuperuserRequiredMixin, TemplateView):
    """
    Bulk user import view.
    Supports CSV file upload for importing multiple users.
    """
    template_name = 'superadmin/user_import.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['sample_csv_headers'] = [
            'email', 'username', 'password', 'first_name', 'middle_name', 
            'last_name', 'suffix', 'phone_number', 'department', 'status',
            'is_active', 'is_staff'
        ]
        return context


# ===================== API Views (Session-Based) =====================

class SuperAdminSessionAuthentication(SessionAuthentication):
    """
    Custom session authentication that enforces CSRF on all methods.
    """
    def enforce_csrf(self, request):
        # Always enforce CSRF for session-based auth
        return super().enforce_csrf(request)


class SuperAdminAPIView(APIView):
    """
    Base API view for superadmin endpoints.
    Uses session authentication only (no JWT).
    """
    authentication_classes = [SuperAdminSessionAuthentication]
    permission_classes = [IsSuperuserSessionAuth]


class UserListAPIView(SuperAdminAPIView):
    """
    API endpoint to list all users.
    GET /superadmin/api/users/
    """
    
    def get(self, request):
        search = request.GET.get('search', '')
        status_filter = request.GET.get('status', '')
        is_active = request.GET.get('is_active', '')
        page = int(request.GET.get('page', 1))
        per_page = int(request.GET.get('per_page', 25))
        
        queryset = User.objects.all().order_by('-date_joined')
        
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(company_id__icontains=search)
            )
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        if is_active:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Paginate
        paginator = Paginator(queryset, per_page)
        try:
            users_page = paginator.page(page)
        except (PageNotAnInteger, EmptyPage):
            users_page = paginator.page(1)
        
        users_data = []
        for user in users_page:
            users_data.append({
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'middle_name': user.middle_name,
                'last_name': user.last_name,
                'suffix': user.suffix,
                'phone_number': user.phone_number,
                'company_id': user.company_id,
                'department': user.department,
                'status': user.status,
                'is_active': user.is_active,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
                'is_locked': user.is_locked,
                'otp_enabled': user.otp_enabled,
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
            })
        
        return Response({
            'users': users_data,
            'total': paginator.count,
            'page': page,
            'per_page': per_page,
            'total_pages': paginator.num_pages,
        })


class UserDetailAPIView(SuperAdminAPIView):
    """
    API endpoint for single user operations.
    GET /superadmin/api/users/<id>/
    PUT /superadmin/api/users/<id>/
    DELETE /superadmin/api/users/<id>/
    """
    
    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            return Response({
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'middle_name': user.middle_name,
                'last_name': user.last_name,
                'suffix': user.suffix,
                'phone_number': user.phone_number,
                'company_id': user.company_id,
                'department': user.department,
                'status': user.status,
                'is_active': user.is_active,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
                'is_locked': user.is_locked,
                'otp_enabled': user.otp_enabled,
                'failed_login_attempts': user.failed_login_attempts,
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
            })
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    def put(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        data = request.data
        
        # Update allowed fields
        updatable_fields = [
            'username', 'first_name', 'middle_name', 'last_name', 'suffix',
            'phone_number', 'department', 'status', 'is_active', 'is_staff'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(user, field, data[field])
        
        # Handle password update separately
        if 'password' in data and data['password']:
            user.set_password(data['password'])
        
        # Handle is_superuser (only if current user is not editing themselves)
        if 'is_superuser' in data and user.id != request.user.id:
            user.is_superuser = data['is_superuser']
        
        # Handle unlock
        if 'unlock' in data and data['unlock']:
            user.is_locked = False
            user.failed_login_attempts = 0
            user.lockout_time = None
        
        # Update status tracking
        if 'status' in data:
            user.status_by = request.user
            user.status_at = timezone.now()
        
        user.save()
        
        logger.info(f"User {user.email} updated by superuser {request.user.email}")
        
        return Response({
            'message': 'User updated successfully',
            'id': user.id
        })
    
    def delete(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Prevent self-deletion
        if user.id == request.user.id:
            return Response(
                {'error': 'Cannot delete your own account'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        email = user.email
        user.delete()
        
        logger.info(f"User {email} deleted by superuser {request.user.email}")
        
        return Response({'message': 'User deleted successfully'})


class UserCreateAPIView(SuperAdminAPIView):
    """
    API endpoint to create a new user.
    POST /superadmin/api/users/create/
    """
    
    def post(self, request):
        data = request.data
        
        # Validate required fields
        if not data.get('email'):
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not data.get('password'):
            return Response({'error': 'Password is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if email already exists
        if User.objects.filter(email=data['email']).exists():
            return Response({'error': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if username exists (if provided)
        if data.get('username') and User.objects.filter(username=data['username']).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.create_user(
                email=data['email'],
                password=data['password'],
                username=data.get('username'),
                first_name=data.get('first_name', ''),
                middle_name=data.get('middle_name'),
                last_name=data.get('last_name', ''),
                suffix=data.get('suffix'),
                phone_number=data.get('phone_number'),
                department=data.get('department'),
                status=data.get('status', 'Pending'),
                is_active=data.get('is_active', True),
                is_staff=data.get('is_staff', False),
            )
            
            # Set superuser flag if specified
            if data.get('is_superuser'):
                user.is_superuser = True
                user.save()
            
            logger.info(f"User {user.email} created by superuser {request.user.email}")
            
            return Response({
                'message': 'User created successfully',
                'id': user.id,
                'company_id': user.company_id
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserBulkActionAPIView(SuperAdminAPIView):
    """
    API endpoint for bulk user actions.
    POST /superadmin/api/users/bulk/
    """
    
    def post(self, request):
        action = request.data.get('action')
        user_ids = request.data.get('user_ids', [])
        
        if not action:
            return Response({'error': 'Action is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not user_ids:
            return Response({'error': 'No users selected'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Filter out current user from bulk actions
        user_ids = [uid for uid in user_ids if uid != request.user.id]
        
        users = User.objects.filter(id__in=user_ids)
        count = users.count()
        
        if action == 'activate':
            users.update(is_active=True)
            message = f'{count} users activated'
        elif action == 'deactivate':
            users.update(is_active=False)
            message = f'{count} users deactivated'
        elif action == 'approve':
            users.update(status='Approved', status_by=request.user, status_at=timezone.now())
            message = f'{count} users approved'
        elif action == 'reject':
            users.update(status='Rejected', status_by=request.user, status_at=timezone.now())
            message = f'{count} users rejected'
        elif action == 'unlock':
            users.update(is_locked=False, failed_login_attempts=0, lockout_time=None)
            message = f'{count} users unlocked'
        elif action == 'delete':
            users.delete()
            message = f'{count} users deleted'
        else:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"Bulk action '{action}' performed on {count} users by {request.user.email}")
        
        return Response({'message': message, 'count': count})


class UserImportAPIView(SuperAdminAPIView):
    """
    API endpoint to import users from CSV.
    POST /superadmin/api/users/import/
    """
    
    def post(self, request):
        csv_file = request.FILES.get('file')
        
        if not csv_file:
            return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not csv_file.name.endswith('.csv'):
            return Response({'error': 'File must be a CSV'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Decode the file
            decoded_file = csv_file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            
            created = 0
            errors = []
            
            for row_num, row in enumerate(reader, start=2):
                try:
                    email = row.get('email', '').strip()
                    if not email:
                        errors.append(f"Row {row_num}: Email is required")
                        continue
                    
                    if User.objects.filter(email=email).exists():
                        errors.append(f"Row {row_num}: Email {email} already exists")
                        continue
                    
                    password = row.get('password', '').strip()
                    if not password:
                        # Generate a random password if not provided
                        import secrets
                        password = secrets.token_urlsafe(16)
                    
                    user = User.objects.create_user(
                        email=email,
                        password=password,
                        username=row.get('username', '').strip() or None,
                        first_name=row.get('first_name', '').strip(),
                        middle_name=row.get('middle_name', '').strip() or None,
                        last_name=row.get('last_name', '').strip(),
                        suffix=row.get('suffix', '').strip() or None,
                        phone_number=row.get('phone_number', '').strip() or None,
                        department=row.get('department', '').strip() or None,
                        status=row.get('status', 'Pending').strip(),
                        is_active=row.get('is_active', 'true').lower() == 'true',
                        is_staff=row.get('is_staff', 'false').lower() == 'true',
                    )
                    created += 1
                    
                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")
            
            logger.info(f"User import: {created} created, {len(errors)} errors by {request.user.email}")
            
            return Response({
                'message': f'{created} users imported successfully',
                'created': created,
                'errors': errors
            })
            
        except Exception as e:
            logger.error(f"Error importing users: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserExportAPIView(SuperAdminAPIView):
    """
    API endpoint to export users to CSV.
    GET /superadmin/api/users/export/
    """
    
    def get(self, request):
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="users_export_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'id', 'email', 'username', 'first_name', 'middle_name', 'last_name',
            'suffix', 'phone_number', 'company_id', 'department', 'status',
            'is_active', 'is_staff', 'is_superuser', 'is_locked', 'otp_enabled',
            'date_joined', 'last_login'
        ])
        
        users = User.objects.all().order_by('id')
        
        for user in users:
            writer.writerow([
                user.id, user.email, user.username, user.first_name, user.middle_name,
                user.last_name, user.suffix, user.phone_number, user.company_id,
                user.department, user.status, user.is_active, user.is_staff,
                user.is_superuser, user.is_locked, user.otp_enabled,
                user.date_joined.isoformat(), 
                user.last_login.isoformat() if user.last_login else ''
            ])
        
        logger.info(f"User export by {request.user.email}")
        
        return response


class SystemStatsAPIView(SuperAdminAPIView):
    """
    API endpoint to get system statistics.
    GET /superadmin/api/stats/
    """
    
    def get(self, request):
        return Response({
            'total_users': User.objects.count(),
            'active_users': User.objects.filter(is_active=True).count(),
            'inactive_users': User.objects.filter(is_active=False).count(),
            'pending_users': User.objects.filter(status='Pending').count(),
            'approved_users': User.objects.filter(status='Approved').count(),
            'rejected_users': User.objects.filter(status='Rejected').count(),
            'superusers': User.objects.filter(is_superuser=True).count(),
            'staff_users': User.objects.filter(is_staff=True).count(),
            'locked_users': User.objects.filter(is_locked=True).count(),
            'otp_enabled_users': User.objects.filter(otp_enabled=True).count(),
        })


class SessionLoginAPIView(APIView):
    """
    API endpoint for superuser session-based login.
    POST /superadmin/api/login/
    
    This provides a pure API-based login (no templates) for programmatic access.
    Returns session cookie on successful authentication.
    """
    authentication_classes = []  # No authentication required for login
    permission_classes = []
    
    def post(self, request):
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '')
        
        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Authenticate user
        user = authenticate(request, username=email, password=password)
        
        if user is None:
            logger.warning(f"Superadmin API login failed for email: {email}")
            return Response(
                {'error': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check if user is superuser
        if not user.is_superuser:
            logger.warning(f"Non-superuser attempted superadmin API login: {email}")
            return Response(
                {'error': 'Access denied. Superuser privileges required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if account is locked
        if user.is_locked:
            return Response(
                {'error': 'Account is locked. Please contact an administrator.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Log the user in using Django session
        login(request, user)
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        logger.info(f"Superuser API logged in: {email}")
        
        return Response({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_superuser': user.is_superuser,
            }
        })


class SessionCheckAPIView(APIView):
    """
    API endpoint to check if user is authenticated with session.
    GET /superadmin/api/session/
    
    Returns current user info if authenticated as superuser.
    """
    authentication_classes = [SuperAdminSessionAuthentication]
    permission_classes = []  # Will manually check
    
    def get(self, request):
        if not request.user.is_authenticated:
            return Response(
                {'authenticated': False, 'error': 'Not authenticated'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not request.user.is_superuser:
            return Response(
                {'authenticated': False, 'error': 'Not a superuser'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return Response({
            'authenticated': True,
            'user': {
                'id': request.user.id,
                'email': request.user.email,
                'username': request.user.username,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'is_superuser': request.user.is_superuser,
                'is_staff': request.user.is_staff,
            }
        })


class SessionLogoutAPIView(APIView):
    """
    API endpoint to logout from session.
    POST /superadmin/api/logout/
    """
    authentication_classes = [SuperAdminSessionAuthentication]
    permission_classes = []
    
    def post(self, request):
        if request.user.is_authenticated:
            logger.info(f"Superuser API logged out: {request.user.email}")
            logout(request)
        
        return Response({'message': 'Logged out successfully'})

