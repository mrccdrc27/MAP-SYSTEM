import os
import mimetypes
from django.http import HttpResponse, Http404, HttpResponseForbidden
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.cache import cache_control
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model
from .models import TicketAttachment, Ticket
import logging

logger = logging.getLogger(__name__)
Employee = get_user_model()


def authenticate_token_from_query(request):
    """
    Authenticate user from token in query parameters
    This allows media files to be accessed via URLs with token parameter
    """
    token = request.GET.get('token')
    if not token:
        return None
    
    try:
        jwt_auth = JWTAuthentication()
        validated_token = jwt_auth.get_validated_token(token)
        user = jwt_auth.get_user(validated_token)
        return user
    except (InvalidToken, TokenError):
        return None


@csrf_exempt
@cache_control(private=True, max_age=3600)  # Cache for 1 hour privately
def serve_secure_media(request, file_path):
    """
    Serve media files with authentication check
    Supports both Authorization header and token query parameter
    Also supports external system access with API key
    """
    # Check for external system API key first
    api_key = request.GET.get('api_key') or request.headers.get('X-API-Key')
    if api_key:
        # Verify external system API key (you should store this in settings)
        external_api_key = getattr(settings, 'EXTERNAL_SYSTEM_API_KEY', None)
        if external_api_key and api_key == external_api_key:
            # Allow access for external systems
            return serve_media_file(file_path, request, skip_auth_check=True)
    
    # First try standard JWT authentication
    user = None
    jwt_auth = JWTAuthentication()
    
    try:
        auth_result = jwt_auth.authenticate(request)
        if auth_result:
            user, token = auth_result
    except:
        pass
    
    # If standard auth failed, try token from query parameter
    if not user:
        user = authenticate_token_from_query(request)
    
    # If still no user, deny access
    if not user:
        return HttpResponseForbidden("Authentication required")
    
    # Check if user is authenticated and active
    if not user.is_authenticated:
        return HttpResponseForbidden("Authentication required")
    
    # Authorization checks for authenticated users
    if not has_file_permission(user, file_path, None):
        return HttpResponseForbidden("Permission denied")
    
    return serve_media_file(file_path, request)


def serve_media_file(file_path, request, skip_auth_check=False):
    """
    Helper function to actually serve the media file
    """
    # Build full file path
    full_path = os.path.join(settings.MEDIA_ROOT, file_path)
    
    # Security check: ensure the path is within MEDIA_ROOT
    if not os.path.abspath(full_path).startswith(os.path.abspath(settings.MEDIA_ROOT)):
        return HttpResponseForbidden("Invalid file path")
    
    # Check if file exists
    if not os.path.exists(full_path):
        raise Http404("File not found")
    
    # Determine content type
    content_type, _ = mimetypes.guess_type(full_path)
    if not content_type:
        content_type = 'application/octet-stream'
    
    # Get file info
    filename = os.path.basename(full_path)
    file_size = os.path.getsize(full_path)
    
    # Read and serve file
    try:
        with open(full_path, 'rb') as f:
            file_data = f.read()
        
        response = HttpResponse(file_data, content_type=content_type)
        
        # Set CORS headers for frontend access
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Headers"] = "Authorization, Range, X-API-Key"
        response["Access-Control-Expose-Headers"] = "Content-Range, Content-Length, Content-Disposition"
        
        # Set file info headers
        response["Content-Length"] = file_size
        response["X-Served-By"] = "django-secure-media"
        
        # Set Content-Disposition based on file type
        file_ext = os.path.splitext(filename)[1].lower()
        
        # Files that should be downloaded (not displayed)
        download_types = [
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",       # .xlsx
            "application/msword",  # .doc
            "application/vnd.ms-excel",  # .xls
            "text/csv"
        ]
        download_extensions = [".docx", ".xlsx", ".csv", ".doc", ".xls"]
        
        # Check if file should be downloaded or displayed inline
        if content_type in download_types or file_ext in download_extensions:
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
        else:
            # Display inline for images, PDFs, and other viewable content
            response["Content-Disposition"] = f'inline; filename="{filename}"'
        
        return response
        
    except Exception as e:
        logger.error(f"Error serving file {file_path}: {str(e)}")
        return HttpResponse("Internal server error", status=500)


def has_file_permission(user, file_path, full_path):
    """
    Check if user has permission to access the specific file
    """
    # System admins and ticket coordinators have access to all files
    if (hasattr(user, 'role') and user.role in ['System Admin', 'Ticket Coordinator']) or user.is_staff:
        return True
    
    # Check if it's an employee profile image
    if file_path.startswith('employee_images/'):
        # Users can access their own profile image
        if hasattr(user, 'image') and user.image:
            user_image_path = os.path.join(settings.MEDIA_ROOT, user.image.name)
            if full_path and os.path.abspath(full_path) == os.path.abspath(user_image_path):
                return True
        
        # All authenticated users can view profile images (for team visibility)
        return True
    
    # BLOCK DIRECT ACCESS TO TICKET ATTACHMENTS
    # Ticket attachments should ONLY be accessible through the secure API endpoint
    if file_path.startswith('ticket_attachments/'):
        return False  # Force all ticket attachments to use API endpoint
    
    # Default deny
    return False


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def secure_attachment_download(request, attachment_id):
    """
    Secure download endpoint for specific ticket attachments
    """
    try:
        attachment = TicketAttachment.objects.get(id=attachment_id)
        ticket = attachment.ticket
        
        # Check permissions
        if not (
            request.user.is_staff or 
            (hasattr(request.user, 'role') and request.user.role in ['System Admin', 'Ticket Coordinator']) or
            request.user == ticket.employee or 
            request.user == ticket.assigned_to
        ):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        if not attachment.file:
            raise Http404("File not found")
        
        file_path = attachment.file.path
        if os.path.exists(file_path):
            with open(file_path, 'rb') as fh:
                file_data = fh.read()
            
            content_type, _ = mimetypes.guess_type(file_path)
            if not content_type:
                content_type = 'application/octet-stream'
            
            response = HttpResponse(file_data, content_type=content_type)
            response['Content-Disposition'] = f'attachment; filename="{attachment.file_name}"'
            response['Content-Length'] = len(file_data)
            return response
        else:
            raise Http404("File not found")
            
    except TicketAttachment.DoesNotExist:
        raise Http404("Attachment not found")
    except Exception as e:
        logger.error(f"Error downloading attachment {attachment_id}: {str(e)}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
