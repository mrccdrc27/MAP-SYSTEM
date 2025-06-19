from django.urls import path
from .views import *

urlpatterns = [
    path('', StepListCreateView.as_view(), name='step-list-create'),
    path('<uuid:step_id>/', StepDetailView.as_view(), name='step-detail'),

    # path('step-actions/', StepActionListCreateView.as_view(), name='step-action-list-create'),
    # path('step-actions/<int:id>/', StepActionDetailView.as_view(), name='step-action-detail'),

    path('step-transitions/', StepTransitionListCreateView.as_view(), name='step-transition-list-create'),
    path('step-transitions/<uuid:transition_id>', StepTransitionDetailView.as_view(), name='step-transition-detail'),
]
