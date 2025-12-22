# workflow_service/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'tickets', WorkflowTicketViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # ad
    # path('assign-task/', ManualTaskAssignmentView.as_view(), name='manual-task-assignment'),
    # # /workflow/WF-6158/55570dd0-b3e6-4ba7-a8db-6b3906b827e4/
    # path("assign-task/<uuid:ticket_id>/<str:workflow_id>/", ManualTaskAssignmentView.as_view(), name="assign-task"),

    path("assign-task/", TaskAssignmentView.as_view(), name="assign-task"),



]