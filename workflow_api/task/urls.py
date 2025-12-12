from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, UserTaskListView, AllTasksListView, OwnedTicketsListView

# Create a router and register the TaskViewSet
router = DefaultRouter()
router.register(r'', TaskViewSet, basename='task')

app_name = 'task'

urlpatterns = [
    # Dedicated endpoint for getting user's tasks (before router to avoid conflicts)
    # GET /tasks/my-tasks/
    path('my-tasks/', UserTaskListView.as_view(), name='user-task-list'),
    
    # Dedicated endpoint for getting all tasks (before router to avoid conflicts)
    # GET /tasks/all-tasks/
    path('all-tasks/', AllTasksListView.as_view(), name='all-task-list'),
    
    # Dedicated endpoint for getting tickets owned by the current user (Ticket Coordinator)
    # GET /tasks/owned-tickets/
    # Permission: HDTS Ticket Coordinator role required
    path('owned-tickets/', OwnedTicketsListView.as_view(), name='owned-tickets-list'),
    
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
