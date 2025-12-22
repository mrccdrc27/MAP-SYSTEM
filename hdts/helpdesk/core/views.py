"""
Views package - consolidated imports from modular files.

This module re-exports all views and utilities from the modular views
package structure for backward compatibility with existing URL configurations.

The views have been refactored into the following modules:
- views.auth_views: Authentication and employee management views
- views.employee_views: Employee profile and listing views
- views.ticket_views: Ticket management and operations
- views.knowledge_views: Knowledge article management
- views.media_views: Media file serving
- views.helpers: Helper functions and utilities
- views.permissions: Custom permission classes
- views.email_templates: Email template functions
"""

# Auth views
from .views.auth_views import (
    login_view,
    CreateEmployeeView,
    CreateAdminEmployeeView,
    EmployeeTokenObtainPairView,
    AdminTokenObtainPairView,
    deny_employee,
    create_employee_admin_view,
    approve_employee,
    ApproveEmployeeView,
)

# Employee views
from .views.employee_views import (
    employee_profile_view,
    list_employees,
    get_employee,
    get_user_activity_logs,
    change_password,
    verify_password,
    upload_profile_image,
)

# Ticket views
from .views.ticket_views import (
    TicketViewSet,
    get_ticket_detail,
    get_ticket_by_number,
    add_ticket_comment,
    approve_ticket,
    reject_ticket,
    claim_ticket,
    update_ticket_status,
    withdraw_ticket,
    submit_csat_rating,
    get_csat_feedback,
    get_new_tickets,
    get_open_tickets,
    get_my_tickets,
    download_attachment,
    finalize_ticket,
    custom_api_root,
)

# Knowledge article views
from .views.knowledge_views import (
    KnowledgeArticleViewSet,
)

# Media views
from .views.media_views import (
    serve_protected_media,
    test_jwt_view,
)

# Helpers and utilities
from .views.helpers import (
    get_external_employee_data,
    get_user_display_name,
    _actor_display_name,
    generate_company_id,
)

# Permissions
from .views.permissions import (
    IsSystemAdmin,
    IsAdminOrSystemAdmin,
    IsAdminOrCoordinator,
    IsEmployee,
    IsEmployeeOrAdmin,
)

# Email templates
from .views.email_templates import (
    send_account_approved_email,
    send_account_rejected_email,
    send_account_pending_email,
)

__all__ = [
    # Auth views
    'login_view',
    'CreateEmployeeView',
    'CreateAdminEmployeeView',
    'EmployeeTokenObtainPairView',
    'AdminTokenObtainPairView',
    'deny_employee',
    'create_employee_admin_view',
    'approve_employee',
    'ApproveEmployeeView',
    # Employee views
    'employee_profile_view',
    'list_employees',
    'get_employee',
    'get_user_activity_logs',
    'change_password',
    'verify_password',
    'upload_profile_image',
    # Ticket views
    'TicketViewSet',
    'get_ticket_detail',
    'get_ticket_by_number',
    'add_ticket_comment',
    'approve_ticket',
    'reject_ticket',
    'claim_ticket',
    'update_ticket_status',
    'withdraw_ticket',
    'submit_csat_rating',
    'get_csat_feedback',
    'get_new_tickets',
    'get_open_tickets',
    'get_my_tickets',
    'download_attachment',
    'finalize_ticket',
    'custom_api_root',
    # Knowledge article views
    'KnowledgeArticleViewSet',
    # Media views
    'serve_protected_media',
    'test_jwt_view',
    # Helpers and utilities
    'get_external_employee_data',
    'get_user_display_name',
    '_actor_display_name',
    'generate_company_id',
    # Permissions
    'IsSystemAdmin',
    'IsAdminOrSystemAdmin',
    'IsAdminOrCoordinator',
    'IsEmployee',
    'IsEmployeeOrAdmin',
    # Email templates
    'send_account_approved_email',
    'send_account_rejected_email',
    'send_account_pending_email',
]
