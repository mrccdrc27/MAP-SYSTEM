# workflow_api/attachments/urls.py
"""
URL routing for attachment viewing and conversion endpoints.
"""

from django.urls import path

from .views import (
    AttachmentViewAPI,
    AttachmentDownloadAPI,
    ConversionStatusAPI,
    TicketAttachmentsListAPI,
)

app_name = 'attachments'

urlpatterns = [
    # List all attachments for a ticket
    path(
        'tickets/<str:ticket_number>/attachments',
        TicketAttachmentsListAPI.as_view(),
        name='ticket_attachments_list'
    ),
    
    # View attachment as PDF (conversion if needed)
    path(
        'tickets/<str:ticket_number>/attachments/<int:attachment_id>/view',
        AttachmentViewAPI.as_view(),
        name='attachment_view'
    ),
    
    # Download original attachment file
    path(
        'tickets/<str:ticket_number>/attachments/<int:attachment_id>/download',
        AttachmentDownloadAPI.as_view(),
        name='attachment_download'
    ),
    
    # Get conversion status (for polling)
    path(
        'attachments/<int:attachment_id>/conversion-status',
        ConversionStatusAPI.as_view(),
        name='conversion_status'
    ),
]
