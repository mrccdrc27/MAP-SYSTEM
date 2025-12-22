# File: CapstoneBP/auth_service/core/urls.py
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from users.views import auth_health_check_view

urlpatterns = [
    path('admin/', admin.site.urls), # Optional: Django admin for the auth service's DB
    path('api/auth/', include('users.urls')), # Include app's URLs

    # DRF Spectacular Schema (Swagger/Redoc) for the Auth Service

    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    path('health/', auth_health_check_view, name='auth_health_check'), # Health check for auth_service


]