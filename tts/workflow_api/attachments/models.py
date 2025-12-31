# workflow_api/attachments/models.py
"""
Attachment PDF Cache Model for storing converted PDF views.
This is a CACHE of derived content - original files remain in helpdesk.
"""

from django.db import models
from django.utils import timezone


class AttachmentPDFCache(models.Model):
    """
    Stores PDF conversions of ticket attachments for browser viewing.
    
    Design principles:
    - This is a CACHE, not source of truth
    - Original files always remain in helpdesk service
    - PDFs are derived views, invalidated if source changes
    - Hash-based cache invalidation for reliability
    """
    
    class ConversionStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        NOT_SUPPORTED = 'not_supported', 'File type not supported'
        PASSTHROUGH = 'passthrough', 'Original is already PDF'
    
    # Reference to helpdesk attachment (we don't store the file itself)
    helpdesk_attachment_id = models.IntegerField(
        db_index=True, 
        unique=True,
        help_text="ID of the TicketAttachment in helpdesk service"
    )
    ticket_number = models.CharField(max_length=64, db_index=True)
    
    # Original file metadata (cached for display purposes)
    original_file_name = models.CharField(max_length=255)
    original_file_type = models.CharField(max_length=100, help_text="MIME type")
    original_file_size = models.IntegerField(help_text="Size in bytes")
    original_content_hash = models.CharField(
        max_length=80,  # "sha256:" + 64 hex chars
        db_index=True,
        help_text="SHA-256 hash of original file for invalidation detection"
    )
    
    # Conversion state
    status = models.CharField(
        max_length=20, 
        choices=ConversionStatus.choices, 
        default=ConversionStatus.PENDING, 
        db_index=True
    )
    error_message = models.TextField(blank=True, null=True)
    retry_count = models.IntegerField(default=0)
    max_retries = models.IntegerField(default=3)
    
    # Converted PDF file (stored locally in workflow_api)
    pdf_file = models.FileField(
        upload_to='pdf_cache/', 
        blank=True, 
        null=True,
        help_text="Cached PDF conversion of the original file"
    )
    pdf_file_size = models.IntegerField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    conversion_started_at = models.DateTimeField(blank=True, null=True)
    conversion_completed_at = models.DateTimeField(blank=True, null=True)
    
    # Cache control / LRU tracking
    last_accessed_at = models.DateTimeField(default=timezone.now)
    access_count = models.IntegerField(default=0)
    
    class Meta:
        indexes = [
            models.Index(fields=['helpdesk_attachment_id']),
            models.Index(fields=['ticket_number']),
            models.Index(fields=['status']),
            models.Index(fields=['original_content_hash']),
            models.Index(fields=['last_accessed_at']),  # For LRU cleanup
        ]
        verbose_name = 'Attachment PDF Cache'
        verbose_name_plural = 'Attachment PDF Caches'
    
    def __str__(self):
        return f"PDFCache(att={self.helpdesk_attachment_id}) - {self.status}"
    
    def is_valid(self, current_hash: str) -> bool:
        """
        Check if cached PDF is still valid (source hasn't changed).
        
        Args:
            current_hash: The current content hash from helpdesk
            
        Returns:
            True if cache is valid and usable, False otherwise
        """
        if self.status != self.ConversionStatus.COMPLETED:
            return False
        return self.original_content_hash == current_hash
    
    def can_retry(self) -> bool:
        """Check if failed conversion can be retried."""
        return (
            self.status == self.ConversionStatus.FAILED and 
            self.retry_count < self.max_retries
        )
    
    def mark_accessed(self):
        """Update access statistics for LRU tracking."""
        self.last_accessed_at = timezone.now()
        self.access_count += 1
        self.save(update_fields=['last_accessed_at', 'access_count', 'updated_at'])
    
    def invalidate(self):
        """
        Invalidate this cache entry.
        Called when source file hash changes.
        """
        if self.pdf_file:
            self.pdf_file.delete(save=False)
        self.delete()
    
    @classmethod
    def get_or_none(cls, attachment_id: int):
        """Get cache entry or None if not found."""
        try:
            return cls.objects.get(helpdesk_attachment_id=attachment_id)
        except cls.DoesNotExist:
            return None
    
    @property
    def is_ready(self) -> bool:
        """Check if PDF is ready to serve."""
        return self.status in [
            self.ConversionStatus.COMPLETED,
            self.ConversionStatus.PASSTHROUGH
        ]
    
    @property
    def is_processing(self) -> bool:
        """Check if conversion is currently in progress."""
        return self.status in [
            self.ConversionStatus.PENDING,
            self.ConversionStatus.PROCESSING
        ]
    
    @property
    def conversion_duration(self):
        """Get conversion duration in seconds, or None if not complete."""
        if self.conversion_started_at and self.conversion_completed_at:
            delta = self.conversion_completed_at - self.conversion_started_at
            return delta.total_seconds()
        return None
