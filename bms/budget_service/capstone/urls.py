from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from django.conf import settings
from django.conf import settings
from django.conf.urls.static import static
from django.views.decorators.csrf import csrf_exempt 
from django.http import JsonResponse
from django.db import connection 
from django.db.utils import OperationalError  


@csrf_exempt
def budget_health_check_view(request):
    """Health check endpoint for Render deployment"""
    app_status = {"status": "healthy", "service": "budget_service"}
    try:
        connection.ensure_connection()
        app_status["database_status"] = "healthy"
        return JsonResponse(app_status, status=200)
    except OperationalError as e:
        app_status["database_status"] = "unhealthy"
        app_status["status"] = "degraded"
        app_status["error"] = str(e)
        return JsonResponse(app_status, status=503)

urlpatterns = [
    path('health/', budget_health_check_view, name='budget_health_check'),  # MUST BE FIRST
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),

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