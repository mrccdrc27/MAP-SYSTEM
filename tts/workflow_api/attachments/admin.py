# workflow_api/attachments/admin.py
"""
Django admin configuration for AttachmentPDFCache model.
"""

from django.contrib import admin
from django.utils.html import format_html

from .models import AttachmentPDFCache


@admin.register(AttachmentPDFCache)
class AttachmentPDFCacheAdmin(admin.ModelAdmin):
    """
    Admin interface for viewing and managing PDF cache entries.
    """
    
    list_display = [
        'helpdesk_attachment_id',
        'ticket_number',
        'original_file_name',
        'status_badge',
        'original_file_size_display',
        'pdf_file_size_display',
        'access_count',
        'last_accessed_at',
        'created_at',
    ]
    
    list_filter = [
        'status',
        'created_at',
        'last_accessed_at',
    ]
    
    search_fields = [
        'ticket_number',
        'original_file_name',
        'helpdesk_attachment_id',
    ]
    
    readonly_fields = [
        'helpdesk_attachment_id',
        'ticket_number',
        'original_file_name',
        'original_file_type',
        'original_file_size',
        'original_content_hash',
        'pdf_file_size',
        'created_at',
        'updated_at',
        'conversion_started_at',
        'conversion_completed_at',
        'last_accessed_at',
        'access_count',
        'conversion_duration_display',
    ]
    
    ordering = ['-created_at']
    
    fieldsets = (
        ('Source File', {
            'fields': (
                'helpdesk_attachment_id',
                'ticket_number',
                'original_file_name',
                'original_file_type',
                'original_file_size',
                'original_content_hash',
            )
        }),
        ('Conversion Status', {
            'fields': (
                'status',
                'error_message',
                'retry_count',
                'max_retries',
            )
        }),
        ('Cached PDF', {
            'fields': (
                'pdf_file',
                'pdf_file_size',
            )
        }),
        ('Timestamps', {
            'fields': (
                'created_at',
                'updated_at',
                'conversion_started_at',
                'conversion_completed_at',
                'conversion_duration_display',
            )
        }),
        ('Access Statistics', {
            'fields': (
                'last_accessed_at',
                'access_count',
            )
        }),
    )
    
    def status_badge(self, obj):
        """Display status with colored badge."""
        colors = {
            'pending': '#FFA500',      # Orange
            'processing': '#1E90FF',   # Blue
            'completed': '#32CD32',    # Green
            'failed': '#DC143C',       # Red
            'not_supported': '#808080', # Gray
            'passthrough': '#9370DB',  # Purple
        }
        color = colors.get(obj.status, '#808080')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'
    
    def original_file_size_display(self, obj):
        """Display original file size in human-readable format."""
        return self._format_size(obj.original_file_size)
    original_file_size_display.short_description = 'Original Size'
    original_file_size_display.admin_order_field = 'original_file_size'
    
    def pdf_file_size_display(self, obj):
        """Display PDF file size in human-readable format."""
        if obj.pdf_file_size:
            return self._format_size(obj.pdf_file_size)
        return '-'
    pdf_file_size_display.short_description = 'PDF Size'
    pdf_file_size_display.admin_order_field = 'pdf_file_size'
    
    def conversion_duration_display(self, obj):
        """Display conversion duration."""
        duration = obj.conversion_duration
        if duration:
            return f"{duration:.1f} seconds"
        return '-'
    conversion_duration_display.short_description = 'Conversion Duration'
    
    def _format_size(self, size_bytes):
        """Format file size for display."""
        if not size_bytes:
            return '-'
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.1f} KB"
        elif size_bytes < 1024 * 1024 * 1024:
            return f"{size_bytes / (1024 * 1024):.1f} MB"
        else:
            return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"
    
    actions = ['invalidate_cache', 'retry_failed']
    
    @admin.action(description='Invalidate selected cache entries')
    def invalidate_cache(self, request, queryset):
        """Delete selected cache entries and their PDF files."""
        count = 0
        for cache in queryset:
            cache.invalidate()
            count += 1
        self.message_user(request, f"Invalidated {count} cache entries.")
    
    @admin.action(description='Retry failed conversions')
    def retry_failed(self, request, queryset):
        """Retry failed conversions that haven't exceeded max retries."""
        from .tasks import convert_attachment_to_pdf
        
        count = 0
        for cache in queryset.filter(status='failed'):
            if cache.can_retry():
                cache.status = 'pending'
                cache.save(update_fields=['status'])
                convert_attachment_to_pdf.delay(
                    cache_id=cache.id,
                    attachment_id=cache.helpdesk_attachment_id,
                    file_name=cache.original_file_name,
                    file_type=cache.original_file_type
                )
                count += 1
        
        self.message_user(request, f"Queued {count} conversions for retry.")
