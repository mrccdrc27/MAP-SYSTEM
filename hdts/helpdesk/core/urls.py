from django.urls import path, include
from .views import (
    CreateEmployeeView,
    EmployeeTokenObtainPairView,
    AdminTokenObtainPairView,
    TicketViewSet,
    KnowledgeArticleViewSet,
    CreateAdminEmployeeView,
    employee_profile_view,
    approve_ticket,
    reject_ticket,
    get_ticket_detail,
    add_ticket_comment,
    add_auto_response,
    set_typing_status,
    get_typing_status,
    get_ticket_by_number,
    get_user_activity_logs,
    get_new_tickets,
    claim_ticket,
    update_ticket_status,
    withdraw_ticket,
    submit_csat_rating,
    get_csat_feedback,
    get_open_tickets,
    get_my_tickets,
    create_employee_admin_view,
    custom_api_root,  # <-- add this import
    change_password,
    upload_profile_image,
    verify_password,
    list_employees,
    get_employee,
    approve_employee,
    deny_employee,
    finalize_ticket,  # <-- add this import
    serve_protected_media,
    serve_ticket_attachment,
)
from .views.notification_views import (
    list_notifications,
    get_unread_count,
    mark_as_read,
    mark_all_as_read,
    delete_notification,
    clear_all_notifications,
)
from .views.location_views import (
    list_locations,
    list_all_locations,
    create_location,
    get_location,
    update_location,
    delete_location,
    toggle_location_status,
)
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from .serializers import TicketSerializer
from .tasks import push_ticket_to_workflow

router = DefaultRouter()
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'articles', KnowledgeArticleViewSet, basename='article')

urlpatterns = [
    path('', custom_api_root, name='api-root'),  # <-- put this FIRST
    # Custom endpoints (must come before router)
    path('create_employee/', CreateEmployeeView.as_view(), name='create_employee'),
    path("admin/create-employee/", CreateAdminEmployeeView.as_view(), name="admin-create-employee"),
    path('token/employee/', EmployeeTokenObtainPairView.as_view(), name='token_employee'),
    path("token/admin/", AdminTokenObtainPairView.as_view(), name="admin_token_obtain_pair"),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('employee/profile/', employee_profile_view, name='employee_profile'),
    path('employee/change-password/', change_password, name='change_password'),
    path('employee/upload-image/', upload_profile_image, name='upload_profile_image'),
    path('employee/verify-password/', verify_password, name='verify_password'),
    path('employees/', list_employees, name='list_employees'),
    path('employees/<int:pk>/approve/', approve_employee, name='approve_employee'),
    path('employees/<int:pk>/deny/', deny_employee, name='deny_employee'),
    # Single employee retrieve (GET)
    path('employees/<int:pk>/', get_employee, name='get_employee'),

    path('tickets/<int:ticket_id>/', get_ticket_detail, name='get_ticket_detail'),
    path('tickets/number/<str:ticket_number>/', get_ticket_by_number, name='get_ticket_by_number'),
    path('tickets/<int:ticket_id>/comments/', add_ticket_comment, name='add_ticket_comment'),
    path('tickets/<int:ticket_id>/auto-response/', add_auto_response, name='add_auto_response'),
    path('tickets/<str:ticket_number>/typing/', set_typing_status, name='set_typing_status'),
    path('tickets/<str:ticket_number>/typing/status/', get_typing_status, name='get_typing_status'),
    path('tickets/<int:ticket_id>/approve/', approve_ticket, name='approve_ticket'),
    path('tickets/<int:ticket_id>/reject/', reject_ticket, name='reject_ticket'),
    path('tickets/<int:ticket_id>/claim/', claim_ticket, name='claim_ticket'),
    path('tickets/<int:ticket_id>/update-status/', update_ticket_status, name='update_ticket_status'),
    path('tickets/<int:ticket_id>/withdraw/', withdraw_ticket, name='withdraw_ticket'),
    path('tickets/<int:ticket_id>/csat/', submit_csat_rating, name='submit_csat_rating'),
    path('csat/feedback/', get_csat_feedback, name='get_csat_feedback'),
    path('tickets/new/', get_new_tickets, name='get_new_tickets'),
    path('tickets/open/', get_open_tickets, name='get_open_tickets'),
    path('tickets/my-tickets/', get_my_tickets, name='get_my_tickets'),
    path('tickets/<int:ticket_id>/finalize/', finalize_ticket, name='finalize_ticket'),  # <-- add this line
    # Activity logs for user profile
    path('activity-logs/user/<int:user_id>/', get_user_activity_logs, name='get_user_activity_logs'),

    # Employee Notifications
    path('notifications/', list_notifications, name='list_notifications'),
    path('notifications/unread-count/', get_unread_count, name='get_unread_count'),
    path('notifications/<int:notification_id>/read/', mark_as_read, name='mark_notification_read'),
    path('notifications/read-all/', mark_all_as_read, name='mark_all_notifications_read'),
    path('notifications/<int:notification_id>/', delete_notification, name='delete_notification'),
    path('notifications/clear/', clear_all_notifications, name='clear_all_notifications'),

    # Location management (for Asset Check-Out form)
    path('locations/', list_locations, name='list_locations'),  # Public: active locations for dropdown
    path('locations/all/', list_all_locations, name='list_all_locations'),  # Admin: all locations
    path('locations/create/', create_location, name='create_location'),  # Admin: create
    path('locations/<int:location_id>/', get_location, name='get_location'),  # Get single
    path('locations/<int:location_id>/update/', update_location, name='update_location'),  # Admin: update
    path('locations/<int:location_id>/delete/', delete_location, name='delete_location'),  # Admin: delete
    path('locations/<int:location_id>/toggle/', toggle_location_status, name='toggle_location_status'),  # Admin: toggle active

    # Protected media files - require authentication
    path('media/<path:file_path>', serve_protected_media, name='serve_protected_media'),
    
    # Public ticket attachments - for TTS frontend access
    path('attachments/<path:file_path>', serve_ticket_attachment, name='serve_ticket_attachment'),

    # DRF router (should be last, and at the root for browsable API)
    path('', include(router.urls)),  # keep this LAST
]