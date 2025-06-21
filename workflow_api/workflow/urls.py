from django.urls import path
from .views import *

urlpatterns = [
    path('', WorkflowListCreateView.as_view(), name='workflow-list-create'),
    path('<int:id>/', WorkflowDetailView.as_view(), name='workflow-detail'),

    path('categories/', CategoryListCreateView.as_view(), name='step-list-create'),
    path('all/', WorkflowAggregatedView.as_view(), name='step-list-create'),
    path('all/<uuid:workflow_id>/', WorkflowAggregatedDetailView.as_view(), name='step-list-detail'),
]
