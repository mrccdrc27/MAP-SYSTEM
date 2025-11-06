from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.reverse import reverse
from rest_framework import serializers
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from drf_spectacular.utils import extend_schema
from users.views import *

def root_redirect(request):
    """Redirect root URL to login page"""
    return redirect('auth_login')

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
    path('', root_redirect, name='root-redirect'),  # Redirect root to login page
    path('api/', api_root, name='api-root'),  # API root moved to /api/
    path('admin/', admin.site.urls),
    path('api/v1/', include('auth.v1.urls')),
    # Remove this duplicate inclusion - TTS URLs are already included in v1/urls.py
    # path('api/v1/tts/', include('tts.urls')),

    # UI Login endpoint (supports ?system=<slug> parameter)
    path('login/', LoginView.as_view(), name='auth_login'),
    path('request-otp/', request_otp_for_login, name='auth_request_otp'),
    
    # Captcha URLs
    path('captcha/', include('captcha.urls')),

    # Profile and Settings shortcuts (direct access without /api/v1/users/)
    path('settings/profile/', profile_settings_view, name='profile-settings'),
    path('agent-management/', agent_management_view, name='agent-management'),

    # Shortcut: Token obtain and logout at root level
    path('token/', CustomTokenObtainPairView.as_view(), name='root_token_obtain'),
    path('logout/', UILogoutView.as_view(), name='root_logout'),
    # path('logout/', CookieLogoutView.as_view(), name='root_logout'),
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
