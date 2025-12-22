from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkflowViewSet, StepManagementViewSet, TransitionManagementViewSet

# Create routers
workflow_router = DefaultRouter()
workflow_router.register(r'', WorkflowViewSet, basename='workflow')

# Step and Transition management routers
step_router = DefaultRouter()
step_router.register(r'steps', StepManagementViewSet, basename='step')

transition_router = DefaultRouter()
transition_router.register(r'transitions', TransitionManagementViewSet, basename='transition')

app_name = 'workflow'

urlpatterns = [
    # Workflow management endpoints via router
    path('', include(workflow_router.urls)),
    path('', include(step_router.urls)),
    path('', include(transition_router.urls)),
]
