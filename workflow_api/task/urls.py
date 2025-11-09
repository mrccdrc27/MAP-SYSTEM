from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, UserTaskListView

# Create a router and register the TaskViewSet
router = DefaultRouter()
router.register(r'', TaskViewSet, basename='task')

app_name = 'task'

urlpatterns = [
    # Dedicated endpoint for getting user's tasks
    # GET /tasks/my-tasks/list/ or /tasks/my-tasks/
    path('my-tasks/', UserTaskListView.as_view(), name='user-task-list'),
    
    # All other task endpoints (CRUD operations and custom actions)
    # GET /tasks/
    # POST /tasks/
    # GET /tasks/{id}/
    # PUT/PATCH /tasks/{id}/
    # DELETE /tasks/{id}/
    # GET /tasks/my-tasks/ (via custom action in viewset)
    # POST /tasks/{id}/update-user-status/
    path('', include(router.urls)),
]
