"""
URL configuration for workflow_service project.

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
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.reverse import reverse
from rest_framework import serializers
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from drf_spectacular.utils import extend_schema

class APIRootSerializer(serializers.Serializer):
    workflows = serializers.URLField()
    tickets = serializers.URLField()
    tasks = serializers.URLField()
    transitions = serializers.URLField()
    roles = serializers.URLField()
    steps = serializers.URLField()
    ams_checkout = serializers.URLField()
    bms_checkout = serializers.URLField()
    workflow_manager = serializers.URLField()
    analytics = serializers.URLField()
    schema = serializers.URLField()
    docs = serializers.URLField()
    admin = serializers.URLField()

@extend_schema(responses=APIRootSerializer)
@api_view(['GET'])
def api_root(request, format=None):
    """
    Workflow API Root
    
    Welcome to the Workflow Management API. This API provides endpoints for managing
    workflows, tickets, tasks, roles, and actions in the ticket tracking system.
    """
    return Response({
        'message': 'Welcome to Workflow Management API',
        'version': '1.0',
        'workflows': request.build_absolute_uri('workflows/'),
        'tickets': request.build_absolute_uri('tickets/'),
        'tasks': request.build_absolute_uri('tasks/'),
        'transitions': request.build_absolute_uri('transitions/'),
        'roles': request.build_absolute_uri('roles/'),
        'steps': request.build_absolute_uri('steps/'),
        'ams-checkout': request.build_absolute_uri('ams-checkout/'),
        'bms-checkout': request.build_absolute_uri('bms-checkout/'),
        'workflow-manager': request.build_absolute_uri('workflow-manager/'),
        'analytics': request.build_absolute_uri('analytics/'),
        'schema': reverse('schema', request=request, format=format),
        'docs': reverse('swagger-ui', request=request, format=format),
        'admin': reverse('admin:index', request=request, format=format),
    })

urlpatterns = [
    # API Root
    path('', api_root, name='api-root'),
    
    # Admin
    path('admin/', admin.site.urls),
    
    # Main API endpoints
    path('workflows/', include('workflow.urls')),
    path('tickets/', include('tickets.urls')),
    path('tasks/', include('task.urls')),
    path('transitions/', include('task.transitions_urls')),
    path('roles/', include('role.urls')),
    path('steps/', include('step.urls')),
    path('ams-checkout/', include('amscheckout.urls')),
    path('bms-checkout/', include('bmscheckout.urls')),
    path('workflow-manager/', include('workflowmanager.urls')),
    path('audit/', include('audit.urls')),
    path('analytics/', include('reporting.urls')),

    # Documentation
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)