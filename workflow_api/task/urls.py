from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, UserTaskListView

# Create a router and register the TaskViewSet
router = DefaultRouter()
router.register(r'', TaskViewSet, basename='task')

app_name = 'task'

urlpatterns = [
    # Dedicated endpoint for getting user's tasks
    # GET /tasks/my-tasks/
    path('my-tasks/', UserTaskListView.as_view(), name='user-task-list'),
    
    # Standard CRUD:
    # GET    /tasks/                           - List all tasks
    # POST   /tasks/                           - Create new task
    # GET    /tasks/{id}/                      - Get task details
    # PUT    /tasks/{id}/                      - Update task (full)
    # PATCH  /tasks/{id}/                      - Update task (partial)
    # DELETE /tasks/{id}/                      - Delete task
    #
    # Custom actions:
    # GET    /tasks/my-tasks/                  - Get user's assigned tasks
    # POST   /tasks/{id}/update-user-status/   - Update user's task status
    path('', include(router.urls)),
]
