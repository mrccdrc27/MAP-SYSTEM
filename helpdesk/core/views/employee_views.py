from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
import requests

from ..authentication import CookieJWTAuthentication, ExternalUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from ..models import Employee, ActivityLog
from ..serializers import EmployeeSerializer, ActivityLogSerializer
from .permissions import IsAdminOrCoordinator, IsEmployeeOrAdmin


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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')

    if not current_password or not new_password:
        return Response({'detail': 'current_password and new_password required'}, status=status.HTTP_400_BAD_REQUEST)
    # External users (from external auth service) cannot change password locally.
    # Forward the change request to the external auth service so it can validate
    # the current password and update credentials there.
    if isinstance(user, ExternalUser):
        try:
            import requests
            # The auth service exposes a change-password endpoint.
            # Construct the URL based on the external auth service location.
            url = 'http://localhost:8003/api/v1/users/change-password/'
            payload = {
                'current_password': current_password,
                'new_password': new_password
            }
            # Use the user's JWT token to authenticate against the external service
            # (assuming the JWT was issued by the external service and is recognized there).
            headers = {
                'Authorization': f'Bearer {request.auth}' if request.auth else '',
                'Content-Type': 'application/json'
            }
            resp = requests.post(url, json=payload, headers=headers, timeout=5)
            if resp.status_code == 200:
                return Response({'detail': 'Password changed successfully.'})
            else:
                # Parse error message from external service
                err_msg = resp.json().get('detail', 'Failed to change password.')
                return Response({'detail': err_msg}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"[change_password] Error changing password via external auth service: {e}")
            return Response({'detail': 'Failed to change password with external auth service.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Local/Django user path
    try:
        if user.check_password(current_password):
            user.set_password(new_password)
            user.save()
            return Response({'detail': 'Password changed successfully.'})
        return Response({'detail': 'Incorrect password.'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"[change_password] Error setting password: {e}")
        return Response({'detail': 'Failed to change password.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_password(request):
    """Verify that the provided current_password matches the authenticated user."""
    current_password = request.data.get('current_password')
    if not current_password:
        return Response({'detail': 'current_password required'}, status=status.HTTP_400_BAD_REQUEST)
    user = request.user
    # Handle ExternalUser (token-authenticated users from external auth service)
    if isinstance(user, ExternalUser):
        try:
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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_profile_image(request):
    user = request.user
    print(f"Upload request from user: {user.email} (ID: {user.id})")
    
    image_file = request.FILES.get('image')
    if not image_file:
        return Response({'error': 'No image file provided'}, status=status.HTTP_400_BAD_REQUEST)

    print(f"Received image: {image_file.name}, size: {image_file.size}, type: {image_file.content_type}")

    # Validate file type
    if not image_file.content_type in ['image/png', 'image/jpeg', 'image/jpg']:
        return Response({'error': 'Only PNG and JPEG images are allowed'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate file size (max 2MB)
    if image_file.size > 2 * 1024 * 1024:
        return Response({'error': 'File size exceeds 2MB limit'}, status=status.HTTP_400_BAD_REQUEST)

    # Delete old image if it exists and is not the default
    if user.image and not user.image.name.endswith('default-profile.png'):
        try:
            user.image.delete()
        except Exception as e:
            print(f"Error deleting old image: {e}")

    # Resize image to 1024x1024
    try:
        img = Image.open(image_file)
        img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        img_io = BytesIO()
        img.save(img_io, format='JPEG')
        img_io.seek(0)
        
        user.image.save(f"{user.id}_profile.jpg", ContentFile(img_io.getvalue()), save=True)
        
        return Response({
            'message': 'Image uploaded successfully',
            'image_url': user.image.url
        }, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error processing image: {e}")
        return Response({'error': 'Error processing image'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
