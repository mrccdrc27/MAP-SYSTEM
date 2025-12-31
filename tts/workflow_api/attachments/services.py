# workflow_api/attachments/services.py
"""
Service client for communicating with helpdesk service.
Handles service-to-service authentication and file fetching.
"""

import hashlib
import logging
import re
from typing import Optional, Tuple
from urllib.parse import urljoin

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class HelpdeskClientError(Exception):
    """Base exception for helpdesk client errors."""
    pass


class HelpdeskNotFoundError(HelpdeskClientError):
    """Raised when attachment is not found in helpdesk."""
    pass


class HelpdeskServiceError(HelpdeskClientError):
    """Raised when helpdesk service is unavailable or returns error."""
    pass


class HelpdeskClient:
    """
    Client for secure communication with helpdesk service.
    
    Handles:
    - Service-to-service authentication via X-Service-Key header
    - Fetching attachment metadata
    - Fetching attachment file binaries
    - Error handling and retries
    
    Usage:
        client = HelpdeskClient()
        metadata = client.get_attachment_metadata(42)
        file_bytes, info = client.get_attachment_file(42)
    """
    
    # Class-level error types for exception handling
    NotFoundError = HelpdeskNotFoundError
    ServiceError = HelpdeskServiceError
    
    def __init__(self, base_url: Optional[str] = None, service_key: Optional[str] = None):
        """
        Initialize helpdesk client.
        
        Args:
            base_url: Helpdesk service URL (defaults to settings.HELPDESK_SERVICE_URL)
            service_key: Service authentication key (defaults to settings.HELPDESK_SERVICE_KEY)
        """
        self.base_url = base_url or getattr(settings, 'HELPDESK_SERVICE_URL', 'http://localhost:8000')
        self.service_key = service_key or getattr(settings, 'HELPDESK_SERVICE_KEY', '')
        self.timeout = getattr(settings, 'HELPDESK_CLIENT_TIMEOUT', 60)
    
    def _get_headers(self) -> dict:
        """Get headers for service-to-service requests."""
        return {
            'X-Service-Key': self.service_key,
            'Accept': 'application/json',
            'User-Agent': 'workflow-api/1.0',
        }
    
    def _build_url(self, path: str) -> str:
        """Build full URL from path."""
        return urljoin(self.base_url, path)
    
    def get_attachment_metadata(self, attachment_id: int) -> dict:
        """
        Get attachment metadata from helpdesk without downloading file.
        
        Args:
            attachment_id: ID of the attachment in helpdesk
            
        Returns:
            dict with keys: id, ticket_id, ticket_number, file_name, 
                           file_type, file_size, content_hash, upload_date
                           
        Raises:
            HelpdeskNotFoundError: If attachment doesn't exist
            HelpdeskServiceError: If service is unavailable
        """
        url = self._build_url(f'/api/internal/attachments/{attachment_id}/metadata')
        
        try:
            response = requests.get(
                url,
                headers=self._get_headers(),
                timeout=self.timeout
            )
            
            if response.status_code == 404:
                raise HelpdeskNotFoundError(f"Attachment {attachment_id} not found")
            
            if response.status_code == 403:
                raise HelpdeskServiceError("Invalid service key")
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Failed to connect to helpdesk: {e}")
            raise HelpdeskServiceError(f"Helpdesk service unavailable: {e}")
        except requests.exceptions.Timeout as e:
            logger.error(f"Helpdesk request timed out: {e}")
            raise HelpdeskServiceError(f"Helpdesk request timed out: {e}")
        except requests.exceptions.RequestException as e:
            logger.error(f"Helpdesk request failed: {e}")
            raise HelpdeskServiceError(f"Helpdesk request failed: {e}")
    
    def get_attachment_file(self, attachment_id: int) -> Tuple[bytes, dict]:
        """
        Download attachment file binary from helpdesk.
        
        Args:
            attachment_id: ID of the attachment in helpdesk
            
        Returns:
            Tuple of (file_bytes, metadata_dict)
            metadata_dict contains: content_type, content_hash, file_name
            
        Raises:
            HelpdeskNotFoundError: If attachment doesn't exist
            HelpdeskServiceError: If service is unavailable
        """
        url = self._build_url(f'/api/internal/attachments/{attachment_id}/file')
        
        try:
            response = requests.get(
                url,
                headers={
                    **self._get_headers(),
                    'Accept': 'application/octet-stream',
                },
                timeout=self.timeout,
                stream=True
            )
            
            if response.status_code == 404:
                raise HelpdeskNotFoundError(f"Attachment {attachment_id} not found")
            
            if response.status_code == 403:
                raise HelpdeskServiceError("Invalid service key")
            
            response.raise_for_status()
            
            # Extract metadata from headers
            metadata = {
                'content_type': response.headers.get('Content-Type', 'application/octet-stream'),
                'content_hash': response.headers.get('X-Content-Hash', ''),
                'file_name': self._parse_filename(response.headers.get('Content-Disposition', '')),
                'file_size': int(response.headers.get('Content-Length', 0)),
            }
            
            return response.content, metadata
            
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Failed to connect to helpdesk: {e}")
            raise HelpdeskServiceError(f"Helpdesk service unavailable: {e}")
        except requests.exceptions.Timeout as e:
            logger.error(f"Helpdesk request timed out: {e}")
            raise HelpdeskServiceError(f"Helpdesk request timed out: {e}")
        except requests.exceptions.RequestException as e:
            logger.error(f"Helpdesk request failed: {e}")
            raise HelpdeskServiceError(f"Helpdesk request failed: {e}")
    
    def _parse_filename(self, content_disposition: str) -> str:
        """Parse filename from Content-Disposition header."""
        if not content_disposition:
            return 'attachment'
        
        # Try to find filename="..." or filename*=UTF-8''...
        match = re.search(r'filename[*]?=["\']?([^"\';]+)["\']?', content_disposition)
        if match:
            return match.group(1)
        return 'attachment'
    
    def check_health(self) -> bool:
        """
        Check if helpdesk service is healthy.
        
        Returns:
            True if service is responding, False otherwise
        """
        try:
            response = requests.get(
                self._build_url('/api/health/'),
                timeout=5
            )
            return response.status_code == 200
        except requests.exceptions.RequestException:
            return False


def compute_content_hash(content: bytes) -> str:
    """
    Compute SHA-256 hash of content.
    
    Args:
        content: Bytes to hash
        
    Returns:
        Hash string in format "sha256:hexdigest"
    """
    hasher = hashlib.sha256()
    hasher.update(content)
    return f"sha256:{hasher.hexdigest()}"


def is_convertible(mime_type: str) -> bool:
    """
    Check if a MIME type can be converted to PDF.
    
    Args:
        mime_type: MIME type string (e.g., "application/pdf")
        
    Returns:
        True if file can be converted or is already PDF
    """
    convertible_types = {
        # Already PDF
        'application/pdf',
        
        # Microsoft Office
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        
        # OpenDocument
        'application/vnd.oasis.opendocument.text',
        'application/vnd.oasis.opendocument.spreadsheet',
        'application/vnd.oasis.opendocument.presentation',
        
        # Text formats
        'text/plain',
        'text/csv',
        'text/rtf',
        'application/rtf',
        
        # Images
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/bmp',
        'image/tiff',
        'image/webp',
    }
    
    return mime_type.lower() in convertible_types


def estimate_conversion_time(file_size: int, file_type: str) -> int:
    """
    Estimate conversion time in seconds based on file size and type.
    
    Args:
        file_size: File size in bytes
        file_type: MIME type
        
    Returns:
        Estimated conversion time in seconds
    """
    # Base time varies by file type
    if file_type == 'application/pdf':
        return 0  # No conversion needed
    
    # Images are fast
    if file_type.startswith('image/'):
        return 5
    
    # Text files are fast
    if file_type.startswith('text/'):
        return 5
    
    # Office documents: estimate based on size
    # Rough estimate: 1 second per 500KB
    size_factor = max(1, file_size // (500 * 1024))
    
    # Cap at 60 seconds for very large files
    return min(60, 5 + size_factor * 2)


def get_file_extension_from_mime(mime_type: str) -> str:
    """
    Get file extension from MIME type.
    
    Args:
        mime_type: MIME type string
        
    Returns:
        File extension including dot (e.g., ".docx")
    """
    mime_to_ext = {
        'application/pdf': '.pdf',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/vnd.ms-excel': '.xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        'application/vnd.ms-powerpoint': '.ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
        'application/vnd.oasis.opendocument.text': '.odt',
        'application/vnd.oasis.opendocument.spreadsheet': '.ods',
        'application/vnd.oasis.opendocument.presentation': '.odp',
        'text/plain': '.txt',
        'text/csv': '.csv',
        'text/rtf': '.rtf',
        'application/rtf': '.rtf',
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/bmp': '.bmp',
        'image/tiff': '.tiff',
        'image/webp': '.webp',
    }
    
    return mime_to_ext.get(mime_type.lower(), '.bin')


def is_viewable_without_libreoffice(mime_type: str) -> bool:
    """
    Check if a file can be viewed in browser without LibreOffice conversion.
    
    These types can be displayed directly or converted with Python-only tools:
    - PDFs: native browser support
    - Images: converted to PDF with PIL (no external tools)
    
    Args:
        mime_type: MIME type string
        
    Returns:
        True if file can be viewed without LibreOffice
    """
    viewable_types = {
        # PDFs - native browser support
        'application/pdf',
        
        # Images - PIL can convert these to PDF
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/bmp',
        'image/tiff',
        'image/webp',
    }
    
    return mime_type.lower() in viewable_types


def requires_libreoffice(mime_type: str) -> bool:
    """
    Check if a file type requires LibreOffice for PDF conversion.
    
    Args:
        mime_type: MIME type string
        
    Returns:
        True if LibreOffice is needed, False if viewable without it
    """
    if not is_convertible(mime_type):
        return False  # Not convertible at all
    
    return not is_viewable_without_libreoffice(mime_type)
