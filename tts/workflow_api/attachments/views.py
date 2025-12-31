# workflow_api/attachments/views.py
"""
REST API views for attachment viewing and downloading.
These are the frontend-facing endpoints that abstract helpdesk internals.
"""

import io
import logging
from typing import Optional

from django.http import FileResponse, StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

# Use the same authentication as other workflow_api views
from authentication import JWTCookieAuthentication

from .models import AttachmentPDFCache
from .services import (
    HelpdeskClient,
    HelpdeskNotFoundError,
    HelpdeskServiceError,
    is_convertible,
    is_viewable_without_libreoffice,
    requires_libreoffice,
    estimate_conversion_time,
)
from .tasks import convert_attachment_to_pdf, LIBREOFFICE_AVAILABLE

logger = logging.getLogger(__name__)


class AttachmentViewAPI(APIView):
    """
    View attachment as PDF in browser.
    
    GET /api/tickets/{ticket_number}/attachments/{attachment_id}/view
    
    Query params:
        force_refresh: boolean - Force re-conversion even if cached
    
    Returns:
        200: PDF binary (Content-Type: application/pdf)
        202: Conversion in progress (poll status endpoint)
        404: Attachment not found
        415: Unsupported file type
        503: Conversion failed
    """
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, ticket_number: str, attachment_id: int):
        force_refresh = request.query_params.get('force_refresh', 'false').lower() == 'true'
        helpdesk = HelpdeskClient()
        
        # 1. Get metadata from helpdesk
        try:
            metadata = helpdesk.get_attachment_metadata(attachment_id)
        except HelpdeskNotFoundError:
            return Response(
                {"error": "Attachment not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except HelpdeskServiceError as e:
            logger.error(f"Helpdesk service error: {e}")
            return Response(
                {"error": "Service temporarily unavailable"}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # 2. Check if file type is supported for conversion
        file_type = metadata['file_type']
        
        # If LibreOffice is not available, only allow PDFs and images
        if not is_convertible(file_type):
            return Response({
                "status": "not_supported",
                "message": "This file type cannot be converted to PDF for preview",
                "file_type": file_type,
                "download_url": f"/api/tickets/{ticket_number}/attachments/{attachment_id}/download"
            }, status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)
        
        # Check if this type needs LibreOffice but it's not available
        if requires_libreoffice(file_type) and not LIBREOFFICE_AVAILABLE:
            return Response({
                "status": "not_supported",
                "message": "PDF preview for Office documents is not available. Please download the file instead.",
                "file_type": file_type,
                "requires": "libreoffice",
                "download_url": f"/api/tickets/{ticket_number}/attachments/{attachment_id}/download"
            }, status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)
        
        # 3. Check for existing cache
        cache = AttachmentPDFCache.get_or_none(attachment_id)
        
        # 4. Handle cached scenarios
        if cache and not force_refresh:
            return self._handle_cached(cache, metadata, ticket_number, attachment_id, helpdesk)
        
        # 5. No valid cache - check if source is already PDF (passthrough)
        if metadata['file_type'] == 'application/pdf':
            return self._handle_pdf_passthrough(
                metadata, ticket_number, attachment_id, helpdesk
            )
        
        # 6. Handle images - serve directly (browsers display them natively)
        if metadata['file_type'].startswith('image/'):
            return self._handle_image_passthrough(
                metadata, ticket_number, attachment_id, helpdesk
            )
        
        # 7. Initiate new conversion (for Office docs when LibreOffice is available)
        return self._initiate_conversion(metadata, ticket_number, attachment_id)
    
    def _handle_cached(
        self, 
        cache: AttachmentPDFCache, 
        metadata: dict, 
        ticket_number: str, 
        attachment_id: int,
        helpdesk: HelpdeskClient
    ) -> Response:
        """Handle request when cache entry exists."""
        
        if cache.status == AttachmentPDFCache.ConversionStatus.COMPLETED:
            # Verify cache is still valid (source hasn't changed)
            if cache.original_content_hash == metadata.get('content_hash', ''):
                cache.mark_accessed()
                return self._serve_cached_pdf(cache, metadata['file_name'])
            else:
                # Source changed - invalidate and reconvert
                logger.info(f"Cache invalidated for attachment {attachment_id} (hash changed)")
                cache.invalidate()
                return self._initiate_conversion(metadata, ticket_number, attachment_id)
        
        elif cache.status == AttachmentPDFCache.ConversionStatus.PROCESSING:
            # Conversion already in progress
            return Response({
                "status": "processing",
                "message": "File is being converted to PDF",
                "poll_url": f"/api/attachments/{attachment_id}/conversion-status",
                "estimated_wait_seconds": 15
            }, status=status.HTTP_202_ACCEPTED)
        
        elif cache.status == AttachmentPDFCache.ConversionStatus.PASSTHROUGH:
            # Original is PDF - stream directly from helpdesk
            cache.mark_accessed()
            return self._stream_from_helpdesk(attachment_id, metadata['file_name'], helpdesk)
        
        elif cache.status == AttachmentPDFCache.ConversionStatus.FAILED:
            if cache.can_retry():
                # Allow retry
                cache.invalidate()
                return self._initiate_conversion(metadata, ticket_number, attachment_id)
            else:
                # No more retries
                return Response({
                    "status": "failed",
                    "message": cache.error_message or "PDF conversion failed",
                    "download_url": f"/api/tickets/{ticket_number}/attachments/{attachment_id}/download"
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        elif cache.status == AttachmentPDFCache.ConversionStatus.NOT_SUPPORTED:
            return Response({
                "status": "not_supported",
                "message": "This file type cannot be converted to PDF",
                "download_url": f"/api/tickets/{ticket_number}/attachments/{attachment_id}/download"
            }, status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)
        
        elif cache.status == AttachmentPDFCache.ConversionStatus.PENDING:
            # Shouldn't happen often, but handle gracefully
            return Response({
                "status": "processing",
                "message": "Conversion is queued",
                "poll_url": f"/api/attachments/{attachment_id}/conversion-status",
                "estimated_wait_seconds": 30
            }, status=status.HTTP_202_ACCEPTED)
        
        # Fallback - unknown status, try reconversion
        cache.invalidate()
        return self._initiate_conversion(metadata, ticket_number, attachment_id)
    
    def _serve_cached_pdf(self, cache: AttachmentPDFCache, original_filename: str) -> FileResponse:
        """Serve cached PDF file."""
        pdf_filename = f"{original_filename.rsplit('.', 1)[0]}.pdf"
        
        response = FileResponse(
            cache.pdf_file.open('rb'),
            content_type='application/pdf',
            as_attachment=False,
            filename=pdf_filename
        )
        response['Content-Disposition'] = f'inline; filename="{pdf_filename}"'
        response['X-Conversion-Source'] = 'cache'
        response['Content-Length'] = cache.pdf_file_size
        return response
    
    def _stream_from_helpdesk(
        self, 
        attachment_id: int, 
        filename: str, 
        helpdesk: HelpdeskClient
    ) -> FileResponse:
        """Stream PDF directly from helpdesk (passthrough)."""
        file_bytes, metadata = helpdesk.get_attachment_file(attachment_id)
        
        response = FileResponse(
            io.BytesIO(file_bytes),
            content_type='application/pdf',
            as_attachment=False,
            filename=filename
        )
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        response['X-Conversion-Source'] = 'passthrough'
        response['Content-Length'] = len(file_bytes)
        return response
    
    def _handle_pdf_passthrough(
        self,
        metadata: dict,
        ticket_number: str,
        attachment_id: int,
        helpdesk: HelpdeskClient
    ) -> FileResponse:
        """Handle case where original file is already PDF."""
        # Create passthrough cache entry for tracking
        AttachmentPDFCache.objects.create(
            helpdesk_attachment_id=attachment_id,
            ticket_number=ticket_number,
            original_file_name=metadata['file_name'],
            original_file_type=metadata['file_type'],
            original_file_size=metadata['file_size'],
            original_content_hash=metadata.get('content_hash', ''),
            status=AttachmentPDFCache.ConversionStatus.PASSTHROUGH
        )
        
        return self._stream_from_helpdesk(attachment_id, metadata['file_name'], helpdesk)
    
    def _handle_image_passthrough(
        self,
        metadata: dict,
        ticket_number: str,
        attachment_id: int,
        helpdesk: HelpdeskClient
    ) -> FileResponse:
        """Handle images - serve directly (browsers display them natively)."""
        # Create passthrough cache entry for tracking
        AttachmentPDFCache.objects.create(
            helpdesk_attachment_id=attachment_id,
            ticket_number=ticket_number,
            original_file_name=metadata['file_name'],
            original_file_type=metadata['file_type'],
            original_file_size=metadata['file_size'],
            original_content_hash=metadata.get('content_hash', ''),
            status=AttachmentPDFCache.ConversionStatus.PASSTHROUGH
        )
        
        return self._stream_image_from_helpdesk(attachment_id, metadata, helpdesk)
    
    def _stream_image_from_helpdesk(
        self,
        attachment_id: int,
        metadata: dict,
        helpdesk: HelpdeskClient
    ) -> FileResponse:
        """Stream image directly from helpdesk (for native browser display)."""
        file_bytes, _ = helpdesk.get_attachment_file(attachment_id)
        
        response = FileResponse(
            io.BytesIO(file_bytes),
            content_type=metadata['file_type'],
            as_attachment=False,
            filename=metadata['file_name']
        )
        response['Content-Disposition'] = f'inline; filename="{metadata["file_name"]}"'
        response['X-Conversion-Source'] = 'passthrough-image'
        response['Content-Length'] = len(file_bytes)
        return response
    
    def _initiate_conversion(
        self,
        metadata: dict,
        ticket_number: str,
        attachment_id: int
    ) -> Response:
        """Create cache entry and enqueue conversion task."""
        cache = AttachmentPDFCache.objects.create(
            helpdesk_attachment_id=attachment_id,
            ticket_number=ticket_number,
            original_file_name=metadata['file_name'],
            original_file_type=metadata['file_type'],
            original_file_size=metadata['file_size'],
            original_content_hash=metadata.get('content_hash', ''),
            status=AttachmentPDFCache.ConversionStatus.PENDING
        )
        
        # Enqueue async conversion task
        convert_attachment_to_pdf.delay(
            cache_id=cache.id,
            attachment_id=attachment_id,
            file_name=metadata['file_name'],
            file_type=metadata['file_type']
        )
        
        logger.info(f"Queued conversion for attachment {attachment_id}")
        
        return Response({
            "status": "processing",
            "message": "File is being converted to PDF",
            "poll_url": f"/api/attachments/{attachment_id}/conversion-status",
            "estimated_wait_seconds": estimate_conversion_time(
                metadata['file_size'], 
                metadata['file_type']
            )
        }, status=status.HTTP_202_ACCEPTED)


class AttachmentDownloadAPI(APIView):
    """
    Download original attachment file.
    Proxies request through to helpdesk to hide internal service.
    
    GET /api/tickets/{ticket_number}/attachments/{attachment_id}/download
    """
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, ticket_number: str, attachment_id: int):
        helpdesk = HelpdeskClient()
        
        try:
            file_bytes, metadata = helpdesk.get_attachment_file(attachment_id)
        except HelpdeskNotFoundError:
            return Response(
                {"error": "Attachment not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except HelpdeskServiceError as e:
            logger.error(f"Helpdesk service error: {e}")
            return Response(
                {"error": "Service temporarily unavailable"}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        response = FileResponse(
            io.BytesIO(file_bytes),
            content_type=metadata['content_type'],
            as_attachment=True,
            filename=metadata['file_name']
        )
        response['Content-Length'] = len(file_bytes)
        return response


class ConversionStatusAPI(APIView):
    """
    Get conversion status for polling UI.
    
    GET /api/attachments/{attachment_id}/conversion-status
    """
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, attachment_id: int):
        cache = get_object_or_404(
            AttachmentPDFCache, 
            helpdesk_attachment_id=attachment_id
        )
        
        return Response({
            "status": cache.status,
            "message": self._get_status_message(cache),
            "original_file_name": cache.original_file_name,
            "original_file_type": cache.original_file_type,
            "original_file_size": cache.original_file_size,
            "created_at": cache.created_at.isoformat(),
            "started_at": cache.conversion_started_at.isoformat() if cache.conversion_started_at else None,
            "completed_at": cache.conversion_completed_at.isoformat() if cache.conversion_completed_at else None,
            "error_message": cache.error_message,
            "retry_count": cache.retry_count,
            "max_retries": cache.max_retries,
            "view_url": f"/api/tickets/{cache.ticket_number}/attachments/{attachment_id}/view" 
                        if cache.is_ready else None,
            "download_url": f"/api/tickets/{cache.ticket_number}/attachments/{attachment_id}/download"
        })
    
    def _get_status_message(self, cache: AttachmentPDFCache) -> str:
        """Get human-readable status message."""
        messages = {
            AttachmentPDFCache.ConversionStatus.PENDING: "Conversion queued",
            AttachmentPDFCache.ConversionStatus.PROCESSING: "Converting to PDF...",
            AttachmentPDFCache.ConversionStatus.COMPLETED: "PDF ready",
            AttachmentPDFCache.ConversionStatus.FAILED: "Conversion failed",
            AttachmentPDFCache.ConversionStatus.NOT_SUPPORTED: "File type not supported for preview",
            AttachmentPDFCache.ConversionStatus.PASSTHROUGH: "PDF ready (original format)",
        }
        return messages.get(cache.status, "Unknown status")


class TicketAttachmentsListAPI(APIView):
    """
    List all attachments for a ticket with conversion status.
    
    GET /api/tickets/{ticket_number}/attachments
    """
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, ticket_number: str):
        from tickets.models import WorkflowTicket
        
        # Get ticket to retrieve attachment list
        ticket = get_object_or_404(WorkflowTicket, ticket_number=ticket_number)
        
        attachments_data = ticket.ticket_data.get('attachments', [])
        
        result = []
        for att in attachments_data:
            att_id = att.get('id')
            cache = AttachmentPDFCache.get_or_none(att_id) if att_id else None
            
            result.append({
                "id": att_id,
                "file_name": att.get('file_name', 'Unknown'),
                "file_type": att.get('file_type', 'application/octet-stream'),
                "file_size": att.get('file_size', 0),
                "file_size_display": self._format_file_size(att.get('file_size', 0)),
                "can_preview": is_convertible(att.get('file_type', '')),
                "preview_status": cache.status if cache else 'not_started',
                "view_url": f"/api/tickets/{ticket_number}/attachments/{att_id}/view" if att_id else None,
                "download_url": f"/api/tickets/{ticket_number}/attachments/{att_id}/download" if att_id else None,
            })
        
        return Response({"attachments": result})
    
    def _format_file_size(self, size_bytes: int) -> str:
        """Format file size for display."""
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.1f} KB"
        elif size_bytes < 1024 * 1024 * 1024:
            return f"{size_bytes / (1024 * 1024):.1f} MB"
        else:
            return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"
