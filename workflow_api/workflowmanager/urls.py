from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import *

router = DefaultRouter()
# router.register(r'workflows', WorkflowViewSet, basename='workflow')
# router.register(r'steps', StepViewSet, basename='step')
# router.register(r'transitions', StepTransitionViewSet, basename='transition')
# router.register(r'actions', ActionViewSet, basename='action')

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/workflows/save-graph/', SaveGraphView.as_view(), name='save-graph'),
    path("api/graph/<uuid:workflow_id>/", WorkflowGraphView.as_view(), name="workflow-graph"),
]
