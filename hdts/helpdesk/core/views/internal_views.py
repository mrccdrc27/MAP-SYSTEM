# hdts/helpdesk/core/views/internal_views.py
"""
Internal API endpoints for service-to-service communication.
These endpoints are NOT exposed to frontend - only to trusted internal services.

Security:
- Requires X-Service-Key header for authentication
- Key is shared between services via environment variables
- Not routed through public API gateway
"""

import hashlib
import logging

from django.conf import settings
from django.http import FileResponse, HttpResponseForbidden, JsonResponse
from django.views.decorators.http import require_GET
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ..models import TicketAttachment

logger = logging.getLogger(__name__)


def verify_service_key(request) -> bool:
    """
    Verify internal service-to-service API key.
    
    Checks X-Service-Key header against INTERNAL_SERVICE_KEY setting.
    Returns False if key is missing, invalid, or not configured.
    """
    provided_key = request.headers.get('X-Service-Key')
    expected_key = getattr(settings, 'INTERNAL_SERVICE_KEY', None)
    
    if not expected_key:
        logger.warning("INTERNAL_SERVICE_KEY not configured - denying all internal requests")
        return False
    
    if not provided_key:
        logger.warning("Internal API request missing X-Service-Key header")
        return False
    
    # Constant-time comparison to prevent timing attacks
    import hmac
    return hmac.compare_digest(provided_key, expected_key)


def compute_file_hash(file_field) -> str:
    """
    Compute SHA-256 hash of file contents.
    
    Args:
        file_field: Django FileField
        
    Returns:
        Hash string in format "sha256:hexdigest"
    """
    hasher = hashlib.sha256()
    
    try:
        file_field.open('rb')
        for chunk in file_field.chunks(chunk_size=8192):
            hasher.update(chunk)
    finally:
        file_field.close()
    
    return f"sha256:{hasher.hexdigest()}"


@api_view(['GET'])
def internal_attachment_metadata(request, attachment_id):
    """
    Internal API: Get attachment metadata for workflow_api.
    
    This endpoint is called by workflow_api to get file information
    without downloading the file binary.
    
    Security: Requires X-Service-Key header
    
    GET /api/internal/attachments/{attachment_id}/metadata
    
    Response (200):
    {
        "id": 42,
        "ticket_id": 123,
        "ticket_number": "TKT-2025-001234",
        "file_name": "document.docx",
        "file_type": "application/vnd...",
        "file_size": 245678,
        "content_hash": "sha256:abc123...",
        "upload_date": "2025-12-30T10:30:00Z"
    }
    """
    if not verify_service_key(request):
        return HttpResponseForbidden("Invalid or missing service key")
    
    try:
        attachment = TicketAttachment.objects.select_related('ticket').get(id=attachment_id)
    except TicketAttachment.DoesNotExist:
        return Response(
            {"error": "Attachment not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Compute content hash if not already cached
    content_hash = getattr(attachment, 'content_hash', None)
    if not content_hash:
        try:
            content_hash = compute_file_hash(attachment.file)
            # Cache the hash if the model supports it
            if hasattr(attachment, 'content_hash'):
                attachment.content_hash = content_hash
                attachment.save(update_fields=['content_hash'])
        except Exception as e:
            logger.error(f"Failed to compute hash for attachment {attachment_id}: {e}")
            content_hash = ""
    
    return Response({
        "id": attachment.id,
        "ticket_id": attachment.ticket.id,
        "ticket_number": attachment.ticket.ticket_number,
        "file_name": attachment.file_name,
        "file_type": attachment.file_type,
        "file_size": attachment.file_size,
        "content_hash": content_hash,
        "upload_date": attachment.upload_date.isoformat(),
    })


@require_GET
def internal_attachment_file(request, attachment_id):
    """
    Internal API: Download attachment file binary for workflow_api.
    
    This endpoint is called by workflow_api's conversion worker
    to fetch the original file for PDF conversion.
    
    Security: Requires X-Service-Key header
    
    GET /api/internal/attachments/{attachment_id}/file
    
    Response (200):
    - Binary file content
    - Headers:
        Content-Type: <mime type>
        Content-Disposition: attachment; filename="..."
        Content-Length: <size>
        X-Content-Hash: sha256:...
    """
    if not verify_service_key(request):
        return HttpResponseForbidden("Invalid or missing service key")
    
    try:
        attachment = TicketAttachment.objects.get(id=attachment_id)
    except TicketAttachment.DoesNotExist:
        return JsonResponse(
            {"error": "Attachment not found"}, 
            status=404
        )
    
    # Compute content hash if needed
    content_hash = getattr(attachment, 'content_hash', None)
    if not content_hash:
        try:
            content_hash = compute_file_hash(attachment.file)
            if hasattr(attachment, 'content_hash'):
                attachment.content_hash = content_hash
                attachment.save(update_fields=['content_hash'])
        except Exception as e:
            logger.error(f"Failed to compute hash for attachment {attachment_id}: {e}")
            content_hash = ""
    
    try:
        response = FileResponse(
            attachment.file.open('rb'),
            content_type=attachment.file_type,
            as_attachment=True,
            filename=attachment.file_name
        )
        response['X-Content-Hash'] = content_hash
        response['Content-Length'] = attachment.file_size
        return response
        
    except Exception as e:
        logger.error(f"Failed to serve attachment {attachment_id}: {e}")
        return JsonResponse(
            {"error": "Failed to read file"}, 
            status=500
        )


@api_view(['GET'])
def internal_health(request):
    """
    Health check endpoint for service-to-service monitoring.
    Does not require authentication.
    
    GET /api/internal/health
    """
    return Response({
        "status": "healthy",
        "service": "helpdesk"
    })
