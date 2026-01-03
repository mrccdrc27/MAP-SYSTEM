# Views package - consolidated imports from modular files
from .views import (
    login_view,
    CreateEmployeeView,
    CreateAdminEmployeeView,
    EmployeeTokenObtainPairView,
    AdminTokenObtainPairView,
    deny_employee,
    create_employee_admin_view,
    approve_employee,
    ApproveEmployeeView,
    employee_profile_view,
    list_employees,
    get_employee,
    get_user_activity_logs,
    change_password,
    verify_password,
    upload_profile_image,
    TicketViewSet,
    get_ticket_detail,
    get_ticket_by_number,
    add_ticket_comment,
    approve_ticket,
    reject_ticket,
    claim_ticket,
    update_ticket_status,
    withdraw_ticket,
    submit_csat_rating,
    get_csat_feedback,
    get_new_tickets,
    get_open_tickets,
    get_my_tickets,
    download_attachment,
    finalize_ticket,
    custom_api_root,
    KnowledgeArticleViewSet,
    serve_protected_media,
    test_jwt_view,
)

# Legacy imports to maintain backward compatibility
from .views.helpers import (
    get_external_employee_data,
    get_user_display_name,
    _actor_display_name,
    generate_company_id,
)

from .views.permissions import (
    IsSystemAdmin,
    IsAdminOrSystemAdmin,
    IsAdminOrCoordinator,
    IsEmployee,
    IsEmployeeOrAdmin,
)

from .views.email_templates import (
    send_account_approved_email,
    send_account_rejected_email,
    send_account_pending_email,
)

__all__ = [
    'login_view',
    'CreateEmployeeView',
    'CreateAdminEmployeeView',
    'EmployeeTokenObtainPairView',
    'AdminTokenObtainPairView',
    'deny_employee',
    'create_employee_admin_view',
    'approve_employee',
    'ApproveEmployeeView',
    'employee_profile_view',
    'list_employees',
    'get_employee',
    'get_user_activity_logs',
    'change_password',
    'verify_password',
    'upload_profile_image',
    'TicketViewSet',
    'get_ticket_detail',
    'get_ticket_by_number',
    'add_ticket_comment',
    'approve_ticket',
    'reject_ticket',
    'claim_ticket',
    'update_ticket_status',
    'withdraw_ticket',
    'submit_csat_rating',
    'get_csat_feedback',
    'get_new_tickets',
    'get_open_tickets',
    'get_my_tickets',
    'download_attachment',
    'finalize_ticket',
    'custom_api_root',
    'KnowledgeArticleViewSet',
    'serve_protected_media',
    'test_jwt_view',
    'get_external_employee_data',
    'get_user_display_name',
    '_actor_display_name',
    'generate_company_id',
    'IsSystemAdmin',
    'IsAdminOrSystemAdmin',
    'IsAdminOrCoordinator',
    'IsEmployee',
    'IsEmployeeOrAdmin',
    'send_account_approved_email',
    'send_account_rejected_email',
    'send_account_pending_email',
]

# Below is kept for historical/reference purposes
# Helper function to get external employee data from the synced model
def _get_external_employee_data_legacy(user_id):
    """
    Get external employee data from the ExternalEmployee model (synced from auth2).
    Returns employee data dict or empty dict if not found.
    """
    try:
        from .models import ExternalEmployee
        employee = ExternalEmployee.objects.filter(
            external_user_id=user_id
        ).first() or ExternalEmployee.objects.filter(
            company_id=str(user_id)
        ).first()
        
        if employee:
            return {
                'id': employee.external_user_id or employee.company_id,
                'first_name': employee.first_name,
                'last_name': employee.last_name,
                'email': employee.email,
                'company_id': employee.company_id,
                'department': employee.department,
                'image': str(employee.image.url) if employee.image else None,
            }
    except Exception as e:
        pass
    
    return {}

# Permission classes
class IsSystemAdmin(BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, 'role') and request.user.role == "System Admin"

class IsAdminOrSystemAdmin(BasePermission):
    """Permission class that allows both Admin and System Admin roles"""
    def has_permission(self, request, view):
        if not hasattr(request.user, 'role'):
            return False
        return request.user.role in ["Admin", "System Admin"]

class IsAdminOrCoordinator(BasePermission):
    """Permission class that allows Admin, System Admin, and Ticket Coordinator"""
    def has_permission(self, request, view):
        if not hasattr(request.user, 'role'):
            return False
        return request.user.role in ["Admin", "System Admin", "Ticket Coordinator"]

class IsEmployee(BasePermission):
    """Permission class for HDTS employees (JWT employees or local Employee objects)"""
    def has_permission(self, request, view):
        if not hasattr(request.user, 'is_authenticated') or not request.user.is_authenticated:
            return False
        
        # Allow ExternalUser with user_type='employee'
        if isinstance(request.user, ExternalUser):
            return getattr(request.user, 'user_type', None) == 'employee'
        
        # Allow local Employee objects
        from .models import Employee
        return isinstance(request.user, Employee)

class IsEmployeeOrAdmin(BasePermission):
    """Permission class that allows employees and admins/coordinators"""
    def has_permission(self, request, view):
        if not hasattr(request.user, 'is_authenticated') or not request.user.is_authenticated:
            return False
        
        # Allow ExternalUser employees
        if isinstance(request.user, ExternalUser):
            user_type = getattr(request.user, 'user_type', None)
            role = getattr(request.user, 'role', None)
            return user_type == 'employee' or role in ["Admin", "System Admin", "Ticket Coordinator"]
        
        # Allow local Employee or admin staff
        from .models import Employee
        if isinstance(request.user, Employee):
            return True
        
        # Allow staff/admin
        return request.user.is_staff or getattr(request.user, 'role', None) in ['System Admin', 'Ticket Coordinator', 'Admin']

def get_user_display_name(user):
    """
    Helper function to safely get a user's display name.
    Handles both Employee and ExternalUser objects.
    """
    if isinstance(user, ExternalUser):
        # Prefer real first/last name from the external auth profile
        first = getattr(user, 'first_name', None) or ''
        last = getattr(user, 'last_name', None) or ''
        full = f"{first} {last}".strip()
        if full:
            return full
        # As a fallback, avoid using email handle; show generic label
        return 'External User'
    else:
        # Regular Employee user
        if hasattr(user, 'company_id') and user.company_id:
            return user.company_id
        elif hasattr(user, 'first_name') and hasattr(user, 'last_name'):
            return f"{user.first_name} {user.last_name}"
        else:
            return getattr(user, 'email', 'Unknown User')

def _actor_display_name(request):
    """
    Resolve a human-friendly actor display name for Messages text.
    For ExternalUser, prefer First Last from the auth profile; never use email handle.
    Falls back to 'External User' when names are unavailable.
    For local Employee, reuse get_user_display_name behavior.
    """
    user = getattr(request, 'user', None)
    if isinstance(user, ExternalUser):
        first = getattr(user, 'first_name', '') or ''
        last = getattr(user, 'last_name', '') or ''
        full = f"{first} {last}".strip()
        if not full:
            # Attempt to fetch profile from ExternalEmployee model
            try:
                profile = get_external_employee_data(user.id)
            except Exception:
                profile = {}
            first = (profile or {}).get('first_name') or ''
            last = (profile or {}).get('last_name') or ''
            full = f"{first} {last}".strip()
        return full or 'External User'
    # Local employee path
    return get_user_display_name(user)

@api_view(['PATCH'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsAdminOrCoordinator])
def deny_employee(request, pk):
    try:
        employee = Employee.objects.get(pk=pk)
    except Employee.DoesNotExist:
        return Response({'detail': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)
    if employee.status == 'Denied':
        return Response({'detail': 'Already denied.'}, status=status.HTTP_400_BAD_REQUEST)
    employee.status = 'Denied'
    employee.save()
    # Log rejection action
    try:
        from .models import EmployeeLog
        EmployeeLog.objects.create(employee=employee, action='rejected', performed_by=request.user, details='Account rejected by admin')
    except Exception:
        pass
    
    # Send rejection email (non-blocking). Uses unified sender (Gmail API when enabled).
    try:
        from .gmail_utils import send_email
        html = send_account_rejected_email(employee)
        result = send_email(
            to=employee.email,
                subject='Account Creation Unsuccessful',
            body=html,
            is_html=True,
                from_email='noreply.mapactivephteam@gmail.com'
        )
        print(f"[deny_employee] send_email result: {result}")
    except Exception as e:
        print(f"[deny_employee] Email send failed: {e}")
    return Response({'detail': 'Employee denied.'}, status=status.HTTP_200_OK)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, viewsets
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import Employee, Ticket, TicketAttachment, TicketComment, ActivityLog
from .models import PRIORITY_LEVELS, DEPARTMENT_CHOICES
from .serializers import EmployeeSerializer, TicketSerializer, TicketAttachmentSerializer, AdminTokenObtainPairSerializer, MyTokenObtainPairSerializer, CustomTokenObtainPairSerializer, ActivityLogSerializer
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes, parser_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, BasePermission
from django.shortcuts import get_object_or_404
import json
import os
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
from django.core.mail import send_mail
from rest_framework.reverse import reverse
from .tasks import push_ticket_to_workflow
from .models import EmployeeLog

@csrf_exempt
def login_view(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')

        user = authenticate(request, email=email, password=password)
        if user is not None:
            return JsonResponse({
                'success': True,
                'first_name': user.first_name,
                'message': 'Login successful'
            })
        else:
            return JsonResponse({'success': False, 'message': 'Invalid credentials'})

# For employee registration
class CreateEmployeeView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    def post(self, request, *args, **kwargs):
        data = request.data.copy()
        # If a multipart/form-data POST included an uploaded image, attach it
        # to the data dict so the serializer will receive the file under
        # the 'image' key and save it on the model.
        image_file = None
        try:
            image_file = request.FILES.get('image')
        except Exception:
            image_file = None
        if image_file:
            # request.data is a QueryDict; setting this key will allow the
            # ModelSerializer to pick up the file if it declares an ImageField
            data['image'] = image_file
        password = data.get("password")
        confirm_password = data.get("confirm_password")

        if password != confirm_password:
            return Response(
                {"error": "Passwords do not match."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = EmployeeSerializer(data=data)
        if serializer.is_valid():
            try:
                employee = serializer.save()
                # Create a log entry for account creation
                try:
                    EmployeeLog.objects.create(employee=employee, action='created', performed_by=request.user if hasattr(request, 'user') and request.user.is_authenticated else None, details='Account registered via public create endpoint')
                except Exception:
                    pass
                # Send pending-approval email to the registrant (non-blocking)
                try:
                    from .gmail_utils import send_email
                    # Build HTML from the template helper in this module
                    pending_html = send_account_pending_email(employee)
                    # Prefer DEFAULT_FROM_EMAIL if configured
                    try:
                        from django.conf import settings
                        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None)
                    except Exception:
                        from_email = None
                    send_email(
                        to=employee.email,
                        subject='Account Creation Pending Approval',
                        body=pending_html,
                        is_html=True,
                        from_email=from_email or 'mapactivephsmartsupport@gmail.com'
                    )
                except Exception as e:
                    print(f"[CreateEmployeeView] pending email send failed: {e}")
                # Return serialized employee data so frontend can persist profile (image URL, names, etc.)
                serialized = EmployeeSerializer(employee).data
                return Response(
                    {"message": "Account created successfully. Pending approval.", "employee": serialized},
                    status=status.HTTP_201_CREATED
                )
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CreateAdminEmployeeView(APIView):
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def post(self, request, *args, **kwargs):
        data = request.data.copy()

        # Auto-generate Company ID (find lowest available MA number)
        existing_ids = Employee.objects.filter(company_id__startswith='MA').values_list('company_id', flat=True)
        used_numbers = set()
        for cid in existing_ids:
            try:
                used_numbers.add(int(cid[2:]))
            except Exception:
                pass
        # Find the lowest unused number
        new_num = 1
        while new_num in used_numbers:
            new_num += 1
        data['company_id'] = f"MA{new_num:04d}"

        # Set default password
        data['password'] = "permission denied4"

        # Set status to Approved
        data['status'] = "Approved"

        # Remove image field if not present or empty, so model default is used
        if not data.get('image'):
            data.pop('image', None)

        serializer = EmployeeSerializer(data=data)
        if serializer.is_valid():
            employee = serializer.save()
            # Log admin-created and approved employee
            try:
                EmployeeLog.objects.create(employee=employee, action='created', performed_by=request.user, details='Account created by admin')
                EmployeeLog.objects.create(employee=employee, action='approved', performed_by=request.user, details='Account automatically approved by admin')
            except Exception:
                pass
            return Response({
                "message": "Employee account created and approved successfully",
                "company_id": employee.company_id
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ✅ Token view for employee login (only employees)
class EmployeeTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer  # restricts login to approved non-admin users

class AdminTokenObtainPairView(TokenObtainPairView):
    serializer_class = AdminTokenObtainPairSerializer

class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    authentication_classes = [
        CookieJWTAuthentication, 
        JWTAuthentication
    ]
    permission_classes = [IsEmployeeOrAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]  # Accept JSON and form uploads

    
    def get_queryset(self):
        user = self.request.user
        if isinstance(user, ExternalUser):
            # Admin and Ticket Coordinator see all tickets
            if user.role in ['Admin', 'Ticket Coordinator', 'System Admin']:
                return Ticket.objects.all().order_by('-submit_date')
            # Regular employees see only their own tickets
            return Ticket.objects.filter(employee_cookie_id=user.id).order_by('-submit_date')
        # For Django User model (legacy)
        if hasattr(user, 'role') and user.role in ['System Admin', 'Ticket Coordinator', 'Admin']:
            return Ticket.objects.all().order_by('-submit_date')
        return Ticket.objects.filter(employee=user).order_by('-submit_date')
    
    def create(self, request, *args, **kwargs):
        # Top-level debug wrapper: log incoming files and catch unexpected
        # exceptions to print full traceback for diagnosis.
        try:
            print("[TicketViewSet.create] Enter create()")

            # Enumerate files for diagnostics (non-fatal)
            try:
                files_preview = request.FILES.getlist('files[]') if hasattr(request, 'FILES') else []
                print(f"[TicketViewSet.create] incoming files count: {len(files_preview)}")
                for i, f in enumerate(files_preview):
                    try:
                        print(f"  - file[{i}] class={f.__class__.__name__} name={getattr(f, 'name', None)} size={getattr(f, 'size', None)} content_type={getattr(f, 'content_type', None)}")
                    except Exception:
                        print(f"  - file[{i}] (metadata unavailable)")
            except Exception:
                print("[TicketViewSet.create] unable to enumerate request.FILES")

            # Make a safe, shallow copy of incoming non-file form data.
            # Avoid deepcopy of request.data because it may include UploadedFile
            # objects (TemporaryUploadedFile) which are not picklable and will
            # raise during a deep copy.
            try:
                content_type = getattr(request, 'content_type', '') or ''
                if content_type.startswith('multipart') and hasattr(request, 'POST'):
                    # Multipart form: use POST (excludes files) which is safe to copy
                    data = request.POST.copy()
                else:
                    # JSON or other content: make a shallow dict copy
                    try:
                        data = dict(request.data)
                    except Exception:
                        # Fallback: try the QueryDict shallow copy
                        data = request.data.copy() if hasattr(request.data, 'copy') else {}
            except Exception:
                # As a last resort, use an empty dict to avoid crashing
                data = {}

            # If frontend sent dynamic_data as a JSON string, parse it
            dynamic = data.get('dynamic_data')
            parsed_dynamic = None
            if dynamic:
                if isinstance(dynamic, (str, bytes)):
                    try:
                        parsed_dynamic = json.loads(dynamic)
                    except Exception:
                        parsed_dynamic = None
                elif isinstance(dynamic, dict):
                    parsed_dynamic = dynamic

            # Sanitize date-like fields inside parsed_dynamic
            if isinstance(parsed_dynamic, dict):
                dd = parsed_dynamic
                dynamic_date_keys = ['expectedReturnDate', 'performanceStartDate', 'performanceEndDate', 'scheduledDate']
                from datetime import datetime
                for dk in dynamic_date_keys:
                    if dk in dd:
                        v = dd.get(dk)
                        if v is None:
                            continue
                        if not isinstance(v, str):
                            continue
                        s = v.strip()
                        if s == '' or all(c in '“”\"\'' for c in s):
                            dd[dk] = None
                            continue
                        if 'T' in s:
                            s = s.split('T')[0]
                        s = s.replace('/', '-')
                        try:
                            datetime.fromisoformat(s)
                            dd[dk] = s
                        except Exception:
                            dd[dk] = None

            # Convert request.data (QueryDict) to a plain dict so serializer sees proper types
            plain_data = {k: data.get(k) for k in data.keys()}
            if parsed_dynamic is not None:
                plain_data['dynamic_data'] = parsed_dynamic

            # Sanitize date fields coming from the frontend
            date_keys = [
                'expected_return_date', 'performance_start_date',
                'performance_end_date', 'scheduled_date'
            ]
            from datetime import datetime
            for dk in date_keys:
                if dk in plain_data:
                    val = plain_data.get(dk)
                    if val is None:
                        continue
                    if not isinstance(val, str):
                        continue
                    s = val.strip()
                    if s == '' or all(c in '“”\"\'' for c in s):
                        plain_data[dk] = None
                        continue
                    if 'T' in s:
                        s = s.split('T')[0]
                    s = s.replace('/', '-')
                    try:
                        datetime.fromisoformat(s)
                        plain_data[dk] = s
                    except Exception:
                        plain_data[dk] = None

            # Handle file uploads separately
            files = request.FILES.getlist('files[]') if hasattr(request, 'FILES') else []

            serializer = self.get_serializer(data=plain_data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = self.perform_create(serializer)

            # Process multiple file attachments. Wrap in try/except to avoid
            # a single attachment error (or unexpected pickling/worker issue)
            # from causing the entire ticket creation to fail.
            created_attachments = []
            attachment_errors = []
            for idx, file in enumerate(files):
                try:
                    # Debug: log file class and attributes to help diagnose pickling errors
                    try:
                        print(f"[TicketViewSet.create] attachment[{idx}] class={file.__class__.__name__} name={getattr(file, 'name', None)} size={getattr(file, 'size', None)} content_type={getattr(file, 'content_type', None)}")
                    except Exception:
                        pass

                    ta = TicketAttachment.objects.create(
                        ticket=instance,
                        file=file,
                        file_name=getattr(file, 'name', '') or '',
                        file_type=getattr(file, 'content_type', '') or '',
                        file_size=getattr(file, 'size', 0) or 0,
                        uploaded_by=request.user if not isinstance(request.user, ExternalUser) else None
                    )
                    created_attachments.append(ta)
                except Exception as attach_err:
                    # Don't raise — log and continue. Return attachment error info in debug mode.
                    import traceback
                    traceback.print_exc()
                    err_msg = str(attach_err)
                    print(f"[TicketViewSet.create] Failed to save attachment[{idx}]: {err_msg}")
                    attachment_errors.append({
                        'index': idx,
                        'name': getattr(file, 'name', None),
                        'error': err_msg,
                        'class': file.__class__.__name__ if hasattr(file, '__class__') else None
                    })

            # Debug logging to help verify file uploads in dev
            try:
                print(f"[TicketViewSet.create] received {len(files)} files, created {len(created_attachments)} attachments for ticket id={instance.id}")
                for ta in created_attachments:
                    print(f"  - attachment: {ta.file_name} -> {getattr(ta.file, 'url', None)}")
            except Exception:
                pass

            # Re-serialize the instance so the response includes the newly created attachments
            try:
                from .serializers import TicketSerializer
                serialized = TicketSerializer(instance, context={'request': request}).data
            except Exception:
                serialized = serializer.data

            # If any attachment save errors occurred, expose them under a debug key
            try:
                if attachment_errors:
                    serialized['_attachment_errors'] = attachment_errors
            except Exception:
                pass

            headers = self.get_success_headers(serialized)
            return Response(serialized, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            # Print full traceback to server logs for diagnosis
            import traceback
            traceback.print_exc()
            # Return a sanitized error to the client but include a short message
            return Response({'error': 'Internal server error while creating ticket', 'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def perform_create(self, serializer):
        if isinstance(self.request.user, ExternalUser):
            # ExternalUser now contains complete profile info from auth service
            user = self.request.user
            print(f"[perform_create] ExternalUser profile: {user.first_name} {user.last_name}, {user.department}, {user.company_id}")
            
            # No need for complex matching - just save with cookie_id
            # The ticket serialization will use the ExternalUser's profile data directly
            ticket = serializer.save(employee=None, employee_cookie_id=user.id)
            # We cannot reliably create ActivityLog for external users (no local Employee record)
            return ticket
        else:
            ticket = serializer.save(employee=self.request.user)
            # Create an activity log entry for ticket creation
            try:
                ActivityLog.objects.create(
                    user=ticket.employee,
                    action_type='ticket_created',
                    message=f'Created new ticket: {ticket.subject}',
                    ticket=ticket,
                    actor=self.request.user if hasattr(self.request, 'user') else None,
                    metadata={'category': ticket.category}
                )
            except Exception:
                pass
            return ticket
        
    def perform_update(self, serializer):
        instance = serializer.instance
        old_status = instance.status
        new_status = serializer.validated_data.get('status', old_status)
        if old_status != new_status:
            # Status change logic
            if new_status == 'Closed' and old_status != 'Closed':
                serializer.validated_data['time_closed'] = timezone.now()
                if instance.submit_date:
                    serializer.validated_data['resolution_time'] = timezone.now() - instance.submit_date
            # Create an activity log for the status change
            try:
                ActivityLog.objects.create(
                    user=instance.employee,
                    action_type='status_changed',
                    message=f'Status changed from {old_status} to {new_status}',
                    ticket=instance,
                    actor=self.request.user if hasattr(self.request, 'user') else None,
                    metadata={'previous_status': old_status, 'new_status': new_status}
                )
            except Exception:
                pass

        serializer.save()


def generate_company_id():
    last_employee = Employee.objects.filter(company_id__startswith='MA').order_by('company_id').last()
    if last_employee:
        last_num = int(last_employee.company_id[2:])
        new_num = last_num + 1
    else:
        new_num = 1
    return f"MA{new_num:04d}"

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_employee_admin_view(request):
    data = request.data.copy()
    data['company_id'] = generate_company_id()
    data['password'] = 'permission denied4'  # Default password
    data['status'] = 'Pending'

    # Remove 'image' from data — let model default take over
    data.pop('image', None)

    serializer = EmployeeSerializer(data=data)
    if serializer.is_valid():
        employee = serializer.save()
        return Response({
            'message': 'Account created successfully.',
            'company_id': employee.company_id
        }, status=status.HTTP_201_CREATED)
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PATCH'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def employee_profile_view(request):
    """
    GET: return current user's profile
    PATCH: partially update current user's profile (multipart/form-data or JSON).
    Password updates should go through the change_password endpoint, but if a
    'password' field is included here we will set it securely.
    """
    user = request.user

    if request.method == 'GET':
        # If user is ExternalUser (cookie auth from external service), return a
        # minimal profile dict matching the expected frontend shape. External users
        # don't have an Employee record in this database.
        if isinstance(user, ExternalUser):
            return Response({
                'id': user.id,
                'email': user.email,
                'role': user.role,
                'first_name': getattr(user, 'first_name', '') or '',
                'last_name': getattr(user, 'last_name', '') or '',
                'middle_name': '',
                'suffix': '',
                'company_id': '',
                'department': '',
                'image': None,
                'status': 'Approved'
            })
        
        # Local Employee user (standard JWT or session auth)
        serializer = EmployeeSerializer(user)
        return Response(serializer.data)

    # PATCH - update fields
    data = request.data.copy()

    # Handle password separately to ensure proper hashing
    new_password = None
    if 'password' in data:
        new_password = data.pop('password')

    # If an uploaded image was sent, attach it so serializer will accept it
    try:
        image_file = request.FILES.get('image')
    except Exception:
        image_file = None
    if image_file:
        data['image'] = image_file

    serializer = EmployeeSerializer(user, data=data, partial=True)
    if serializer.is_valid():
        employee = serializer.save()
        if new_password:
            employee.set_password(new_password)
            employee.save()
        return Response(EmployeeSerializer(employee).data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsEmployeeOrAdmin])
def get_ticket_detail(request, ticket_id):
    """
    Get detailed information about a specific ticket including employee data and comments
    """
    try:
        ticket = get_object_or_404(Ticket, id=ticket_id)
        user = request.user
        # ExternalUser: allow all if role is Ticket Coordinator or Admin
        if isinstance(user, ExternalUser):
            if user.role in ['Ticket Coordinator', 'Admin']:
                pass  # allow all
            elif getattr(ticket, 'employee_cookie_id', None) != user.id:
                return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)
        # Internal user: allow if staff, admin, coordinator, or ticket owner
        elif not (user.is_staff or getattr(user, 'role', None) in ['System Admin', 'Ticket Coordinator'] or user == ticket.employee):
            return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)

        # Get comments based on user role
        if getattr(user, 'role', None) in ['System Admin', 'Ticket Coordinator'] or getattr(user, 'is_staff', False):
            comments = ticket.comments.all().order_by('-created_at')
        else:
            comments = ticket.comments.filter(is_internal=False).order_by('-created_at')

        # Serialize ticket data
        ticket_data = {
            'id': ticket.id,
            'ticket_number': ticket.ticket_number,
            'subject': ticket.subject,
            'category': ticket.category,
            'sub_category': ticket.sub_category,
            'description': ticket.description,
            'attachments': TicketAttachmentSerializer(ticket.attachments.all(), many=True).data,
            'status': ticket.status,
            'priority': ticket.priority,
            'priorityLevel': ticket.priority,  # Frontend expects priorityLevel
            'department': ticket.department,
            'submit_date': ticket.submit_date,
            'update_date': ticket.update_date,
            'assigned_to': {
                'id': ticket.assigned_to.id,
                'first_name': ticket.assigned_to.first_name,
                'last_name': ticket.assigned_to.last_name,
            } if ticket.assigned_to else None,
        }
        
        # Handle employee data - with ExternalUser profile fetching
        employee_data = None
        if ticket.employee:
            employee_data = {
                'id': ticket.employee.id,
                'first_name': ticket.employee.first_name,
                'last_name': ticket.employee.last_name,
                'company_id': ticket.employee.company_id,
                'department': ticket.employee.department,
                'email': ticket.employee.email,
                'employee_cookie_id': getattr(ticket, 'employee_cookie_id', None)
            }
        elif getattr(ticket, 'employee_cookie_id', None):
            # Get profile from synced ExternalEmployee model
            profile = get_external_employee_data(ticket.employee_cookie_id)
            employee_data = {
                'id': ticket.employee_cookie_id,
                'first_name': profile.get('first_name'),
                'last_name': profile.get('last_name'),
                'company_id': profile.get('company_id'),
                'department': profile.get('department'),
                'email': profile.get('email'),
                'employee_cookie_id': ticket.employee_cookie_id
            }
        else:
            employee_data = {
                'id': None,
                'first_name': None,
                'last_name': None,
                'company_id': None,
                'department': None,
                'email': None,
                'employee_cookie_id': None
            }
        
        ticket_data['employee'] = employee_data
        ticket_data['approved_by'] = ticket.approved_by if hasattr(ticket, 'approved_by') else None
        ticket_data['comments'] = []
        for comment in comments:
            # Default user payload
            user_payload = {
                'id': comment.user.id if comment.user else comment.user_cookie_id,
                'first_name': '',
                'last_name': '',
                'role': 'Employee'
            }

            if comment.user:
                # Local Employee commenter
                user_payload['first_name'] = getattr(comment.user, 'first_name', '') or ''
                user_payload['last_name'] = getattr(comment.user, 'last_name', '') or ''
                user_payload['role'] = getattr(comment.user, 'role', 'Employee')
            else:
                # External commenter (cookie id)
                emp_cookie_id = getattr(ticket, 'employee_cookie_id', None)
                if emp_cookie_id is not None and comment.user_cookie_id != emp_cookie_id:
                    # Staff/external support — label depends on viewer
                    is_admin_viewer = getattr(request.user, 'is_staff', False) or (getattr(request.user, 'role', None) in ['System Admin', 'Ticket Coordinator', 'Admin'])
                    label = 'Coordinator' if is_admin_viewer else 'Support Team'
                    user_payload['first_name'] = label
                    user_payload['last_name'] = ''
                    user_payload['role'] = 'Support'
                else:
                    # Ticket owner (external) — resolve profile for proper First/Last
                    profile = get_external_employee_data(comment.user_cookie_id)
                    user_payload['first_name'] = profile.get('first_name') or ''
                    user_payload['last_name'] = profile.get('last_name') or ''
                    user_payload['role'] = 'Employee'

            ticket_data['comments'].append({
                'id': comment.id,
                'comment': comment.comment,
                'created_at': comment.created_at,
                'is_internal': comment.is_internal,
                'user': user_payload
            })
        
        # Include dynamic and explicit IT/asset fields so frontend can display IT Support form values
        try:
            ticket_data['dynamic_data'] = ticket.dynamic_data
        except Exception:
            ticket_data['dynamic_data'] = None

        # explicit fields mapped by serializer/create
        ticket_data.update({
            'asset_name': ticket.asset_name,
            'serial_number': ticket.serial_number,
            'location': ticket.location,
            'expected_return_date': ticket.expected_return_date,
            'issue_type': ticket.issue_type,
            'other_issue': ticket.other_issue,
            'performance_start_date': ticket.performance_start_date,
            'performance_end_date': ticket.performance_end_date,
            'cost_items': ticket.cost_items,
            'requested_budget': ticket.requested_budget,
            # Budget-specific metadata
            'fiscal_year': ticket.fiscal_year,
            'department_input': ticket.department_input,
            # Include coordinator resolution
            'coordinator': None,
            'rejected_by': ticket.rejected_by if hasattr(ticket, 'rejected_by') else None,
        })

        # Include CSAT and completion metadata when available
        try:
            ticket_data['date_completed'] = ticket.date_completed if hasattr(ticket, 'date_completed') else None
        except Exception:
            ticket_data['date_completed'] = None
        try:
            ticket_data['csat_rating'] = ticket.csat_rating if hasattr(ticket, 'csat_rating') else None
        except Exception:
            ticket_data['csat_rating'] = None
        
        # Try to resolve coordinator from approved_by or rejected_by
        try:
            coord_key = ticket.approved_by if getattr(ticket, 'approved_by', None) else (ticket.rejected_by if getattr(ticket, 'rejected_by', None) else None)
            if coord_key and not ticket_data.get('coordinator'):
                # Try to resolve an Employee by company_id matching coord_key
                coordinator_emp = Employee.objects.filter(company_id=coord_key).first()
                if coordinator_emp:
                    ticket_data['coordinator'] = {
                        'id': coordinator_emp.id,
                        'first_name': coordinator_emp.first_name,
                        'last_name': coordinator_emp.last_name,
                        'company_id': coordinator_emp.company_id,
                        'department': coordinator_emp.department,
                        'email': coordinator_emp.email,
                    }
        except Exception:
            # ignore resolution errors
            pass

        # Fallback: derive coordinator from latest staff comment (internal or external)
        try:
            if not ticket_data.get('coordinator'):
                # Comments already loaded above; ensure newest-first
                staff_comment = None
                for c in comments.order_by('-created_at'):
                    if c.user is not None:
                        if getattr(c.user, 'is_staff', False) or getattr(c.user, 'role', None) in ['System Admin', 'Ticket Coordinator', 'Admin']:
                            staff_comment = c
        
                            
                    else:
                        # External staff vs ticket owner (cookie id mismatch)
                        if getattr(ticket, 'employee_cookie_id', None) is not None and c.user_cookie_id != getattr(ticket, 'employee_cookie_id', None):
                            staff_comment = c
                            break

                if staff_comment is not None:
                    if staff_comment.user is not None:
                        u = staff_comment.user
                        ticket_data['coordinator'] = {
                            'id': u.id,
                            'first_name': getattr(u, 'first_name', ''),
                            'last_name': getattr(u, 'last_name', ''),
                            'company_id': getattr(u, 'company_id', ''),
                            'department': getattr(u, 'department', ''),
                            'email': getattr(u, 'email', ''),
                        }
                    else:
                        prof = get_external_employee_data(staff_comment.user_cookie_id)
                        ticket_data['coordinator'] = {
                            'id': staff_comment.user_cookie_id,
                            'first_name': prof.get('first_name') or '',
                            'last_name': prof.get('last_name') or '',
                            'company_id': prof.get('company_id') or '',
                            'department': prof.get('department') or '',
                            'email': prof.get('email') or '',
                        }
        except Exception:
            pass
        
        return Response(ticket_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_activity_logs(request, user_id):
    """Return ActivityLog entries for a given local Employee id.
    Allowed for System Admins, Ticket Coordinators, staff, or the user themself.
    """
    try:
        user_obj = Employee.objects.filter(id=user_id).first()
        if not user_obj:
            return Response([], status=status.HTTP_200_OK)

        # Permission: allow system admin, admin, ticket coordinator, staff, or the user
        try:
            requester_role = getattr(request.user, 'role', None)
        except Exception:
            requester_role = None

        allowed_roles = ['System Admin', 'Ticket Coordinator', 'Admin']
        is_requester_staff = getattr(request.user, 'is_staff', False)
        is_requester_same = False
        try:
            # Allow when the requester is the same Employee instance
            is_requester_same = (request.user == user_obj)
        except Exception:
            is_requester_same = False

        if not (is_requester_staff or (requester_role in allowed_roles) or is_requester_same):
            # Log minimal debug to server logs to help diagnosis
            try:
                import logging
                logging.getLogger(__name__).warning(
                    'get_user_activity_logs permission denied: requester=%s, role=%s, target_user=%s',
                    getattr(request.user, 'id', None), requester_role, getattr(user_obj, 'id', None)
                )
            except Exception:
                pass
            return Response({'detail': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)

        logs = ActivityLog.objects.filter(user=user_obj).order_by('-timestamp')
        serializer = ActivityLogSerializer(logs, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsEmployeeOrAdmin])
def get_ticket_by_number(request, ticket_number):
    """
    Lookup ticket by its ticket_number (string) and return the same payload as get_ticket_detail.
    """
    try:
        ticket = get_object_or_404(Ticket, ticket_number=ticket_number)
        user = request.user
        # ExternalUser: allow if employee_cookie_id matches user.id
        if isinstance(user, ExternalUser):
            # allow full access for Ticket Coordinator or Admin
            if getattr(user, 'role', None) not in ['Ticket Coordinator', 'Admin']:
                # otherwise, only allow if user owns the ticket
                if str(getattr(ticket, 'employee_cookie_id', '')) != str(user.id):
                    return Response({'error': 'permission deniedz'}, status=status.HTTP_403_FORBIDDEN)
        # Internal user: allow if staff, admin, coordinator, or ticket owner
        elif not (user.is_staff or getattr(user, 'role', None) in ['System Admin', 'Ticket Coordinator'] or user == ticket.employee):
            return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)

        # Get comments based on user role
        if getattr(user, 'role', None) in ['System Admin', 'Ticket Coordinator'] or getattr(user, 'is_staff', False):
            comments = ticket.comments.all().order_by('-created_at')
        else:
            comments = ticket.comments.filter(is_internal=False).order_by('-created_at')

        ticket_data = {
            'id': ticket.id,
            'ticket_number': ticket.ticket_number,
            'subject': ticket.subject,
            'category': ticket.category,
            'sub_category': ticket.sub_category,
            'description': ticket.description,
            'attachments': TicketAttachmentSerializer(ticket.attachments.all(), many=True).data,
            'status': ticket.status,
            'priority': ticket.priority,
            'priorityLevel': ticket.priority,  # Frontend expects priorityLevel
            'department': ticket.department,
            'submit_date': ticket.submit_date,
            'update_date': ticket.update_date,
            'assigned_to': {
                'id': ticket.assigned_to.id,
                'first_name': ticket.assigned_to.first_name,
                'last_name': ticket.assigned_to.last_name,
            } if ticket.assigned_to else None,
        }
        
        # Handle employee data - if employee is None but employee_cookie_id exists, try to find the employee
        employee_data = None
        if ticket.employee:
            employee_data = {
                'id': ticket.employee.id,
                'first_name': ticket.employee.first_name,
                'last_name': ticket.employee.last_name,
                'company_id': ticket.employee.company_id,
                'department': ticket.employee.department,
                'email': ticket.employee.email,
                'employee_cookie_id': getattr(ticket, 'employee_cookie_id', None)
            }
        elif getattr(ticket, 'employee_cookie_id', None):
            # Get profile from synced ExternalEmployee model
            profile = get_external_employee_data(ticket.employee_cookie_id)
            employee_data = {
                'id': ticket.employee_cookie_id,
                'first_name': profile.get('first_name'),
                'last_name': profile.get('last_name'),
                'company_id': profile.get('company_id'),
                'department': profile.get('department'),
                'email': profile.get('email'),
                'employee_cookie_id': ticket.employee_cookie_id
            }
        else:
            employee_data = {
                'id': None,
                'first_name': None,
                'last_name': None,
                'company_id': None,
                'department': None,
                'email': None,
                'employee_cookie_id': None
            }
        
        ticket_data['employee'] = employee_data
        ticket_data['comments'] = []
        for comment in comments:
            user_payload = {
                'id': comment.user.id if comment.user else comment.user_cookie_id,
                'first_name': '',
                'last_name': '',
                'role': 'Employee'
            }

            if comment.user:
                user_payload['first_name'] = getattr(comment.user, 'first_name', '') or ''
                user_payload['last_name'] = getattr(comment.user, 'last_name', '') or ''
                user_payload['role'] = getattr(comment.user, 'role', 'Employee')
            else:
                emp_cookie_id = getattr(ticket, 'employee_cookie_id', None)
                if emp_cookie_id is not None and comment.user_cookie_id != emp_cookie_id:
                    is_admin_viewer = getattr(request.user, 'is_staff', False) or (getattr(request.user, 'role', None) in ['System Admin', 'Ticket Coordinator', 'Admin'])
                    label = 'Coordinator' if is_admin_viewer else 'Support Team'
                    user_payload['first_name'] = label
                    user_payload['last_name'] = ''
                    user_payload['role'] = 'Support'
                else:
                    profile = get_external_employee_data(comment.user_cookie_id)
                    user_payload['first_name'] = profile.get('first_name') or ''
                    user_payload['last_name'] = profile.get('last_name') or ''
                    user_payload['role'] = 'Employee'

            ticket_data['comments'].append({
                'id': comment.id,
                'comment': comment.comment,
                'created_at': comment.created_at,
                'is_internal': comment.is_internal,
                'user': user_payload
            })
        
        # Expose dynamic and explicit IT/asset fields for frontend
        try:
            ticket_data['dynamic_data'] = ticket.dynamic_data
        except Exception:
            ticket_data['dynamic_data'] = None

        ticket_data.update({
            'asset_name': ticket.asset_name,
            'serial_number': ticket.serial_number,
            'location': ticket.location,
            'expected_return_date': ticket.expected_return_date,
            'issue_type': ticket.issue_type,
            'other_issue': ticket.other_issue,
            'performance_start_date': ticket.performance_start_date,
            'performance_end_date': ticket.performance_end_date,
            'cost_items': ticket.cost_items,
            'requested_budget': ticket.requested_budget,
            # Include approved_by field
            'approved_by': ticket.approved_by if hasattr(ticket, 'approved_by') else None,
            # If approved_by is set, attempt to include coordinator details when possible
            'coordinator': None,
            'rejected_by': ticket.rejected_by if hasattr(ticket, 'rejected_by') else None,
        })
        # Include CSAT and completion fields so frontend can render them
        try:
            ticket_data['date_completed'] = ticket.date_completed if hasattr(ticket, 'date_completed') else None
        except Exception:
            ticket_data['date_completed'] = None
        try:
            ticket_data['csat_rating'] = ticket.csat_rating if hasattr(ticket, 'csat_rating') else None
        except Exception:
            ticket_data['csat_rating'] = None
        try:
            ticket_data['feedback'] = ticket.feedback if hasattr(ticket, 'feedback') else None
        except Exception:
            ticket_data['feedback'] = None

        try:
            # Prefer approved_by, fall back to rejected_by when resolving coordinator
            coord_key = ticket.approved_by if getattr(ticket, 'approved_by', None) else (ticket.rejected_by if getattr(ticket, 'rejected_by', None) else None)
            if coord_key and not ticket_data.get('coordinator'):
                # Try to resolve an Employee by company_id matching coord_key
                coordinator_emp = Employee.objects.filter(company_id=coord_key).first()
                if coordinator_emp:
                    ticket_data['coordinator'] = {
                        'id': coordinator_emp.id,
                        'first_name': coordinator_emp.first_name,
                        'last_name': coordinator_emp.last_name,
                        'company_id': coordinator_emp.company_id,
                        'department': coordinator_emp.department,
                        'email': coordinator_emp.email,
                    }
        except Exception:
            # ignore resolution errors
            pass

        # Fallback: derive coordinator from latest staff comment
        try:
            if not ticket_data.get('coordinator'):
                staff_comment = None
                for c in comments.order_by('-created_at'):
                    if c.user is not None:
                        if getattr(c.user, 'is_staff', False) or getattr(c.user, 'role', None) in ['System Admin', 'Ticket Coordinator', 'Admin']:
                            staff_comment = c
                            break
                    else:
                        if getattr(ticket, 'employee_cookie_id', None) is not None and c.user_cookie_id != getattr(ticket, 'employee_cookie_id', None):
                            staff_comment = c
                            break

                if staff_comment is not None:
                    if staff_comment.user is not None:
                        u = staff_comment.user
                        ticket_data['coordinator'] = {
                            'id': u.id,
                            'first_name': getattr(u, 'first_name', ''),
                            'last_name': getattr(u, 'last_name', ''),
                            'company_id': getattr(u, 'company_id', ''),
                            'department': getattr(u, 'department', ''),
                            'email': getattr(u, 'email', ''),
                        }
                    else:
                        prof = get_external_employee_data(staff_comment.user_cookie_id)
                        ticket_data['coordinator'] = {
                            'id': staff_comment.user_cookie_id,
                            'first_name': prof.get('first_name') or '',
                            'last_name': prof.get('last_name') or '',
                            'company_id': prof.get('company_id') or '',
                            'department': prof.get('department') or '',
                            'email': prof.get('email') or '',
                        }
        except Exception:
            pass

        return Response(ticket_data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsEmployeeOrAdmin])
def add_ticket_comment(request, ticket_id):
    """
    Add a comment to a ticket. Expects JSON { "comment": "...", "is_internal": false }
    """
    try:
        ticket = get_object_or_404(Ticket, id=ticket_id)

        # Permission: employee who owns the ticket or staff/admin/coordinator can comment
        # Check if user is ticket owner (handle both ExternalUser via cookie_id and local Employee)
        is_ticket_owner = (
            (hasattr(request.user, 'id') and ticket.employee_cookie_id == request.user.id) or 
            (request.user == ticket.employee)
        )
        is_admin_or_coordinator = (
            request.user.is_staff or 
            getattr(request.user, 'role', None) in ['System Admin', 'Ticket Coordinator', 'Admin']
        )
        
        if not (is_admin_or_coordinator or is_ticket_owner):
            return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)

        comment_text = request.data.get('comment', '').strip()
        if not comment_text:
            return Response({'error': 'Comment text is required'}, status=status.HTTP_400_BAD_REQUEST)

        is_internal = bool(request.data.get('is_internal', False))
        # Prevent regular employees from creating internal comments
        if is_internal and not (request.user.is_staff or getattr(request.user, 'role', None) in ['System Admin', 'Ticket Coordinator', 'Admin']):
            return Response({'error': 'permission denied for internal comment'}, status=status.HTTP_403_FORBIDDEN)

        # Handle ExternalUser (from cookie auth) vs local Django User
        from .authentication import ExternalUser
        if isinstance(request.user, ExternalUser):
            # External user from cookie auth - set user_cookie_id
            comment = TicketComment.objects.create(
                ticket=ticket,
                user=None,
                user_cookie_id=request.user.id,
                comment=comment_text,
                is_internal=is_internal
            )
            # Build user data from ExternalUser
            first = getattr(request.user, 'first_name', '') or ''
            last = getattr(request.user, 'last_name', '') or ''
            if not (first or last):
                # Fallback: fetch profile to populate names for immediate response
                try:
                    prof = get_external_employee_data(request.user.id)
                except Exception:
                    prof = {}
                first = (prof or {}).get('first_name') or ''
                last = (prof or {}).get('last_name') or ''
            user_data = {
                'id': request.user.id,
                'first_name': first,
                'last_name': last,
                'role': getattr(request.user, 'role', 'Employee')
            }
        else:
            # Local Django user
            comment = TicketComment.objects.create(
                ticket=ticket,
                user=request.user,
                user_cookie_id=None,
                comment=comment_text,
                is_internal=is_internal
            )
            user_data = {
                'id': comment.user.id,
                'first_name': comment.user.first_name,
                'last_name': comment.user.last_name,
                'role': getattr(comment.user, 'role', 'User')
            }

        # Prepare serialized response similar to get_ticket_detail
        comment_data = {
            'id': comment.id,
            'comment': comment.comment,
            'created_at': comment.created_at,
            'is_internal': comment.is_internal,
            'user': user_data
        }

        return Response(comment_data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsAdminOrCoordinator])
def approve_ticket(request, ticket_id):
    try:
        ticket = get_object_or_404(Ticket, id=ticket_id)

        if not (request.user.is_staff or request.user.role in ['System Admin', 'Ticket Coordinator']):
            return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)

        if ticket.status not in ['New', 'Pending']:
            return Response({'error': 'Ticket cannot be approved in current state'}, status=status.HTTP_400_BAD_REQUEST)

        priority = request.data.get('priority', 'Low')
        department = request.data.get('department', 'IT Department')
        approval_notes = request.data.get('approval_notes', '')

        valid_priorities = [choice[0] for choice in PRIORITY_LEVELS]
        valid_departments = [choice[0] for choice in DEPARTMENT_CHOICES]

        if priority not in valid_priorities:
            return Response({'error': 'Invalid priority level'}, status=status.HTTP_400_BAD_REQUEST)
        if department not in valid_departments:
            return Response({'error': 'Invalid department'}, status=status.HTTP_400_BAD_REQUEST)

        ticket.status = 'Open'
        ticket.priority = priority
        ticket.department = department
        # Record who approved/opened the ticket (store company_id for easy frontend display)
        user_display_name = _actor_display_name(request)
        ticket.approved_by = user_display_name
        # Leave ticket unassigned after approval; assignment should be a separate action
        ticket.save()

        # Create a visible comment with a consistent message for approval/open
        # Handle ExternalUser vs Employee
        if isinstance(request.user, ExternalUser):
            TicketComment.objects.create(
                ticket=ticket,
                user=None,
                user_cookie_id=request.user.id,
                comment=f"Status changed to Open (approved by {user_display_name})",
                is_internal=False
            )
        else:
            TicketComment.objects.create(
                ticket=ticket,
                user=request.user,
                user_cookie_id=None,
                comment=f"Status changed to Open (approved by {user_display_name})",
                is_internal=False
            )

        return Response({
            'message': 'Ticket approved successfully',
            'ticket_id': ticket.id,
            'status': ticket.status,
            'priority': ticket.priority,
            'department': ticket.department,
            'approved_by': ticket.approved_by
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsAdminOrCoordinator])
def reject_ticket(request, ticket_id):
    """
    Reject a ticket with a reason (only if status is 'New')
    """
    try:
        ticket = get_object_or_404(Ticket, id=ticket_id)
        
        # Check if user has permission to reject tickets
        if not (request.user.is_staff or request.user.role in ['System Admin', 'Ticket Coordinator']):
            return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Only allow rejection if status is "New"
        if ticket.status != 'New':
            return Response({'error': "Only tickets with status 'New' can be rejected."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get rejection reason from request
        rejection_reason = request.data.get('rejection_reason', '').strip()
        if not rejection_reason:
            return Response({'error': 'Rejection reason is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update ticket
        ticket.status = 'Rejected'
        # Don't assign ExternalUser to assigned_to field (it expects Employee)
        if not isinstance(request.user, ExternalUser):
            ticket.assigned_to = request.user
        ticket.rejection_reason = rejection_reason  # Make sure this field exists in your model
        # Record who rejected the ticket (store company_id for easy frontend display)
        user_display_name = _actor_display_name(request)
        ticket.rejected_by = user_display_name
        ticket.save()
        
        # Create internal comment for rejection - handle ExternalUser
        if isinstance(request.user, ExternalUser):
            TicketComment.objects.create(
                ticket=ticket,
                user=None,
                user_cookie_id=request.user.id,
                comment=f"Ticket rejected by {user_display_name}. Reason: {rejection_reason}",
                is_internal=True
            )
        else:
            TicketComment.objects.create(
                ticket=ticket,
                user=request.user,
                user_cookie_id=None,
                comment=f"Ticket rejected by {user_display_name}. Reason: {rejection_reason}",
                is_internal=True
            )
        
        return Response({
            'message': 'Ticket rejected successfully',
            'ticket_id': ticket.id,
            'status': ticket.status,
            'rejection_reason': rejection_reason,
            'rejected_by': ticket.rejected_by if hasattr(ticket, 'rejected_by') else None
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsAdminOrCoordinator])
def claim_ticket(request, ticket_id):
    try:
        ticket = get_object_or_404(Ticket, id=ticket_id)

        # Only allow claiming if the ticket is Open
        if (ticket.status != 'Open'):
            return Response({'error': 'Ticket is not available for claiming.'}, status=status.HTTP_400_BAD_REQUEST)

        # Optional: prevent re-claim
        if ticket.assigned_to and ticket.status != 'Open':
            return Response({'error': 'Ticket is already claimed.'}, status=status.HTTP_400_BAD_REQUEST)

        # Mark ticket as in progress and assign to the claimant
        ticket.status = 'In Progress'
        ticket.assigned_to = request.user
        ticket.save()

        # Optional log entry
        # TicketComment.objects.create(
        #     ticket=ticket,
        #     user=request.user,
        #     comment="Ticket claimed and marked as In Progress",
        #     is_internal=True
        # )

        return Response({
            'message': 'Ticket successfully claimed.',
            'ticket_id': ticket.id,
            'status': ticket.status,
            'assigned_to': request.user.email
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsAdminOrCoordinator])
def update_ticket_status(request, ticket_id):
    """
    Update ticket status with optional comment
    """
    try:
        ticket = get_object_or_404(Ticket, id=ticket_id)
        
        # Read requested status and comment first
        new_status = request.data.get('status')
        comment_text = request.data.get('comment', '').strip()

        # Check if user has permission to update tickets
        # Allow the ticket owner to close their own ticket (when new_status == 'Closed')
        is_ticket_owner = (
            (hasattr(request.user, 'id') and ticket.employee_cookie_id == request.user.id) or 
            (ticket.employee == request.user)
        )
        if not (request.user.is_staff or getattr(request.user, 'role', None) in ['System Admin', 'Ticket Coordinator']):
            if not (new_status == 'Closed' and is_ticket_owner):
                return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        if not new_status:
            return Response({'error': 'Status is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate status transition
        valid_statuses = ['Open', 'In Progress', 'Resolved', 'Closed', 'On Hold', 'Rejected']
        if new_status not in valid_statuses:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        
        old_status = ticket.status
        ticket.status = new_status
        
        # Handle special status changes
        if new_status == 'Closed' and old_status != 'Closed':
            ticket.time_closed = timezone.now()
            ticket.date_completed = timezone.now()  # Set completion date
            if ticket.submit_date:
                ticket.resolution_time = timezone.now() - ticket.submit_date
        
        ticket.save()
        
        # Create comment for status change
        if new_status == 'Rejected':
            status_comment = "Status changed to Rejected"
        else:
            user_display_name = _actor_display_name(request)
            status_comment = f"Status changed from '{old_status}' to '{new_status}' by {user_display_name}"
            if comment_text:
                status_comment += f". Comment: {comment_text}"

        # Create a TicketComment for the status change. If the requester is an ExternalUser
        # (cookie-authenticated), populate user_cookie_id instead of assigning the FK to user.
        try:
            if isinstance(request.user, ExternalUser):
                TicketComment.objects.create(
                    ticket=ticket,
                    user=None,
                    user_cookie_id=request.user.id,
                    comment=status_comment,
                    is_internal=False
                )
            else:
                TicketComment.objects.create(
                    ticket=ticket,
                    user=request.user,
                    user_cookie_id=None,
                    comment=status_comment,
                    is_internal=False
                )
        except Exception:
            # Fall back to a safe create with minimal fields
            try:
                TicketComment.objects.create(ticket=ticket, comment=status_comment, is_internal=False)
            except Exception:
                pass

        # Also create an ActivityLog entry for the status change when possible
        try:
            # Only create ActivityLog when we can link to a local Employee user
            if ticket.employee is not None:
                actor = None if isinstance(request.user, ExternalUser) else request.user
                ActivityLog.objects.create(
                    user=ticket.employee,
                    action_type='status_changed',
                    message=status_comment,
                    ticket=ticket,
                    actor=actor,
                    metadata={'previous_status': old_status, 'new_status': new_status}
                )
        except Exception:
            pass
        
        return Response({
            'message': 'Ticket status updated successfully',
            'ticket_id': ticket.id,
            'old_status': old_status,
            'new_status': new_status
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsEmployeeOrAdmin])
def withdraw_ticket(request, ticket_id):
    """
    Allow employees to withdraw their own tickets
    """
    try:
        ticket = get_object_or_404(Ticket, id=ticket_id)
        
        # Check if user is the ticket owner (handle both ExternalUser and local User)
        is_ticket_owner = (
            (hasattr(request.user, 'id') and ticket.employee_cookie_id == request.user.id) or 
            (ticket.employee == request.user)
        )
        if not is_ticket_owner:
            return Response({'error': 'You can only withdraw your own tickets'}, status=status.HTTP_403_FORBIDDEN)
        
        # Check if ticket can be withdrawn (not already closed, withdrawn, or resolved)
        if ticket.status in ['Closed', 'Withdrawn', 'Resolved']:
            return Response({'error': f'Cannot withdraw ticket with status: {ticket.status}'}, status=status.HTTP_400_BAD_REQUEST)
        
        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response({'error': 'Withdrawal reason is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        old_status = ticket.status
        ticket.status = 'Withdrawn'
        ticket.time_closed = timezone.now()
        if ticket.submit_date:
            ticket.resolution_time = timezone.now() - ticket.submit_date
        ticket.save()
        
        # Create comment for withdrawal - handle ExternalUser
        user_display_name = _actor_display_name(request)
        withdrawal_comment = f"Ticket withdrawn by {user_display_name}. Reason: {reason}"
        
        if isinstance(request.user, ExternalUser):
            TicketComment.objects.create(
                ticket=ticket,
                user=None,
                user_cookie_id=request.user.id,
                comment=withdrawal_comment,
                is_internal=False
            )
        else:
            TicketComment.objects.create(
                ticket=ticket,
                user=request.user,
                user_cookie_id=None,
                comment=withdrawal_comment,
                is_internal=False
            )
        
        return Response({
            'message': 'Ticket withdrawn successfully',
            'ticket_id': ticket.id,
            'old_status': old_status,
            'new_status': 'Withdrawn'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsEmployeeOrAdmin])
def submit_csat_rating(request, ticket_id):
    """
    Submit CSAT rating and feedback for a closed ticket
    """
    try:
        ticket = get_object_or_404(Ticket, id=ticket_id)
        
        # Check if user is the ticket owner (handle both ExternalUser and local User)
        is_ticket_owner = (
            (hasattr(request.user, 'id') and ticket.employee_cookie_id == request.user.id) or 
            (ticket.employee == request.user)
        )
        if not is_ticket_owner:
            return Response({'error': 'You can only rate your own tickets'}, status=status.HTTP_403_FORBIDDEN)
        
        # Check if ticket is closed
        if ticket.status != 'Closed':
            return Response({'error': 'Can only rate closed tickets'}, status=status.HTTP_400_BAD_REQUEST)
        
        rating = request.data.get('rating')
        feedback = request.data.get('feedback', '')
        
        # Validate rating (1-5 stars)
        if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
            return Response({'error': 'Rating must be an integer between 1 and 5'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate feedback is one of the allowed options
        allowed_feedback = ['Fast response', 'Very helpful', 'Professional', 'Problem solved']
        if feedback:
            # Frontend sends comma-separated string or single value
            feedback_items = [f.strip() for f in feedback.split(',')]
            # Validate all items are allowed
            for item in feedback_items:
                if item and item not in allowed_feedback:
                    return Response({'error': f'Invalid feedback option: {item}'}, status=status.HTTP_400_BAD_REQUEST)
        
        ticket.csat_rating = rating
        ticket.feedback = feedback
        ticket.save()
        
        # Create activity log entry
        try:
            if ticket.employee:
                ActivityLog.objects.create(
                    user=ticket.employee,
                    action_type='csat_submitted',
                    message=f'Submitted CSAT rating ({rating} stars) for ticket {ticket.ticket_number}',
                    ticket=ticket,
                    actor=request.user if not isinstance(request.user, ExternalUser) else None,
                    metadata={'rating': rating, 'feedback': feedback}
                )
        except Exception:
            pass
        
        return Response({
            'message': 'CSAT rating submitted successfully',
            'ticket_id': ticket.id,
            'rating': rating,
            'feedback': feedback
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_csat_feedback(request):
    """
    Get all tickets with CSAT ratings for dashboard display
    Only for System Admin and Ticket Coordinator
    """
    try:
        # Check if user has permission
        user = request.user
        if isinstance(user, ExternalUser):
            if user.role not in ['System Admin', 'Ticket Coordinator', 'Admin']:
                return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)
        elif not (user.is_staff or getattr(user, 'role', None) in ['System Admin', 'Ticket Coordinator']):
            return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get all tickets with CSAT ratings
        tickets = Ticket.objects.filter(
            csat_rating__isnull=False
        ).select_related('employee').order_by('-update_date')
        
        feedback_data = []
        for ticket in tickets:
            employee_name = 'Unknown'
            if ticket.employee:
                employee_name = f"{ticket.employee.first_name} {ticket.employee.last_name}"
            elif ticket.employee_cookie_id:
                # Get profile from synced ExternalEmployee model
                try:
                    profile = get_external_employee_data(ticket.employee_cookie_id)
                    first = profile.get('first_name', '')
                    last = profile.get('last_name', '')
                    employee_name = f"{first} {last}".strip() or 'External User'
                except Exception:
                    employee_name = 'External User'
            
            feedback_data.append({
                'id': ticket.id,
                'ticket_number': ticket.ticket_number,
                'subject': ticket.subject,
                'rating': ticket.csat_rating,
                'feedback': ticket.feedback or '',
                'employee_name': employee_name,
                'submitted_date': ticket.update_date,
                'status': ticket.status
            })
        
        return Response(feedback_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsAdminOrCoordinator])
def get_new_tickets(request):
    """
    Get all tickets with 'New' status for admin review
    """
    try:
        # Check if user has permission to view tickets
        if not (request.user.is_staff or request.user.role in ['System Admin', 'Ticket Coordinator']):
            return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        new_tickets = Ticket.objects.filter(status='New').select_related('employee').order_by('-submit_date')
        
        tickets_data = []
        for ticket in new_tickets:
            tickets_data.append({
                'id': ticket.id,
                'ticket_number': ticket.ticket_number,
                'subject': ticket.subject,
                'category': ticket.category,
                'submit_date': ticket.submit_date,
                'employee_name': f"{ticket.employee.first_name} {ticket.employee.last_name}",
                'employee_department': ticket.employee.department,
                'has_attachment': bool(ticket.attachments.exists())  # Updated to check TicketAttachment
            })
        
        return Response(tickets_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsAdminOrCoordinator])
def get_open_tickets(request):
    try:
        if not request.user.is_staff and request.user.role not in ['System Admin', 'Ticket Coordinator']:
            return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)

        tickets = Ticket.objects.filter(status='Open').select_related('employee')
        data = TicketSerializer(tickets, many=True).data
        return Response(data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsAdminOrCoordinator])
def get_my_tickets(request):
    """
    Get all tickets assigned to the current admin user
    """
    try:
        # Check if user has permission
        if not (request.user.is_staff or request.user.role in ['System Admin', 'Ticket Coordinator']):
            return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        my_tickets = Ticket.objects.filter(assigned_to=request.user).select_related('employee').order_by('-submit_date')
        
        tickets_data = []
        for ticket in my_tickets:
            tickets_data.append({
                'id': ticket.id,
                'ticket_number': ticket.ticket_number,
                'subject': ticket.subject,
                'category': ticket.category,
                'priority': ticket.priority,
                'department': ticket.department,
                'status': ticket.status,
                'submit_date': ticket.submit_date,
                'update_date': ticket.update_date,
                'employee_name': f"{ticket.employee.first_name} {ticket.employee.last_name}",
                'employee_department': ticket.employee.department,
                'has_attachment': bool(ticket.attachments.exists())
            })
        
        return Response(tickets_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsEmployeeOrAdmin])
def download_attachment(request, ticket_id):
    """
    Secure file download endpoint
    """
    try:
        ticket = get_object_or_404(Ticket, id=ticket_id)
        
        # Check permissions (handle both ExternalUser and local User)
        is_ticket_owner = (
            (hasattr(request.user, 'id') and ticket.employee_cookie_id == request.user.id) or 
            (ticket.employee == request.user)
        )
        if not (request.user.is_staff or getattr(request.user, 'role', None) in ['System Admin', 'Ticket Coordinator'] or is_ticket_owner):
            return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        if not ticket.attachment:
            raise Http404("File not found")
        
        file_path = ticket.attachment.path
        if os.path.exists(file_path):
            with open(file_path, 'rb') as fh:
                response = HttpResponse(fh.read(), content_type="application/octet-stream")
                response['Content-Disposition'] = f'attachment; filename="{os.path.basename(file_path)}"'
                return response
        else:
            raise Http404("File not found")
            
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def custom_api_root(request, format=None):
    return Response({
        'create_employee': reverse('create_employee', request=request, format=format),
        'admin-create-employee': reverse('admin-create-employee', request=request, format=format),
        'token_employee': reverse('token_employee', request=request, format=format),
        'admin_token_obtain_pair': reverse('admin_token_obtain_pair', request=request, format=format),
        'token_refresh': reverse('token_refresh', request=request, format=format),
        'employee_profile': reverse('employee_profile', request=request, format=format),
        'get_ticket_detail': reverse('get_ticket_detail', args=[1], request=request, format=format),  # Example ID
        'approve_ticket': reverse('approve_ticket', args=[1], request=request, format=format),
        'reject_ticket': reverse('reject_ticket', args=[1], request=request, format=format),
        'claim_ticket': reverse('claim_ticket', args=[1], request=request, format=format),
        'update_ticket_status': reverse('update_ticket_status', args=[1], request=request, format=format),
        'get_new_tickets': reverse('get_new_tickets', request=request, format=format),
        'get_open_tickets': reverse('get_open_tickets', request=request, format=format),
        'get_my_tickets': reverse('get_my_tickets', request=request, format=format),
        'tickets': reverse('ticket-list', request=request, format=format),
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')

    if not current_password or not new_password:
        return Response({'detail': 'Current and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)
    # External users (from external auth service) cannot change password locally.
    # Forward the change request to the external auth service so it can validate
    # the current password and update credentials there.
    if isinstance(user, ExternalUser):
        try:
            url = 'http://localhost:8003/api/v1/users/password/change/'
            payload = {
                'current_password': current_password,
                'new_password': new_password,
                'new_password_confirm': request.data.get('new_password_confirm', new_password)
            }

            # Forward cookies and Authorization header if present so the auth service
            # can authenticate the request (it may require the cookie-based session
            # or an Authorization: Bearer header). Prefer forwarding the incoming
            # Authorization header when available.
            cookies = {}
            headers = {'Content-Type': 'application/json'}
            try:
                # Copy cookies (access_token, refresh_token, csrftoken) if present
                for name in ['access_token', 'refresh_token', 'csrftoken']:
                    val = request.COOKIES.get(name)
                    if val:
                        cookies[name] = val

                # If the original request had an Authorization header, forward it
                auth_header = request.META.get('HTTP_AUTHORIZATION')
                if auth_header:
                    headers['Authorization'] = auth_header
                else:
                    # Fallback: if cookie-based access_token exists, set Authorization
                    if cookies.get('access_token'):
                        headers['Authorization'] = f"Bearer {cookies['access_token']}"
            except Exception:
                pass

            resp = requests.post(url, json=payload, cookies=cookies, headers=headers, timeout=5)
            if resp.status_code in (200, 201):
                return Response({'detail': 'Password changed successfully.'}, status=status.HTTP_200_OK)
            # Log non-200 response body for easier debugging and return the JSON if possible
            if resp.status_code not in (200, 201):
                try:
                    err_json = resp.json()
                    print(f"[change_password] Auth service responded {resp.status_code}: {err_json}")
                    return Response(err_json, status=resp.status_code)
                except Exception:
                    text = resp.text
                    print(f"[change_password] Auth service responded {resp.status_code}: {text}")
                    return Response({'detail': 'Failed to change password via auth service.', 'error': text}, status=resp.status_code)
        except Exception as e:
            print(f"[change_password] Error forwarding to auth service: {e}")
            return Response({'detail': 'Failed to change password via auth service.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Local/Django user path
    try:
        if not user.check_password(current_password):
            return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({'detail': 'New password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({'detail': 'Password changed successfully.'}, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"[change_password] Error changing local password: {e}")
        return Response({'detail': 'Failed to change password.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_profile_image(request):
    user = request.user
    print(f"Upload request from user: {user.email} (ID: {user.id})")
    
    image_file = request.FILES.get('image')
    if not image_file:
        print("No image file in request.FILES")
        return Response({'detail': 'No image provided.'}, status=status.HTTP_400_BAD_REQUEST)

    print(f"Received image: {image_file.name}, size: {image_file.size}, type: {image_file.content_type}")

    # Validate file type
    if not image_file.content_type in ['image/png', 'image/jpeg', 'image/jpg']:
        return Response({'detail': 'Invalid file type.'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate file size (max 2MB)
    if image_file.size > 2 * 1024 * 1024:
        return Response({'detail': 'File size exceeds 2MB.'}, status=status.HTTP_400_BAD_REQUEST)

    # Delete old image if it exists and is not the default
    if user.image and not user.image.name.endswith('default-profile.png'):
        old_image_path = user.image.path
        if os.path.exists(old_image_path):
            try:
                os.remove(old_image_path)
                print(f"Deleted old image: {old_image_path}")
            except Exception as e:
                print(f"Could not delete old image: {e}")

    # Resize image to 1024x1024
    try:
        img = Image.open(image_file)
        img = img.convert('RGB')
        img = img.resize((1024, 1024))
        buffer = BytesIO()
        img.save(buffer, format='JPEG')
        file_content = ContentFile(buffer.getvalue())
        
        # Save with a consistent filename to avoid duplicates
        filename = f"profile_{user.id}.jpg"
        user.image.save(filename, file_content, save=True)
        
        print(f"Image saved successfully to: {user.image.url}")
        
        return Response({
            'detail': 'Image uploaded successfully.',
            'image_url': user.image.url
        })
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'detail': f'Failed to process image: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_password(request):
    """Verify that the provided current_password matches the authenticated user."""
    current_password = request.data.get('current_password')
    if not current_password:
        return Response({'detail': 'Current password required.'}, status=status.HTTP_400_BAD_REQUEST)
    user = request.user
    # Handle ExternalUser (token-authenticated users from external auth service)
    if isinstance(user, ExternalUser):
        try:
            # Attempt to verify credentials by calling the external auth service login endpoint.
            # The auth service exposes a login endpoint at /api/v1/users/login/ which issues tokens on success.
            url = 'http://localhost:8003/api/v1/users/login/'
            payload = {
                'email': getattr(user, 'email', None),
                'password': current_password
            }
            # Use a short timeout to avoid blocking the request pipeline
            resp = requests.post(url, json=payload, timeout=5)
            if resp.status_code == 200:
                return Response({'detail': 'Password verified.'})
            # Treat any non-200 as failed verification
            return Response({'detail': 'Incorrect password.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"[verify_password] Error verifying against external auth service: {e}")
            return Response({'detail': 'Failed to verify password with external auth service.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Local/Django user path
    try:
        if user.check_password(current_password):
            return Response({'detail': 'Password verified.'})
        return Response({'detail': 'Incorrect password.'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"[verify_password] Error checking password on local user: {e}")
        return Response({'detail': 'Failed to verify password.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_employees(request):
    # Allow system admins, admins, ticket coordinators, or staff to view all employees
    if not request.user.is_staff and request.user.role not in ['System Admin', 'Admin', 'Ticket Coordinator']:
        return Response({'detail': 'permission denied.'}, status=403)
    employees = Employee.objects.all()
    serializer = EmployeeSerializer(employees, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_employee(request, pk):
    """
    Return a single employee by primary key. Permissions mirror list_employees: only staff, Ticket Coordinator, or System Admin can access arbitrary employees.
    """
    # Permission check
    if not request.user.is_staff and request.user.role not in ['System Admin', 'Ticket Coordinator']:
        return Response({'detail': 'Permission denied.'}, status=403)

    try:
        employee = Employee.objects.get(pk=pk)
    except Employee.DoesNotExist:
        return Response({'detail': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = EmployeeSerializer(employee)
    return Response(serializer.data)

class IsSystemAdmin(BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, 'role') and request.user.role == "System Admin"

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsSystemAdmin])
def approve_employee(request, pk):
    try:
        employee = Employee.objects.get(pk=pk)
    except Employee.DoesNotExist:
        return Response({'detail': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)
    if employee.status == 'Approved':
        return Response({'detail': 'Already approved.'}, status=status.HTTP_400_BAD_REQUEST)
    employee.status = 'Approved'
    employee.save()

    # Log approval action
    try:
        EmployeeLog.objects.create(employee=employee, action='approved', performed_by=request.user, details='Account approved by admin')
    except Exception:
        pass

    # Send approval email using the unified email sender. This will use the
    # Gmail API if EMAIL_USE_GMAIL_API env var is true (default), otherwise
    # will fall back to Django's SMTP send_mail.
    try:
        from .gmail_utils import send_email
        html = send_account_approved_email(employee)
        subject = 'Account Creation Successful'
        result = send_email(
            to=employee.email,
            subject=subject,
            body=html,
            is_html=True,
            from_email='noreply.mapactivephteam@gmail.com'
        )
        print(f"[approve_employee] to={employee.email} name={employee.first_name} subject={subject} result={result}")
    except Exception as e:
        # Log but don't fail approval
        print(f"[approve_employee] Email send failed: {e}")

    return Response({'detail': 'Employee approved and email sent.'}, status=status.HTTP_200_OK)

class ApproveEmployeeView(APIView):
    def post(self, request):
        email = request.data.get('email')
        try:
            employee = Employee.objects.get(email=email)
            employee.status = 'Approved'
            employee.save()
            return Response({'message': 'Employee approved.'}, status=status.HTTP_200_OK)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)


def send_account_approved_email(employee):
        logo_url = "https://smartsupport-hdts-frontend.up.railway.app/MapLogo.png"
        site_url = "https://smartsupport-hdts-frontend.up.railway.app/"
        html_content = f"""
        <html>
            <body style="background:#f6f8fa;padding:32px 0;">
                <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;box-shadow:0 2px 8px #0001;overflow:hidden;border:1px solid #e0e0e0;">
                    <div style="padding:40px 32px 32px 32px;text-align:center;">
                        <img src="{logo_url}" alt="SmartSupport Logo" style="width:90px;margin-bottom:24px;display:block;margin-left:auto;margin-right:auto;" />
                        <div style="font-size:1.6rem;margin-bottom:28px;margin-top:8px;font-family:Verdana, Geneva, sans-serif;">
                            Account Approved!
                        </div>
                        <div style="text-align:left;margin:0 auto 24px auto;">
                            <p style="font-size:16px;color:#222;margin:0 0 14px 0;font-family:Verdana, Geneva, sans-serif;">
                                Hi {employee.first_name},
                            </p>
                            <p style="font-size:16px;color:#222;margin:0 0 14px 0;font-family:Verdana, Geneva, sans-serif;">
                                Your account has been approved! You can now log in using the credentials you signed up with.
                            </p>
                            <p style="font-size:15px;color:#444;margin-bottom:14px;font-family:Verdana, Geneva, sans-serif;">
                                If you need help, contact us at:<br>
                                <a href="mailto:mapactivephsmartsupport@gmail.com" style="color:#2563eb;text-decoration:none;font-family:Verdana, Geneva, sans-serif;">mapactivephsmartsupport@gmail.com</a>
                            </p>
                            <p style="font-size:15px;color:#444;margin-bottom:18px;font-family:Verdana, Geneva, sans-serif;">
                                Best regards,<br>
                                MAP Active PH SmartSupport
                            </p>
                        </div>
                        <a href="{site_url}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;font-size:16px;font-family:Verdana, Geneva, sans-serif;margin-bottom:24px;">
                            Visit site
                        </a>
                        <div style="margin-top:18px;text-align:left;">
                            <span style="font-size:1.5rem;font-weight:bold;color:#3b82f6;font-family:Verdana, Geneva, sans-serif;letter-spacing:1px;">
                                SmartSupport
                            </span>
                        </div>
                    </div>
                    <div style="height:5px;background:#2563eb;"></div>
                </div>
            </body>
        </html>
        """
        return html_content


def send_account_rejected_email(employee):
        logo_url = "https://smartsupport-hdts-frontend.up.railway.app/MapLogo.png"
        site_url = "https://smartsupport-hdts-frontend.up.railway.app/"
        html_content = f"""
        <html>
            <body style="background:#f6f8fa;padding:32px 0;">
                <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;box-shadow:0 2px 8px #0001;overflow:hidden;border:1px solid #e0e0e0;">
                    <div style="padding:40px 32px 32px 32px;text-align:center;">
                        <img src="{logo_url}" alt="SmartSupport Logo" style="width:90px;margin-bottom:24px;display:block;margin-left:auto;margin-right:auto;" />
                        <div style="font-size:1.6rem;margin-bottom:28px;margin-top:8px;font-family:Verdana, Geneva, sans-serif;">
                            Account Rejected
                        </div>
                        <div style="text-align:left;margin:0 auto 24px auto;">
                            <p style="font-size:16px;color:#222;margin:0 0 14px 0;font-family:Verdana, Geneva, sans-serif;">
                                Hi {employee.first_name},
                            </p>
                            <p style="font-size:16px;color:#222;margin:0 0 14px 0;font-family:Verdana, Geneva, sans-serif;">
                                We couldn’t create your account. Please double-check the information you’ve entered to ensure everything is correct. If you'd like, feel free to try creating your account again.
                            </p>
                            <p style="font-size:15px;color:#444;margin-bottom:14px;font-family:Verdana, Geneva, sans-serif;">
                                If you need help, contact us at:<br>
                                <a href="mailto:mapactivephsmartsupport@gmail.com" style="color:#2563eb;text-decoration:none;font-family:Verdana, Geneva, sans-serif;">mapactivephsmartsupport@gmail.com</a>
                            </p>
                            <p style="font-size:15px;color:#444;margin-bottom:18px;font-family:Verdana, Geneva, sans-serif;">
                                Best regards,<br>
                                MAP Active PH SmartSupport
                            </p>
                        </div>
                        <a href="{site_url}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;font-size:16px;font-family:Verdana, Geneva, sans-serif;margin-bottom:24px;">
                            Visit site
                        </a>
                        <div style="margin-top:18px;text-align:left;">
                            <span style="font-size:1.5rem;font-weight:bold;color:#3b82f6;font-family:Verdana, Geneva, sans-serif;letter-spacing:1px;">
                                SmartSupport
                            </span>
                        </div>
                    </div>
                    <div style="height:5px;background:#2563eb;"></div>
                </div>
            </body>
        </html>
        """
        return html_content


def send_account_pending_email(employee):
        logo_url = "https://smartsupport-hdts-frontend.up.railway.app/MapLogo.png"
        site_url = "https://smartsupport-hdts-frontend.up.railway.app/"
        html_content = f"""
        <html>
            <body style="background:#f6f8fa;padding:32px 0;">
                <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;box-shadow:0 2px 8px #0001;overflow:hidden;border:1px solid #e0e0e0;">
                    <div style="padding:40px 32px 32px 32px;text-align:center;">
                        <img src="{logo_url}" alt="SmartSupport Logo" style="width:90px;margin-bottom:24px;display:block;margin-left:auto;margin-right:auto;" />
                        <div style="font-size:1.6rem;margin-bottom:28px;margin-top:8px;font-family:Verdana, Geneva, sans-serif;">
                            Account Creation Pending Approval
                        </div>
                        <div style="text-align:left;margin:0 auto 24px auto;">
                            <p style="font-size:16px;color:#222;margin:0 0 14px 0;font-family:Verdana, Geneva, sans-serif;">
                                Hi {employee.first_name},
                            </p>
                            <p style="font-size:16px;color:#222;margin:0 0 14px 0;font-family:Verdana, Geneva, sans-serif;">
                                Thank you for signing up with MAP Active PH! Your account has been successfully created, but it is currently awaiting approval. You’ll receive a confirmation email once your account has been approved.
                            </p>
                            <p style="font-size:15px;color:#444;margin-bottom:14px;font-family:Verdana, Geneva, sans-serif;">
                                If you have any questions, don’t hesitate to reach out to us.
                            </p>
                            <p style="font-size:15px;color:#444;margin-bottom:14px;font-family:Verdana, Geneva, sans-serif;">
                                If you did not create this account, please contact us immediately at: <a href="mailto:mapactivephsmartsupport@gmail.com" style="color:#2563eb;text-decoration:none;">mapactivephsmartsupport@gmail.com</a>
                            </p>
                            <p style="font-size:15px;color:#444;margin-bottom:18px;font-family:Verdana, Geneva, sans-serif;">
                                Best regards,<br>
                                MAP Active PH SmartSupport
                            </p>
                        </div>
                        <a href="{site_url}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;font-size:16px;font-family:Verdana, Geneva, sans-serif;margin-bottom:24px;">
                            Visit site
                        </a>
                        <div style="margin-top:18px;text-align:left;">
                            <span style="font-size:1.5rem;font-weight:bold;color:#3b82f6;font-family:Verdana, Geneva, sans-serif;letter-spacing:1px;">
                                SmartSupport
                            </span>
                        </div>
                    </div>
                    <div style="height:5px;background:#2563eb;"></div>
                </div>
            </body>
        </html>
        """
        return html_content


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def finalize_ticket(request, ticket_id):
    try:
        ticket = Ticket.objects.get(pk=ticket_id)
        print("Finalize called for ticket:", ticket_id)
        print("Attachments:", list(ticket.attachments.all()))
        data = TicketSerializer(ticket).data
        return Response({'detail': 'Ticket finalized and sent to workflow.'})
    except Ticket.DoesNotExist:
        return Response({'detail': 'Ticket not found.'}, status=404)


# Knowledge Article ViewSet
from rest_framework.decorators import action
from rest_framework.permissions import SAFE_METHODS, AllowAny
from .serializers import KnowledgeArticleSerializer
from .authentication import ExternalUser
from .models import KnowledgeArticle
from .models import KnowledgeArticleVersion


class KnowledgeArticleViewSet(viewsets.ModelViewSet):
    serializer_class = KnowledgeArticleSerializer
    # default permission for unsafe methods; we'll override for safe methods in get_permissions
    permission_classes = [IsAuthenticated, IsAdminOrSystemAdmin]

    def get_permissions(self):
        """Allow safe (read-only) methods to be accessible without Admin permission.
        Unsafe methods (create/update/delete) still require IsAuthenticated and IsAdminOrSystemAdmin.
        """
        # If it's a safe method, allow public read access.
        if self.request.method in SAFE_METHODS:
            return [AllowAny()]
        return [perm() for perm in self.permission_classes]

    # Use default list/retrieve implementations from ModelViewSet (no debug prints)

    def get_queryset(self):
        """Return all articles for listing; filtering happens in the view layer"""
        return KnowledgeArticle.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        """Set the created_by field to the current user.

        If the request user is an ExternalUser (token-authenticated user from
        the separate auth service) we cannot assign it directly to the
        ForeignKey (which expects an Employee instance). The `created_by`
        field is nullable so we store `None` in that case.
        """
        user = self.request.user
        if isinstance(user, ExternalUser):
            # external users aren't Employee instances stored locally
            article = serializer.save(created_by=None)
        else:
            article = serializer.save(created_by=user)
        # Create initial version entry
        try:
            from .models import KnowledgeArticleVersion
            KnowledgeArticleVersion.objects.create(
                article=article,
                version_number='1',
                editor=None if isinstance(user, ExternalUser) else user,
                changes='Created article',
                metadata={'subject': article.subject}
            )
        except Exception:
            pass

    
    @action(detail=True, methods=['post'], url_path='archive')
    def archive(self, request, pk=None):
        """Archive an article"""
        article = self.get_object()
        article.is_archived = True
        article.save()
        return Response({'detail': 'Article archived successfully.'}, status=status.HTTP_200_OK)

    def perform_update(self, serializer):
        """Override update to record a simple version entry for each edit."""
        request = getattr(self, 'request', None)
        user = request.user if request is not None else None
        # Capture previous state for metadata if needed
        try:
            article_before = self.get_object()
        except Exception:
            article_before = None

        article = serializer.save()
        try:
            # Determine next version number (simple increment based on count)
            count = article.versions.count() if hasattr(article, 'versions') else 0
            version_number = str(count + 1)
            KnowledgeArticleVersion.objects.create(
                article=article,
                version_number=version_number,
                editor=None if isinstance(user, ExternalUser) else user,
                changes=request.data.get('summary') or 'Updated article',
                metadata={'before': None, 'after': None}
            )
        except Exception:
            pass
    
    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        """Restore an archived article"""
        article = self.get_object()
        article.is_archived = False
        article.save()
        return Response({'detail': 'Article restored successfully.'}, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='choices', permission_classes=[AllowAny])
    def choices(self, request):
        """Return available category choices for knowledge articles"""
        from .models import ARTICLE_CATEGORY_CHOICES
        return Response({
            'categories': [{'value': choice[0], 'label': choice[1]} for choice in ARTICLE_CATEGORY_CHOICES]
        }, status=status.HTTP_200_OK)

from django.http import FileResponse, Http404, HttpResponse
from django.conf import settings
import os
import mimetypes

@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def serve_protected_media(request, file_path):
    """
    Serve media files only to authenticated users with valid cookies from auth service.
    This ensures media files cannot be accessed without proper authentication.
    Any user authenticated through the external auth service can access files.
    """
    # Construct the full file path
    full_path = os.path.join(settings.MEDIA_ROOT, file_path)
    
    # Security check: ensure the path doesn't escape MEDIA_ROOT
    full_path = os.path.abspath(full_path)
    media_root = os.path.abspath(settings.MEDIA_ROOT)
    if not full_path.startswith(media_root):
        raise Http404("Invalid file path")
    
    # Check if file exists
    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        raise Http404("File not found")
    
    # Determine content type
    content_type, _ = mimetypes.guess_type(full_path)
    if content_type is None:
        content_type = 'application/octet-stream'
    
    # Open and serve the file
    try:
        response = FileResponse(open(full_path, 'rb'), content_type=content_type)
        response['Content-Disposition'] = f'inline; filename="{os.path.basename(full_path)}"'
        return response
    except Exception as e:
        raise Http404(f"Error serving file: {str(e)}")


from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

@api_view(['GET'])
@authentication_classes([JWTAuthentication, CookieJWTAuthentication])  # test both
@permission_classes([IsAuthenticated])
def test_jwt_view(request):
    return Response({
        "authenticated_user": str(request.user),
        "auth_type": request.successful_authenticator.__class__.__name__
    })
