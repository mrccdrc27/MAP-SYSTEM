import os
import mimetypes
from django.http import FileResponse, Http404
from django.conf import settings
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny

from ..authentication import CookieJWTAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication


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


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def serve_ticket_attachment(request, file_path):
    """
    Serve ticket attachment files publicly (no authentication required).
    Only serves files from the ticket_attachments directory for security.
    Used by TTS frontend to display ticket attachments.
    """
    # Security: Only allow files from ticket_attachments directory
    if not file_path.startswith('ticket_attachments/'):
        raise Http404("Invalid file path")
    
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
        # Add CORS headers for cross-origin access
        response['Access-Control-Allow-Origin'] = '*'
        return response
    except Exception as e:
        raise Http404(f"Error serving file: {str(e)}")


@api_view(['GET'])
@authentication_classes([JWTAuthentication, CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def test_jwt_view(request):
    return Response({
        "authenticated_user": str(request.user),
        "auth_type": request.successful_authenticator.__class__.__name__
    })
