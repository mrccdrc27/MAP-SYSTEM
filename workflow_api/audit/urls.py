"""
URL configuration for audit app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuditEventViewSet, AuditLogViewSet

router = DefaultRouter()
router.register(r'events', AuditEventViewSet, basename='audit-event')
router.register(r'logs', AuditLogViewSet, basename='audit-log')

urlpatterns = [
    path('', include(router.urls)),
]
