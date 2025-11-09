from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StepViewSet, StepTransitionsListView

# Create a router and register the StepViewSet
router = DefaultRouter()
router.register(r'', StepViewSet, basename='step')

app_name = 'step'

urlpatterns = [
    # Dedicated endpoint for getting available transitions from a step
    # GET /steps/transitions/?step_id=2
    path('transitions/', StepTransitionsListView.as_view(), name='step-transitions'),
    
    # All other step endpoints (list, retrieve)
    # GET /steps/
    # GET /steps/{id}/
    path('', include(router.urls)),
]
