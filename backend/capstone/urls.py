from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from django.conf import settings
from django.conf import settings
from django.conf.urls.static import static

from core.views import budget_health_check_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')), # This includes all your app's API endpoints
    
    # Swagger/Redoc for budget_service API
    path('api/schema/', SpectacularAPIView.as_view(api_version='v1'), name='budget_schema_v1'), # Renamed for clarity
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='budget_schema_v1'), name='budget_swagger_ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='budget_schema_v1'), name='budget_redoc'),
    
    path('health/', budget_health_check_view, name='budget_health_check'), # Health check for budget_service
    # path('', health_check), # REMOVE this if you use /health/
]

# Add debug toolbar URLs only in development
if settings.DEBUG:
    import debug_toolbar
    urlpatterns += [
        path('__debug__/', include(debug_toolbar.urls)),
        
    ]
    
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)