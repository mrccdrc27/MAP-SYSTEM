from django.contrib import admin
from .models import AuditEvent, AuditLog
import json


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = [
        'timestamp', 'action', 'username', 'target_type', 
        'target_id', 'email', 'ip_address'
    ]
    list_filter = [
        'action', 'timestamp', 'target_type', 
        'content_type'
    ]
    search_fields = [
        'username', 'email', 'user_id', 'target_type', 
        'target_id', 'description'
    ]
    readonly_fields = [
        'timestamp', 'user_id', 'username', 'email',
        'action', 'target_type', 'target_id', 'changes',
        'description', 'ip_address', 'user_agent',
        'content_type', 'object_id', 'changes_display'
    ]
    
    fieldsets = (
        ('User Information', {
            'fields': ('user_id', 'username', 'email')
        }),
        ('Action Details', {
            'fields': ('action', 'description', 'timestamp')
        }),
        ('Target Object', {
            'fields': (
                'target_type', 'target_id',
                'content_type', 'object_id'
            ),
            'classes': ('collapse',)
        }),
        ('Changes', {
            'fields': ('changes_display',)
        }),
        ('Request Metadata', {
            'fields': ('ip_address', 'user_agent'),
            'classes': ('collapse',)
        }),
    )
    
    ordering = ['-timestamp']
    date_hierarchy = 'timestamp'
    
    def changes_display(self, obj):
        """Display changes in formatted JSON"""
        if not obj.changes:
            return "No changes recorded"
        
        try:
            formatted = json.dumps(obj.changes, indent=2)
            return f"<pre>{formatted}</pre>"
        except:
            return str(obj.changes)
    
    changes_display.short_description = "Changes"
    changes_display.allow_tags = True
    
    def has_add_permission(self, request):
        # Audit events should only be created programmatically
        return False
    
    def has_delete_permission(self, request, obj=None):
        # Prevent deletion of audit events
        return False
    
    def has_change_permission(self, request, obj=None):
        # Audit events are read-only
        return False


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = [
        'timestamp', 'action', 'username', 'entity_type', 
        'entity_id', 'user_id'
    ]
    list_filter = [
        'action', 'timestamp', 'entity_type'
    ]
    search_fields = [
        'username', 'user_id', 'action', 
        'entity_type', 'entity_id'
    ]
    readonly_fields = [
        'timestamp', 'user_id', 'username', 'action',
        'entity_type', 'entity_id', 'details'
    ]
    
    fieldsets = (
        ('User Information', {
            'fields': ('user_id', 'username')
        }),
        ('Action Details', {
            'fields': ('action', 'timestamp')
        }),
        ('Entity Information', {
            'fields': ('entity_type', 'entity_id')
        }),
        ('Details', {
            'fields': ('details',)
        }),
    )
    
    ordering = ['-timestamp']
    date_hierarchy = 'timestamp'
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
