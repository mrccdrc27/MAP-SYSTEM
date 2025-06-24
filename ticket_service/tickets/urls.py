from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'tickets', TicketViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('send/', TicketListCreateView.as_view(), name='ticket-list-create'),
    path('tickets/<int:id>/', TicketRetrieveUpdateDestroyView.as_view(), name='ticket-detail'),
]