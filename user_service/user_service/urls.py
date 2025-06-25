"""
URL configuration for user_service project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt import views as jwt_views
from accounts import views

from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    # Django Admin default
    path('admin/', admin.site.urls),

    # this issues Access JWT token 
    path('token',jwt_views.TokenObtainPairView.as_view(),name='token_obtain_pair'),

    # this issues refresh JWT token 
    path('token/refresh/',jwt_views.TokenRefreshView.as_view(),name = 'token_refresh'),

    # this route takes all from accounts/urls.py under the /api endpoint
    path("", include("accounts.urls")),
    path('role/', include("role.urls")),
    
    path('schema/', SpectacularAPIView.as_view(), name='schema'),  # raw schema (still useful)
    path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),  # Swagger UI
    path('redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),  # Redoc UI

    path('api/notifications/', include('notifications.urls')),

]