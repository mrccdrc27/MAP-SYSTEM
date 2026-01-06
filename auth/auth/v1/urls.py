# auth/auth/v1
from django.urls import path, include
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import serializers
from drf_spectacular.utils import extend_schema
from .token_refresh_view import UnifiedTokenRefreshView

class APIV1RootSerializer(serializers.Serializer):
    users = serializers.URLField()
    roles = serializers.URLField()
    systems = serializers.URLField()
    system_roles = serializers.URLField(source='system-roles')
    token = serializers.URLField()
    tts = serializers.URLField()
    hdts = serializers.URLField()
    employees = serializers.URLField()

@extend_schema(responses=APIV1RootSerializer)
@api_view(['GET'])
def api_v1_root(request, format=None):
    return Response({
        "users": request.build_absolute_uri("users/"),
        "roles": request.build_absolute_uri("roles/"),
        "systems": request.build_absolute_uri("systems/"),
        "system-roles": request.build_absolute_uri("system-roles/"),
        "token": request.build_absolute_uri("token/"),
        "tts": request.build_absolute_uri("tts/"),
        "hdts": request.build_absolute_uri("hdts/"),
        "employees": request.build_absolute_uri("employees/"),
    })

urlpatterns = [
    path('', api_v1_root, name='api-v1-root'),
    path('users/', include('users.urls')),
    path('roles/', include('roles.urls')),
    path('systems/', include('systems.urls')),
    path('system-roles/', include('system_roles.urls')),
    # Token endpoints
    path('token/', include('auth.token_urls')),
    # Unified token refresh (cookie-based, works for both User and Employee)
    path('token/refresh/cookie/', UnifiedTokenRefreshView.as_view(), name='unified-token-refresh'),
    path('tts/', include('tts.urls')),
    path('hdts/', include('hdts.urls')),
]
