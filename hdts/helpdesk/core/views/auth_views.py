import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.views import TokenObtainPairView

from ..authentication import CookieJWTAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from ..models import Employee, EmployeeLog
from ..serializers import EmployeeSerializer, MyTokenObtainPairSerializer, AdminTokenObtainPairSerializer
from .permissions import IsSystemAdmin, IsAdminOrCoordinator, IsEmployeeOrAdmin
from .helpers import generate_company_id, _actor_display_name, get_user_display_name
from .email_templates import send_account_approved_email, send_account_rejected_email, send_account_pending_email


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


class CreateEmployeeView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    def post(self, request, *args, **kwargs):
        data = request.data.copy()
        image_file = None
        try:
            image_file = request.FILES.get('image')
        except Exception:
            image_file = None
        if image_file:
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
                    from ..gmail_utils import send_email
                    pending_html = send_account_pending_email(employee)
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


class EmployeeTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


class AdminTokenObtainPairView(TokenObtainPairView):
    serializer_class = AdminTokenObtainPairSerializer


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
        EmployeeLog.objects.create(employee=employee, action='rejected', performed_by=request.user, details='Account rejected by admin')
    except Exception:
        pass
    
    # Send rejection email (non-blocking). Uses unified sender (Gmail API when enabled).
    try:
        from ..gmail_utils import send_email
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
        from ..gmail_utils import send_email
        html = send_account_approved_email(employee)
        send_email(
            to=employee.email,
            subject='Account Approved',
            body=html,
            is_html=True,
            from_email='noreply.mapactivephteam@gmail.com'
        )
    except Exception as e:
        print(f"[approve_employee] Email send failed: {e}")
        pass

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
