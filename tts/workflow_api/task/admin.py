from django.contrib import admin
from .models import Task, TaskItem, TaskItemHistory, FailedNotification

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['task_id', 'ticket_id', 'workflow_id', 'current_step', 'status', 'created_at']
    list_filter = ['status', 'workflow_id', 'created_at']
    search_fields = ['task_id', 'ticket_id__subject']
    readonly_fields = ['task_id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('task_id', 'ticket_id', 'workflow_id', 'current_step', 'status')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'fetched_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(TaskItem)
class TaskItemAdmin(admin.ModelAdmin):
    list_display = ['task_item_id', 'task', 'get_user_id', 'get_user_full_name', 'get_role', 'get_latest_status', 'assigned_on']
    list_filter = ['role_user__role_id', 'assigned_on']
    search_fields = ['task__task_id', 'role_user__user_id', 'role_user__user_full_name']
    readonly_fields = ['task_item_id', 'assigned_on']
    
    fieldsets = (
        ('Assignment Info', {
            'fields': ('task_item_id', 'task', 'role_user')
        }),
        ('Assignment Details', {
            'fields': ('origin', 'assigned_on', 'notes')
        }),
        ('Transfer Info', {
            'fields': ('transferred_to', 'transferred_by'),
            'classes': ('collapse',)
        }),
        ('Resolution', {
            'fields': ('target_resolution', 'resolution_time', 'acted_on', 'assigned_on_step'),
            'classes': ('collapse',)
        }),
    )
    
    def get_user_id(self, obj):
        return obj.role_user.user_id if obj.role_user else None
    get_user_id.short_description = 'User ID'
    
    def get_user_full_name(self, obj):
        return obj.role_user.user_full_name if obj.role_user else None
    get_user_full_name.short_description = 'User Full Name'
    
    def get_role(self, obj):
        return obj.role_user.role_id.name if obj.role_user else None
    get_role.short_description = 'Role'
    
    def get_latest_status(self, obj):
        latest_history = obj.taskitemhistory_set.order_by('-created_at').first()
        return latest_history.status if latest_history else 'N/A'
    get_latest_status.short_description = 'Status'


@admin.register(TaskItemHistory)
class TaskItemHistoryAdmin(admin.ModelAdmin):
    list_display = ['task_item_history_id', 'task_item', 'get_task_id', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['task_item__task__task_id', 'task_item__role_user__user_id']
    readonly_fields = ['task_item_history_id', 'created_at']
    
    fieldsets = (
        ('History Info', {
            'fields': ('task_item_history_id', 'task_item')
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def get_task_id(self, obj):
        return obj.task_item.task.task_id if obj.task_item and obj.task_item.task else None
    get_task_id.short_description = 'Task ID'

@admin.register(FailedNotification)
class FailedNotificationAdmin(admin.ModelAdmin):
    list_display = ['failed_notification_id', 'user_id', 'task_item_id', 'role_name', 'status', 'retry_count', 'created_at']
    list_filter = ['status', 'role_name', 'created_at']
    search_fields = ['user_id', 'task_item_id', 'task_title', 'role_name']
    readonly_fields = ['failed_notification_id', 'created_at', 'last_retry_at', 'succeeded_at']
    
    fieldsets = (
        ('Notification Details', {
            'fields': ('failed_notification_id', 'user_id', 'task_item_id', 'task_title', 'role_name')
        }),
        ('Status & Retry Info', {
            'fields': ('status', 'retry_count', 'max_retries', 'error_message')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'last_retry_at', 'succeeded_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['retry_selected_notifications', 'mark_as_failed', 'mark_as_pending']
    
    def retry_selected_notifications(self, request, queryset):
        """Admin action to retry selected notifications"""
        from task.tasks import send_assignment_notification as notify_task
        from django.utils import timezone
        
        success_count = 0
        failed_count = 0
        
        for notification in queryset.filter(status__in=['pending', 'failed']):
            try:
                notification.status = 'retrying'
                notification.retry_count += 1
                notification.last_retry_at = timezone.now()
                notification.save()
                
                notify_task.delay(
                    user_id=notification.user_id,
                    task_item_id=notification.task_item_id,
                    task_title=notification.task_title,
                    role_name=notification.role_name
                )
                
                notification.status = 'success'
                notification.succeeded_at = timezone.now()
                notification.save()
                success_count += 1
                
            except Exception as e:
                notification.error_message = str(e)
                if notification.retry_count >= notification.max_retries:
                    notification.status = 'failed'
                else:
                    notification.status = 'pending'
                notification.save()
                failed_count += 1
        
        self.message_user(request, f"Retried {success_count + failed_count} notifications: {success_count} succeeded, {failed_count} failed")
    retry_selected_notifications.short_description = "Retry selected notifications"
    
    def mark_as_failed(self, request, queryset):
        """Mark selected notifications as failed"""
        updated = queryset.update(status='failed')
        self.message_user(request, f"{updated} notifications marked as failed")
    mark_as_failed.short_description = "Mark as failed"
    
    def mark_as_pending(self, request, queryset):
        """Mark selected notifications as pending for retry"""
        updated = queryset.update(status='pending')
        self.message_user(request, f"{updated} notifications marked as pending")
    mark_as_pending.short_description = "Mark as pending"