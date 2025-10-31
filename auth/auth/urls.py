from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.reverse import reverse
from rest_framework import serializers
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from drf_spectacular.utils import extend_schema
from users.views import CustomTokenObtainPairView, CookieLogoutView, UILogoutView, LoginView, request_otp_for_login

class APIRootSerializer(serializers.Serializer):
    api_v1 = serializers.URLField()
    schema = serializers.URLField()
    docs = serializers.URLField()
    token_obtain = serializers.URLField()
    logout = serializers.URLField()

@extend_schema(responses=APIRootSerializer)
@api_view(['GET'])
def api_root(request, format=None):
    return Response({
        'api_v1': reverse('api-v1-root', request=request),
        'schema': reverse('schema', request=request),
        'docs': reverse('swagger-ui', request=request),
        'token_obtain': request.build_absolute_uri('token/'),
        'logout': request.build_absolute_uri('logout/'),
    })

urlpatterns = [
    path('', api_root, name='api-root'),
    path('admin/', admin.site.urls),
    path('api/v1/', include('auth.v1.urls')),
    # Remove this duplicate inclusion - TTS URLs are already included in v1/urls.py
    # path('api/v1/tts/', include('tts.urls')),

    # UI Login endpoint (supports ?system=<slug> parameter)
    path('login/', LoginView.as_view(), name='auth_login'),
    path('request-otp/', request_otp_for_login, name='auth_request_otp'),
    
    # Captcha URLs
    path('captcha/', include('captcha.urls')),

    # Shortcut: Token obtain and logout at root level
    path('token/', CustomTokenObtainPairView.as_view(), name='root_token_obtain'),
    path('logout/', UILogoutView.as_view(), name='root_logout'),
    # path('logout/', CookieLogoutView.as_view(), name='root_logout'),
    
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('docs/', SpectacularRedocView.as_view(url_name='schema'), name='redoc-ui'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
