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
from django.core.files.uploadedfile import InMemoryUploadedFile
import requests
import sys
import logging

# Configure logging to flush to stdout immediately
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG, stream=sys.stdout, force=True)

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
            # The auth service exposes a verify-password endpoint for authenticated users
            url = 'http://localhost:8003/api/v1/users/verify-password/'
            payload = {'current_password': current_password}
            auth_token = str(request.auth) if request.auth else ''
            headers = {
                'Authorization': f'Bearer {auth_token}',
                'Content-Type': 'application/json'
            }
            resp = requests.post(url, json=payload, headers=headers, timeout=5)
            if resp.status_code == 200:
                return Response({'detail': 'Password verified.'}, status=status.HTTP_200_OK)
            else:
                return Response({'detail': 'Incorrect password.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'detail': 'Failed to verify password.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Local/Django user path
    if hasattr(user, 'check_password') and callable(user.check_password):
        try:
            if user.check_password(current_password):
                return Response({'detail': 'Password verified.'}, status=status.HTTP_200_OK)
            else:
                return Response({'detail': 'Incorrect password.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'detail': 'Failed to verify password.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    else:
        return Response({'detail': 'Cannot verify password for this user.'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_profile_image(request):
    # Use logging with immediate flush
    logger.info("\n" + "="*80)
    logger.info("[UPLOAD_PROFILE_IMAGE] ✓✓✓ START - New request received")
    logger.info("="*80)
    sys.stdout.flush()
    
    auth_user = request.user
    logger.info(f"[AUTH] Authenticated user: {auth_user}")
    logger.info(f"[AUTH] User type: {type(auth_user)}")
    logger.info(f"[AUTH] User email: {getattr(auth_user, 'email', 'NO EMAIL')}")
    logger.info(f"[AUTH] User ID: {getattr(auth_user, 'id', 'NO ID')}")
    
    # Try to get Employee, but don't fail if it doesn't exist
    # The auth service is the source of truth for profile pictures
    logger.info(f"\n[EMPLOYEE_LOOKUP] Looking up Employee by email (optional): {auth_user.email}")
    employee_user = None
    try:
        employee_user = Employee.objects.get(email=auth_user.email)
        logger.info(f"[EMPLOYEE_LOOKUP] ✓ Found Employee: {employee_user}")
    except Employee.DoesNotExist:
        logger.warning(f"[EMPLOYEE_LOOKUP] ⚠ No Employee found for {auth_user.email} - will save to auth service only")
    
    logger.info(f"\n[REQUEST] Method: {request.method}")
    logger.info(f"[REQUEST] Content-Type: {request.META.get('CONTENT_TYPE', 'N/A')}")
    logger.info(f"[REQUEST] Authorization header: {request.META.get('HTTP_AUTHORIZATION', 'NO AUTH HEADER')[:50]}...")
    
    logger.info(f"\n[FILES] Request.FILES keys: {list(request.FILES.keys())}")
    logger.info(f"[FILES] Request.FILES: {request.FILES}")
    sys.stdout.flush()
    
    image_file = request.FILES.get('image')
    logger.info(f"\n[FILE_CHECK] Image file from request: {image_file}")
    sys.stdout.flush()
    
    if not image_file:
        logger.error("[FILE_CHECK] ERROR: No image file provided in request.FILES")
        logger.error("="*80)
        sys.stdout.flush()
        return Response({'error': 'No image file provided'}, status=status.HTTP_400_BAD_REQUEST)

    logger.info(f"[FILE_INFO] File name: {image_file.name}")
    logger.info(f"[FILE_INFO] File size: {image_file.size} bytes")
    logger.info(f"[FILE_INFO] File content type: {image_file.content_type}")
    logger.info(f"[FILE_INFO] File object: {image_file}")

    # Validate file type
    logger.info(f"\n[VALIDATION] Checking file type...")
    if image_file.content_type not in ['image/png', 'image/jpeg', 'image/jpg']:
        logger.error(f"[VALIDATION] ERROR: Invalid file type: {image_file.content_type}")
        logger.error("="*80)
        sys.stdout.flush()
        return Response({'error': 'Only PNG and JPEG images are allowed'}, status=status.HTTP_400_BAD_REQUEST)
    logger.info(f"[VALIDATION] File type OK: {image_file.content_type}")

    # Validate file size (max 2MB)
    logger.info(f"\n[VALIDATION] Checking file size...")
    if image_file.size > 2 * 1024 * 1024:
        logger.error(f"[VALIDATION] ERROR: File size {image_file.size} exceeds 2MB limit")
        logger.error("="*80)
        sys.stdout.flush()
        return Response({'error': 'File size exceeds 2MB limit'}, status=status.HTTP_400_BAD_REQUEST)
    logger.info(f"[VALIDATION] File size OK: {image_file.size} bytes")
    sys.stdout.flush()

    # Delete old image from Employee if one exists
    if employee_user:
        logger.info(f"\n[CLEANUP] Checking for old image on Employee record...")
        logger.info(f"[CLEANUP] employee_user.image value: {employee_user.image}")
        if employee_user.image:
            logger.info(f"[CLEANUP] employee_user.image.name: {employee_user.image.name}")
            if not employee_user.image.name.endswith('default-profile.png'):
                try:
                    logger.info(f"[CLEANUP] Deleting old image: {employee_user.image.name}")
                    employee_user.image.delete()
                    logger.info(f"[CLEANUP] Old image deleted successfully")
                except Exception as e:
                    logger.error(f"[CLEANUP] ERROR deleting old image: {e}")
            else:
                logger.info(f"[CLEANUP] Skipping delete - image is default")
        else:
            logger.info(f"[CLEANUP] No existing image to delete")
        sys.stdout.flush()

    # Resize image to 1024x1024
    logger.info(f"\n[PROCESSING] Starting image resize...")
    try:
        logger.info(f"[PROCESSING] Opening image with PIL...")
        img = Image.open(image_file)
        logger.info(f"[PROCESSING] Image opened successfully")
        logger.info(f"[PROCESSING] Original image size: {img.size}")
        sys.stdout.flush()
        
        logger.info(f"[PROCESSING] Resizing image to 1024x1024...")
        img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        logger.info(f"[PROCESSING] Resized image size: {img.size}")
        
        logger.info(f"[PROCESSING] Converting to JPEG...")
        img_io = BytesIO()
        img.save(img_io, format='JPEG')
        logger.info(f"[PROCESSING] JPEG saved to BytesIO, size: {img_io.tell()} bytes")
        img_io.seek(0)
        logger.info(f"[PROCESSING] BytesIO pointer reset to 0")
        sys.stdout.flush()
        
        image_url = None
        filename = f"{auth_user.id}_profile.jpg"  # Use auth user ID for filename
        
        # If Employee record exists, save image to it
        if employee_user:
            logger.info(f"\n[DATABASE] Saving image to Employee.image field...")
            filename = f"{employee_user.id}_profile.jpg"
            logger.info(f"[DATABASE] Filename: {filename}")
            logger.info(f"[DATABASE] Employee object before save: {employee_user}")
            logger.info(f"[DATABASE] Employee.image field before save: {employee_user.image}")
            
            employee_user.image.save(filename, ContentFile(img_io.getvalue()), save=True)
            logger.info(f"[DATABASE] Image saved successfully!")
            logger.info(f"[DATABASE] Employee.image field after save: {employee_user.image}")
            logger.info(f"[DATABASE] Employee.image.url: {employee_user.image.url}")
            
            # Verify save in database
            logger.info(f"\n[VERIFICATION] Refreshing Employee from database...")
            employee_user.refresh_from_db()
            logger.info(f"[VERIFICATION] Employee refreshed from DB")
            logger.info(f"[VERIFICATION] Employee.image after refresh: {employee_user.image}")
            logger.info(f"[VERIFICATION] Employee.image.url after refresh: {employee_user.image.url}")
            
            image_url = employee_user.image.url
            logger.info(f"[DATABASE] Final Employee image URL: {image_url}")
        else:
            logger.info(f"\n[DATABASE] No Employee record - image will be saved only to auth service")
            image_url = f"/media/profile_pics/{filename}"
        
        sys.stdout.flush()
        
        # Sync the profile picture to the auth service using the resized BytesIO
        logger.info(f"\n[AUTH_SYNC] Starting auth service sync...")
        auth_sync_success = False
        try:
            from django.conf import settings
            auth_service_url = getattr(settings, 'DJANGO_AUTH_SERVICE', 'http://auth-service:8003')
            logger.info(f"[AUTH_SYNC] Auth service URL: {auth_service_url}")
            
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            logger.info(f"[AUTH_SYNC] Authorization header (full): {auth_header}")
            
            auth_token = auth_header.replace('Bearer ', '')
            logger.info(f"[AUTH_SYNC] Extracted token (first 50 chars): {auth_token[:50] if auth_token else 'EMPTY'}...")
            logger.info(f"[AUTH_SYNC] Token length: {len(auth_token)}")
            sys.stdout.flush()
            
            if auth_token and len(auth_token) > 10:
                logger.info(f"[AUTH_SYNC] Token present and valid, proceeding with auth service update...")
                
                # Use the resized image BytesIO for auth service sync
                logger.info(f"[AUTH_SYNC] Resetting image BytesIO pointer...")
                img_io.seek(0)
                logger.info(f"[AUTH_SYNC] BytesIO pointer reset to 0, position: {img_io.tell()}")
                logger.info(f"[AUTH_SYNC] BytesIO size: {img_io.getbuffer().nbytes} bytes")
                
                # Create a file-like object from BytesIO
                resized_file = InMemoryUploadedFile(
                    img_io,
                    'ImageField',
                    filename,
                    'image/jpeg',
                    img_io.getbuffer().nbytes,
                    None
                )
                
                logger.info(f"[AUTH_SYNC] Created InMemoryUploadedFile:")
                logger.info(f"[AUTH_SYNC]   - Name: {resized_file.name}")
                logger.info(f"[AUTH_SYNC]   - Content type: {resized_file.content_type}")
                logger.info(f"[AUTH_SYNC]   - Size: {resized_file.size} bytes")
                
                files = {'profile_picture': resized_file}
                headers = {'Authorization': f'Bearer {auth_token}'}
                
                logger.info(f"[AUTH_SYNC] Preparing multipart request:")
                logger.info(f"[AUTH_SYNC]   - URL: {auth_service_url}/api/v1/users/profile/")
                logger.info(f"[AUTH_SYNC]   - Files dict keys: {list(files.keys())}")
                logger.info(f"[AUTH_SYNC]   - File object type: {type(resized_file)}")
                logger.info(f"[AUTH_SYNC]   - Headers: Authorization: Bearer {auth_token[:50]}...")
                
                # Call auth service to update profile picture
                logger.info(f"[AUTH_SYNC] Sending PATCH request to auth service...")
                logger.info(f"[AUTH_SYNC] Request URL: {auth_service_url}/api/v1/users/profile/")
                logger.info(f"[AUTH_SYNC] Request method: PATCH")
                logger.info(f"[AUTH_SYNC] Request timeout: 10 seconds")
                sys.stdout.flush()
                
                auth_response = requests.patch(
                    f'{auth_service_url}/api/v1/users/profile/',
                    files=files,
                    headers=headers,
                    timeout=10,
                    allow_redirects=False
                )
                
                logger.info(f"[AUTH_SYNC] ✓ RESPONSE RECEIVED from auth service")
                logger.info(f"[AUTH_SYNC] Auth service response status: {auth_response.status_code}")
                logger.info(f"[AUTH_SYNC] Auth service response status code type: {type(auth_response.status_code)}")
                logger.info(f"[AUTH_SYNC] Auth service response reason: {auth_response.reason}")
                logger.info(f"[AUTH_SYNC] Auth service response headers: {dict(auth_response.headers)}")
                logger.info(f"[AUTH_SYNC] Auth service response text (full, up to 1000 chars): {auth_response.text[:1000]}")
                sys.stdout.flush()
                
                # Try to parse response
                try:
                    resp_json = auth_response.json()
                    logger.info(f"[AUTH_SYNC] Auth service response JSON: {resp_json}")
                except Exception as e:
                    logger.error(f"[AUTH_SYNC] Could not parse response as JSON: {type(e).__name__}: {e}")
                
                if auth_response.status_code in [200, 201]:
                    logger.info(f"[AUTH_SYNC] ✓✓✓ SUCCESS: Profile picture synced to auth service!")
                    auth_sync_success = True
                    # Try to extract profile_picture URL from response
                    try:
                        auth_resp_data = auth_response.json()
                        if 'profile_picture' in auth_resp_data and auth_resp_data['profile_picture']:
                            logger.info(f"[AUTH_SYNC] Got profile_picture URL from auth service: {auth_resp_data['profile_picture']}")
                    except Exception as e:
                        logger.error(f"[AUTH_SYNC] Could not parse auth response JSON: {e}")
                else:
                    logger.error(f"[AUTH_SYNC] ✗✗✗ FAILURE: Failed to sync profile picture to auth service")
                    logger.error(f"[AUTH_SYNC] Expected status 200 or 201, got: {auth_response.status_code}")
                    logger.error(f"[AUTH_SYNC] Full response body: {auth_response.text}")
                sys.stdout.flush()
            else:
                logger.error(f"[AUTH_SYNC] ✗ SKIPPED: No valid auth token found")
                logger.error(f"[AUTH_SYNC]   - Auth header present: {bool(auth_header)}")
                logger.error(f"[AUTH_SYNC]   - Auth token length: {len(auth_token)}")
                logger.error(f"[AUTH_SYNC]   - Auth token: {auth_token}")
                sys.stdout.flush()
        except Exception as e:
            logger.error(f"[AUTH_SYNC] ✗✗✗ ERROR: Exception during auth sync: {type(e).__name__}: {e}")
            import traceback
            traceback_str = traceback.format_exc()
            logger.error(f"[AUTH_SYNC] Traceback: {traceback_str}")
            logger.error(f"[AUTH_SYNC] Exception details: {repr(e)}")
            sys.stdout.flush()
        
        logger.info(f"\n[SUCCESS] Upload completed!")
        logger.info(f"[SUCCESS] - Image saved to Employee.image: ✓")
        logger.info(f"[SUCCESS] - Auth service sync: {'✓ SUCCESS' if auth_sync_success else '✗ FAILED/ATTEMPTED'}")
        logger.info("="*80)
        sys.stdout.flush()
        
        return Response({
            'message': 'Image uploaded successfully',
            'image_url': image_url,
            'auth_synced': auth_sync_success
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"\n[ERROR] Exception during image processing: {type(e).__name__}: {e}")
        import traceback
        logger.error(f"[ERROR] Full traceback:\n{traceback.format_exc()}")
        logger.error("="*80)
        sys.stdout.flush()
        return Response({'error': 'Error processing image'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

