from django.urls import path
from .views import *

urlpatterns = [
    path('', RoleListCreateView.as_view(), name='position-list-create'),
    path('<int:id>', RoleDetailView.as_view(), name='position-detail-view'),
]
