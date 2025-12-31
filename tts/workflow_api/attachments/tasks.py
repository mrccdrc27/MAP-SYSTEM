# workflow_api/attachments/tasks.py
"""
Celery tasks for asynchronous PDF conversion.
Handles fetching files from helpdesk and converting to PDF.
"""

import logging
import os
import platform
import shutil
import subprocess
import tempfile
import threading
import time
import uuid
from contextlib import contextmanager
from typing import Optional

from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone

logger = logging.getLogger(__name__)

IS_WINDOWS = platform.system() == 'Windows'

# Global lock for LibreOffice on Windows (single-instance)
# This ensures only one LibreOffice conversion runs at a time
_libreoffice_lock = threading.Lock()

# Configuration with defaults
MAX_FILE_SIZE = getattr(settings, 'PDF_CONVERSION_MAX_FILE_SIZE', 50 * 1024 * 1024)  # 50MB
CONVERSION_TIMEOUT = getattr(settings, 'PDF_CONVERSION_TIMEOUT', 120)  # 2 minutes
LIBREOFFICE_PATH = getattr(settings, 'LIBREOFFICE_PATH', 'soffice')

# Check if LibreOffice is available at startup
# On Windows, just check if the executable exists (--version can hang)
LIBREOFFICE_AVAILABLE = False
if os.path.isfile(LIBREOFFICE_PATH):
    LIBREOFFICE_AVAILABLE = True
    logger.info(f"LibreOffice found at: {LIBREOFFICE_PATH}")
else:
    # Check if it's in PATH
    import shutil
    found_path = shutil.which(LIBREOFFICE_PATH) or shutil.which('soffice')
    if found_path:
        LIBREOFFICE_PATH = found_path
        LIBREOFFICE_AVAILABLE = True
        logger.info(f"LibreOffice found in PATH: {LIBREOFFICE_PATH}")
    else:
        logger.warning(f"LibreOffice not found at '{LIBREOFFICE_PATH}'. Office document conversion will be disabled.")


class ConversionError(Exception):
    """Raised when PDF conversion fails."""
    pass


class FileTooLargeError(ConversionError):
    """Raised when file exceeds size limit."""
    pass


class ConversionTimeoutError(ConversionError):
    """Raised when conversion times out."""
    pass


class UnsupportedFormatError(ConversionError):
    """Raised when file format is not supported."""
    pass


@shared_task(
    name='attachments.tasks.convert_attachment_to_pdf',
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(ConversionError,),
    retry_backoff=True,
    retry_backoff_max=300,
    acks_late=True,
    queue='pdf_conversion_queue'
)
def convert_attachment_to_pdf(
    self,
    cache_id: int,
    attachment_id: int,
    file_name: str,
    file_type: str
) -> dict:
    """
    Async task to convert attachment to PDF.
    
    Flow:
    1. Update cache status to PROCESSING
    2. Fetch file from helpdesk service
    3. Validate file size
    4. Convert using LibreOffice (or passthrough for images)
    5. Validate output PDF
    6. Store in cache model
    7. Cleanup temp files
    
    Args:
        cache_id: ID of AttachmentPDFCache record
        attachment_id: ID of attachment in helpdesk
        file_name: Original filename
        file_type: MIME type of original file
        
    Returns:
        dict with status and cache_id
    """
    from .models import AttachmentPDFCache
    from .services import HelpdeskClient, HelpdeskServiceError
    
    cache = AttachmentPDFCache.objects.get(id=cache_id)
    temp_dir = None
    
    try:
        # 1. Update status to processing
        cache.status = AttachmentPDFCache.ConversionStatus.PROCESSING
        cache.conversion_started_at = timezone.now()
        cache.save(update_fields=['status', 'conversion_started_at', 'updated_at'])
        
        logger.info(f"Starting conversion for attachment {attachment_id}")
        
        # 2. Fetch file from helpdesk
        helpdesk = HelpdeskClient()
        try:
            file_bytes, metadata = helpdesk.get_attachment_file(attachment_id)
        except HelpdeskServiceError as e:
            raise ConversionError(f"Failed to fetch file from helpdesk: {e}")
        
        # 3. Validate file size
        if len(file_bytes) > MAX_FILE_SIZE:
            raise FileTooLargeError(
                f"File too large: {len(file_bytes):,} bytes (max {MAX_FILE_SIZE:,})"
            )
        
        # 4. Create isolated temp directory
        temp_dir = os.path.join(tempfile.gettempdir(), 'pdf_conversions', str(uuid.uuid4()))
        os.makedirs(temp_dir, mode=0o700)
        
        # 5. Write source file to temp
        source_ext = os.path.splitext(file_name)[1] or _get_extension(file_type)
        source_path = os.path.join(temp_dir, f'source{source_ext}')
        
        with open(source_path, 'wb') as f:
            f.write(file_bytes)
            f.flush()
            os.fsync(f.fileno())  # Force write to disk
        
        # Small delay to ensure file handle is fully released on Windows
        if IS_WINDOWS:
            time.sleep(0.2)
        
        logger.info(f"Wrote {len(file_bytes):,} bytes to {source_path}")
        
        # 6. Convert to PDF
        pdf_path = _convert_file_to_pdf(source_path, temp_dir, file_type)
        
        # 7. Validate output PDF
        if not _validate_pdf(pdf_path):
            raise ConversionError("Output is not a valid PDF")
        
        # 8. Store PDF in cache
        with open(pdf_path, 'rb') as f:
            pdf_content = f.read()
        
        # Generate cache filename: {attachment_id}_{hash[:12]}.pdf
        hash_prefix = cache.original_content_hash.replace('sha256:', '')[:12]
        pdf_filename = f"{attachment_id}_{hash_prefix}.pdf"
        
        cache.pdf_file.save(pdf_filename, ContentFile(pdf_content), save=False)
        cache.pdf_file_size = len(pdf_content)
        cache.status = AttachmentPDFCache.ConversionStatus.COMPLETED
        cache.conversion_completed_at = timezone.now()
        cache.error_message = None
        cache.save()
        
        logger.info(
            f"Conversion complete for attachment {attachment_id}: "
            f"{len(pdf_content):,} bytes in {cache.conversion_duration:.1f}s"
        )
        
        return {"status": "success", "cache_id": cache_id}
        
    except FileTooLargeError as e:
        # Don't retry for file size errors
        cache.status = AttachmentPDFCache.ConversionStatus.FAILED
        cache.error_message = str(e)
        cache.save()
        logger.warning(f"File too large for conversion: {attachment_id}")
        return {"status": "failed", "error": str(e)}
        
    except UnsupportedFormatError as e:
        # Don't retry for unsupported formats
        cache.status = AttachmentPDFCache.ConversionStatus.NOT_SUPPORTED
        cache.error_message = str(e)
        cache.save()
        logger.warning(f"Unsupported format: {attachment_id} - {file_type}")
        return {"status": "not_supported", "error": str(e)}
        
    except ConversionError as e:
        # Retry-able conversion errors
        cache.retry_count = self.request.retries
        cache.error_message = str(e)
        
        if self.request.retries >= self.max_retries:
            cache.status = AttachmentPDFCache.ConversionStatus.FAILED
            cache.save()
            logger.error(f"Conversion failed after {self.max_retries} retries: {attachment_id}")
            return {"status": "failed", "error": str(e)}
        else:
            cache.save(update_fields=['retry_count', 'error_message', 'updated_at'])
            logger.warning(f"Conversion attempt {self.request.retries + 1} failed, retrying: {e}")
            raise  # Trigger retry
            
    except Exception as e:
        # Unexpected errors
        cache.status = AttachmentPDFCache.ConversionStatus.FAILED
        cache.error_message = f"Unexpected error: {str(e)}"
        cache.save()
        logger.exception(f"Unexpected error converting attachment {attachment_id}")
        raise
        
    finally:
        # Always cleanup temp directory
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
                logger.debug(f"Cleaned up temp dir: {temp_dir}")
            except Exception as e:
                logger.warning(f"Failed to cleanup temp dir: {e}")


def _convert_file_to_pdf(source_path: str, output_dir: str, mime_type: str) -> str:
    """
    Convert file to PDF using appropriate method.
    
    Args:
        source_path: Path to source file
        output_dir: Directory for output PDF
        mime_type: MIME type of source file
        
    Returns:
        Path to generated PDF
        
    Raises:
        ConversionError: If conversion fails
        ConversionTimeoutError: If conversion times out
        UnsupportedFormatError: If format cannot be converted (no LibreOffice)
    """
    # PDFs: passthrough (no conversion needed)
    if mime_type == 'application/pdf':
        # Just copy the file with .pdf extension
        source_name = os.path.splitext(os.path.basename(source_path))[0]
        pdf_path = os.path.join(output_dir, f'{source_name}.pdf')
        shutil.copy2(source_path, pdf_path)
        return pdf_path
    
    # Images: use PIL (no LibreOffice needed)
    if mime_type.startswith('image/'):
        return _convert_image_to_pdf(source_path, output_dir)
    
    # Office documents: require LibreOffice
    if not LIBREOFFICE_AVAILABLE:
        raise UnsupportedFormatError(
            f"Cannot convert {mime_type} to PDF. "
            "LibreOffice is not installed. File can only be downloaded."
        )
    
    # Use LibreOffice for documents
    return _convert_with_libreoffice(source_path, output_dir)


def _convert_with_libreoffice(source_path: str, output_dir: str) -> str:
    """
    Convert document to PDF using LibreOffice headless.
    
    Args:
        source_path: Path to source document
        output_dir: Directory for output PDF
        
    Returns:
        Path to generated PDF
    """
    # On Windows, use soffice.exe with specific flags
    # Create a unique UserInstallation profile to avoid lock conflicts between concurrent tasks
    user_install_dir = os.path.join(output_dir, 'libreoffice_profile')
    os.makedirs(user_install_dir, exist_ok=True)
    
    cmd = [
        LIBREOFFICE_PATH,
        f'-env:UserInstallation=file:///{user_install_dir.replace(os.sep, "/")}',
        '--headless',
        '--invisible',
        '--nodefault',
        '--nofirststartwizard',
        '--nolockcheck',
        '--nologo',
        '--norestore',
        '--convert-to', 'pdf',
        '--outdir', output_dir,
        source_path
    ]
    
    logger.info(f"Running LibreOffice conversion: {source_path} -> {output_dir}")
    logger.debug(f"Command: {' '.join(cmd)}")
    
    # Use lock to serialize LibreOffice calls on Windows (helps with concurrency issues)
    # This is a process-level lock, so it only works within a single worker process
    # For multi-process workers, we rely on unique UserInstallation profiles
    acquired = False
    try:
        # Try to acquire lock with timeout on Windows
        if IS_WINDOWS:
            acquired = _libreoffice_lock.acquire(timeout=60)
            if not acquired:
                raise ConversionError("Could not acquire LibreOffice lock (another conversion in progress)")
            # Extra delay to let any previous LibreOffice process fully exit
            time.sleep(0.5)
        
        env = os.environ.copy()
        env['TMPDIR'] = output_dir
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            timeout=CONVERSION_TIMEOUT,
            check=False,  # Don't raise on non-zero exit
            env=env
        )
        
        stdout = result.stdout.decode() if result.stdout else ''
        stderr = result.stderr.decode() if result.stderr else ''
        
        logger.info(f"LibreOffice exit code: {result.returncode}")
        if stdout:
            logger.info(f"LibreOffice stdout: {stdout}")
        if stderr:
            logger.warning(f"LibreOffice stderr: {stderr}")
        
        # LibreOffice sometimes returns non-zero but still succeeds
        # Check for output file regardless of exit code
        
    except subprocess.TimeoutExpired:
        raise ConversionTimeoutError(
            f"Conversion timed out after {CONVERSION_TIMEOUT} seconds"
        )
    except FileNotFoundError:
        raise ConversionError(
            f"LibreOffice not found at '{LIBREOFFICE_PATH}'. "
            "Install LibreOffice or set LIBREOFFICE_PATH in settings."
        )
    finally:
        if acquired:
            _libreoffice_lock.release()
    
    # Find generated PDF - check multiple possible names
    source_name = os.path.splitext(os.path.basename(source_path))[0]
    pdf_path = os.path.join(output_dir, f'{source_name}.pdf')
    
    # List directory contents for debugging
    try:
        dir_contents = os.listdir(output_dir)
        logger.info(f"Output directory contents: {dir_contents}")
    except Exception as e:
        logger.warning(f"Could not list output dir: {e}")
    
    if not os.path.exists(pdf_path):
        # Try to find any PDF in the output directory
        pdf_files = [f for f in os.listdir(output_dir) if f.endswith('.pdf')]
        if pdf_files:
            pdf_path = os.path.join(output_dir, pdf_files[0])
            logger.info(f"Found PDF with different name: {pdf_path}")
        else:
            raise ConversionError(
                f"LibreOffice did not produce output PDF. "
                f"Source: {source_path}, OutDir: {output_dir}, "
                f"Contents: {dir_contents if 'dir_contents' in dir() else 'unknown'}"
            )
    
    return pdf_path


def _convert_image_to_pdf(source_path: str, output_dir: str) -> str:
    """
    Convert image to PDF.
    Uses PIL/Pillow for simple image-to-PDF conversion.
    
    Args:
        source_path: Path to source image
        output_dir: Directory for output PDF
        
    Returns:
        Path to generated PDF
    """
    try:
        from PIL import Image
    except ImportError:
        # Fall back to LibreOffice if PIL not available
        logger.warning("PIL not available, using LibreOffice for image conversion")
        return _convert_with_libreoffice(source_path, output_dir)
    
    try:
        source_name = os.path.splitext(os.path.basename(source_path))[0]
        pdf_path = os.path.join(output_dir, f'{source_name}.pdf')
        
        image = Image.open(source_path)
        
        # Convert to RGB if necessary (for PNG with alpha, etc.)
        if image.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode in ('RGBA', 'LA') else None)
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')
        
        image.save(pdf_path, 'PDF', resolution=100.0)
        
        return pdf_path
        
    except Exception as e:
        raise ConversionError(f"Image to PDF conversion failed: {e}")


def _validate_pdf(pdf_path: str) -> bool:
    """
    Verify output is a valid PDF.
    Uses pdfinfo if available, otherwise checks magic bytes.
    
    Args:
        pdf_path: Path to PDF file to validate
        
    Returns:
        True if valid PDF, False otherwise
    """
    # First check: file exists and has content
    if not os.path.exists(pdf_path):
        return False
    
    if os.path.getsize(pdf_path) < 10:
        return False
    
    # Second check: PDF magic bytes
    with open(pdf_path, 'rb') as f:
        header = f.read(5)
        if header != b'%PDF-':
            return False
    
    # Third check: try pdfinfo if available
    try:
        result = subprocess.run(
            ['pdfinfo', pdf_path],
            capture_output=True,
            timeout=10
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        # pdfinfo not available, rely on magic bytes check
        return True


def _get_extension(mime_type: str) -> str:
    """Get file extension from MIME type."""
    from .services import get_file_extension_from_mime
    return get_file_extension_from_mime(mime_type)


@shared_task(name='attachments.tasks.cleanup_pdf_cache')
def cleanup_pdf_cache(max_age_days: int = 30, max_size_gb: int = 10) -> dict:
    """
    Cleanup old/unused PDF cache entries.
    Uses LRU (Least Recently Used) strategy.
    
    Args:
        max_age_days: Delete entries not accessed in this many days
        max_size_gb: Target maximum cache size in GB
        
    Returns:
        dict with cleanup statistics
    """
    from datetime import timedelta
    from django.db.models import Sum
    from .models import AttachmentPDFCache
    
    stats = {
        'deleted_by_age': 0,
        'deleted_by_size': 0,
        'bytes_freed': 0,
    }
    
    # 1. Delete entries older than max_age_days
    cutoff_date = timezone.now() - timedelta(days=max_age_days)
    old_entries = AttachmentPDFCache.objects.filter(
        last_accessed_at__lt=cutoff_date,
        status=AttachmentPDFCache.ConversionStatus.COMPLETED
    )
    
    for entry in old_entries:
        if entry.pdf_file:
            stats['bytes_freed'] += entry.pdf_file_size or 0
            entry.pdf_file.delete(save=False)
        entry.delete()
        stats['deleted_by_age'] += 1
    
    # 2. If still over size limit, delete LRU entries
    max_size_bytes = max_size_gb * 1024 * 1024 * 1024
    current_size = AttachmentPDFCache.objects.filter(
        status=AttachmentPDFCache.ConversionStatus.COMPLETED
    ).aggregate(total=Sum('pdf_file_size'))['total'] or 0
    
    if current_size > max_size_bytes:
        # Get entries ordered by last access (oldest first)
        lru_entries = AttachmentPDFCache.objects.filter(
            status=AttachmentPDFCache.ConversionStatus.COMPLETED
        ).order_by('last_accessed_at')
        
        for entry in lru_entries:
            if current_size <= max_size_bytes:
                break
            
            if entry.pdf_file:
                freed = entry.pdf_file_size or 0
                current_size -= freed
                stats['bytes_freed'] += freed
                entry.pdf_file.delete(save=False)
            entry.delete()
            stats['deleted_by_size'] += 1
    
    logger.info(
        f"PDF cache cleanup: deleted {stats['deleted_by_age']} by age, "
        f"{stats['deleted_by_size']} by size, freed {stats['bytes_freed']:,} bytes"
    )
    
    return stats
