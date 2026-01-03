from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TaskViewSet, UserTaskListView, AllTasksListView, OwnedTicketsListView, OwnedTicketDetailView,
    AllAssignedTicketsListView,
    FailedNotificationViewSet, UnassignedTicketsListView,
    TicketOwnerEscalateView, TicketOwnerTransferView, AvailableCoordinatorsView
)

# Create a router and register the TaskViewSet
router = DefaultRouter()
router.register(r'', TaskViewSet, basename='task')
router.register(r'failed-notifications', FailedNotificationViewSet, basename='failed-notification')

app_name = 'task'

urlpatterns = [
    # Dedicated endpoint for getting user's tasks (before router to avoid conflicts)
    # GET /tasks/my-tasks/
    path('my-tasks/', UserTaskListView.as_view(), name='user-task-list'),
    
    # Dedicated endpoint for getting all tasks (before router to avoid conflicts)
    # GET /tasks/all-tasks/
    path('all-tasks/', AllTasksListView.as_view(), name='all-task-list'),
    
    # Dedicated endpoint for getting unassigned tickets (tickets not assigned to any workflow)
    # GET /tasks/unassigned-tickets/
    path('unassigned-tickets/', UnassignedTicketsListView.as_view(), name='unassigned-tickets-list'),
    
    # Dedicated endpoint for getting tickets owned by the current user (Ticket Coordinator)
    # GET /tasks/owned-tickets/
    # Permission: HDTS Ticket Coordinator role required
    path('owned-tickets/', OwnedTicketsListView.as_view(), name='owned-tickets-list'),
    
    # Dedicated endpoint for admin to get ALL assigned tickets (for management)
    # GET /tasks/all-assigned-tickets/
    # Permission: HDTS Admin or System Admin role required
    path('all-assigned-tickets/', AllAssignedTicketsListView.as_view(), name='all-assigned-tickets-list'),
    
    # Dedicated endpoint for getting a specific owned ticket by ticket number
    # GET /tasks/owned-tickets/<ticket_number>/
    # Returns 403 if user is not the owner (unless admin)
    path('owned-tickets/<str:ticket_number>/', OwnedTicketDetailView.as_view(), name='owned-ticket-detail'),
    
    # Ticket Owner Management endpoints
    # POST /tasks/ticket-owner/escalate/ - Ticket Coordinator escalates ownership
    path('ticket-owner/escalate/', TicketOwnerEscalateView.as_view(), name='ticket-owner-escalate'),
    
    # POST /tasks/ticket-owner/transfer/ - Admin transfers ownership to another coordinator
    path('ticket-owner/transfer/', TicketOwnerTransferView.as_view(), name='ticket-owner-transfer'),
    
    # GET /tasks/ticket-owner/available-coordinators/ - Get list of available coordinators
    path('ticket-owner/available-coordinators/', AvailableCoordinatorsView.as_view(), name='available-coordinators'),
    
    # Standard CRUD:
    # GET    /tasks/                           - List all tasks
    # POST   /tasks/                           - Create new task
    # GET    /tasks/{id}/                      - Get task details
    # PUT    /tasks/{id}/                      - Update task (full)
    # PATCH  /tasks/{id}/                      - Update task (partial)
    # DELETE /tasks/{id}/                      - Delete task
    #
    # Custom actions:
    # POST   /tasks/escalate/                  - Escalate a task item
    # POST   /tasks/transfer/                  - Transfer a task item
    # POST   /tasks/{id}/visualization/        - Get task visualization
    # GET    /tasks/{id}/action-logs/          - Get action logs
    # POST   /tasks/{id}/update-user-status/   - Update user's task status
    path('', include(router.urls)),
]
