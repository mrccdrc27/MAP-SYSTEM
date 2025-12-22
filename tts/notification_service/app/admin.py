from django.contrib import admin
from .models import InAppNotification

@admin.register(InAppNotification)
class InAppNotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_id', 'subject', 'is_read', 'created_at', 'read_at')
    list_filter = ('is_read', 'created_at')
    search_fields = ('user_id', 'subject', 'message')
    readonly_fields = ('id', 'created_at', 'read_at')
