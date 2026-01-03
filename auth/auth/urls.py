from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.reverse import reverse
from rest_framework import serializers
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from drf_spectacular.utils import extend_schema
from users.views import (
    CustomTokenObtainPairView,
    UILogoutView,
)
from hdts.employee_api_views import MeView

# Custom error handlers
from .error_handlers import custom_404_view, custom_500_view

handler404 = custom_404_view
handler500 = custom_500_view


class APIRootSerializer(serializers.Serializer):
    api_v1 = serializers.URLField()
    schema = serializers.URLField()
    docs = serializers.URLField()
    token_obtain = serializers.URLField()
    logout = serializers.URLField()

@extend_schema(responses=APIRootSerializer)
@api_view(['GET'])
def api_root(request, format=None):
    root_urls = {
        'api_v1': reverse('api-v1-root', request=request),
        'token_obtain': request.build_absolute_uri('token/'),
        'logout': request.build_absolute_uri('logout/'),
    }
    
    # Include API documentation URLs only in DEBUG mode
    if settings.DEBUG:
        root_urls.update({
            'schema': reverse('schema', request=request),
            'docs': reverse('swagger-ui', request=request),
        })
    
    return Response(root_urls)

urlpatterns = [
    path('api/', api_root, name='api-root'),  # API root
    path('admin/', admin.site.urls),
    path('api/v1/', include('auth.v1.urls')),
    
    # ==================== SUPERUSER Admin Portal ====================
    # Superuser-only portal with Django session authentication:
    # - Uses standard Django sessions (not JWT)
    # - No system redirection logic
    # - Manages user masterlist, import/export, CRUD operations
    path('superadmin/', include('users.superadmin_urls')),

    # Token and Logout (API endpoints)
    path('token/', CustomTokenObtainPairView.as_view(), name='root_token_obtain'),
    path('logout/', UILogoutView.as_view(), name='root_logout'),
    
    # API shortcut for current user profile (works for both staff and employees)
    path('api/me/', MeView.as_view(), name='api-me'),
    
    # ==================== REACT FRONTEND SPA ====================
    # React SPA frontend - handles its own routing via react-router-dom
    # Entry point only - React Router handles all internal navigation
    path('app/', TemplateView.as_view(template_name='frontend/index.html'), name='react-app'),
]

# Include API documentation URLs only in DEBUG mode
if settings.DEBUG:
    urlpatterns += [
        path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
        path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
        path('docs/', SpectacularRedocView.as_view(url_name='schema'), name='redoc-ui'),
    ]
    # Serve media files in development
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Catch-all pattern for 404 handling (works in both DEBUG and production)
# Must be at the very end of urlpatterns
from django.urls import re_path
from django.views.generic import RedirectView

def catch_all_404(request):
    """
    Catch-all view that handles unmatched URLs.
    First checks if adding a trailing slash would match an existing URL.
    """
    from django.urls import resolve, Resolver404
    
    path = request.path
    
    # If path doesn't end with slash, try adding one
    if not path.endswith('/'):
        try:
            resolve(path + '/')
            # URL exists with trailing slash - redirect to it
            return RedirectView.as_view(url=path + '/', permanent=False)(request)
        except Resolver404:
            pass
    
    # No match found - show 404 page
    return custom_404_view(request)

urlpatterns += [
    re_path(r'^.*$', catch_all_404, name='catch-all-404'),
]
