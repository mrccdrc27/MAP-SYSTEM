# urls.py

from django.urls import path
from .views import *
urlpatterns = [
    path('api/projects/', ProjectListView.as_view(), name='project-list'),
    path('api/projects/<int:pk>/', ProjectDetailView.as_view(), name='project-detail'),
    path('api/projects/approve/<str:ticket_id>/', ProjectApproveView.as_view(), name='project-approve'),
    path("api/projects/update-project-status/", UpdateProjectStatusView.as_view(), name="update-project-status"),
]
