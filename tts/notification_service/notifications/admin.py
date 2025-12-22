from django.contrib import admin
from .models import NotificationTemplate, NotificationLog, NotificationRequest


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ['notification_type', 'subject', 'is_active', 'created_at']
    list_filter = ['notification_type', 'is_active']
    search_fields = ['notification_type', 'subject']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('notification_type', 'subject', 'is_active')
        }),
        ('Email Content', {
            'fields': ('body_text', 'body_html')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ['notification_type', 'recipient_email', 'status', 'sent_at', 'created_at']
    list_filter = ['notification_type', 'status', 'created_at']
    search_fields = ['recipient_email', 'subject', 'notification_type', 'user_email']
    readonly_fields = ['id', 'created_at']
    
    fieldsets = (
        ('User Information', {
            'fields': ('user_id', 'user_email', 'recipient_email')
        }),
        ('Notification Details', {
            'fields': ('notification_type', 'subject')
        }),
        ('Content', {
            'fields': ('message', 'context_data')
        }),
        ('Status', {
            'fields': ('status', 'error_message', 'sent_at')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        # Prevent manual creation of notification logs
        return False


@admin.register(NotificationRequest)
class NotificationRequestAdmin(admin.ModelAdmin):
    list_display = ['notification_type', 'user_email', 'processed', 'created_at']
    list_filter = ['notification_type', 'processed', 'created_at']
    search_fields = ['user_email', 'notification_type']
    readonly_fields = ['id', 'created_at', 'processed_at']
    
    fieldsets = (
        ('Request Information', {
            'fields': ('user_id', 'user_email', 'user_name', 'notification_type')
        }),
        ('Context', {
            'fields': ('context_data', 'ip_address', 'user_agent')
        }),
        ('Processing', {
            'fields': ('processed', 'processed_at')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at'),
            'classes': ('collapse',)
        }),
    )
