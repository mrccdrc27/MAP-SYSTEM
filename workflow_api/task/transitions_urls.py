from django.urls import path
from .transitions import TaskTransitionView

app_name = 'transitions'

urlpatterns = [
    # Task transitions endpoint
    # POST /transitions/
    path('', TaskTransitionView.as_view(), name='task-transition'),
]
