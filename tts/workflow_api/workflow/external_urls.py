"""
External Service URLs for End Logic (AMS/BMS)

Public endpoints for external systems to fetch pending tickets and resolve them.
"""

from django.urls import path
from .external_views import (
    ams_pending_tickets,
    bms_pending_tickets,
    external_resolve_ticket,
    external_ticket_status,
)

app_name = 'external'

urlpatterns = [
    # AMS (Asset Management System) endpoints
    path('ams/tickets/', ams_pending_tickets, name='ams-pending-tickets'),
    
    # BMS (Budget Management System) endpoints
    path('bms/tickets/', bms_pending_tickets, name='bms-pending-tickets'),
    
    # Generic resolve endpoint - works for both AMS and BMS
    path('resolve/', external_resolve_ticket, name='external-resolve'),
    
    # Get ticket status
    path('status/<str:ticket_number>/', external_ticket_status, name='external-ticket-status'),
]
