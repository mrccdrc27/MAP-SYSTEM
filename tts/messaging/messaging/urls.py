"""
URL configuration for messaging project.

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
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework.response import Response
from rest_framework.decorators import api_view
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

# Import viewsets for the main API router
from comments.views import CommentViewSet, CommentRatingViewSet
from tickets.views import MessageViewSet, ReactionViewSet, AttachmentViewSet

# Create main API router for all viewset-based endpoints
router = DefaultRouter()
# Comments app
router.register(r'comments', CommentViewSet)
router.register(r'ratings', CommentRatingViewSet)
# Tickets app
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'reactions', ReactionViewSet, basename='reaction')
router.register(r'attachments', AttachmentViewSet, basename='attachment')

@api_view(['GET'])
def api_root(request):
    """
    API Root - Messaging Service
    
    This messaging service provides endpoints for:
    - Comments: Create, read, update comments with document attachments
    - Ratings: Rate comments (thumbs up/down)
    - Messages: Send messages to tickets (auto-creates tickets if needed)
    - Reactions: Add emoji reactions to messages
    - Attachments: File attachments for messages
    
    Key Features:
    - Automatic ticket creation when sending messages
    - Document deduplication based on file hash
    - Nested comment replies
    - User ownership tracking
    - File attachment support
    - Real-time WebSocket notifications
    """
    return Response({
        'message': 'Welcome to the Messaging Service API',
        'version': '2.0.0',
        'endpoints': {
            'comments': request.build_absolute_uri('/comments/'),
            'ratings': request.build_absolute_uri('/ratings/'),
            'messages': request.build_absolute_uri('/messages/'),
            'reactions': request.build_absolute_uri('/reactions/'),
            'attachments': request.build_absolute_uri('/attachments/'),
            'documentation': request.build_absolute_uri('/api/docs/'),
            'schema': request.build_absolute_uri('/api/schema/'),
        },
        'features': [
            'Automatic ticket creation via messages',
            'Document attachment with deduplication',
            'Message reactions and file attachments',
            'Nested comment replies',
            'Comment rating system',
            'User ownership tracking',
            'Real-time WebSocket support'
        ]
    })

# Lazy function wrappers for media views to avoid import-time issues
def cached_media_view(request, document_id):
    """Lazy wrapper for cached media view"""
    from .media_views import cached_media_view as view_func
    return view_func(request, document_id)

def cached_public_media_view(request, path):
    """Lazy wrapper for cached public media view"""
    from .media_views import cached_public_media_view as view_func
    return view_func(request, path)

urlpatterns = [
    # Include comments URLs first to handle custom paths like download
    path('', include('comments.urls')),
    
    # Admin interface
    path('admin/', admin.site.urls),
    
    # Main API routes (DRF ViewSets) - serves as root
    path('', include(router.urls)),
    
    # Custom action routes that aren't handled by the router
    path('messages/by-ticket/', MessageViewSet.as_view({'get': 'by_ticket'}), name='messages-by-ticket'),
    path('messages/<str:message_id>/delete/', MessageViewSet.as_view({'delete': 'destroy'}), name='delete-message'),
    path('reactions/add/', ReactionViewSet.as_view({'post': 'add'}), name='add-reaction'),
    path('reactions/remove/', ReactionViewSet.as_view({'post': 'remove'}), name='remove-reaction'),
    
    # API Documentation
    path('api/', api_root, name='api-root'),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # DRF Auth (for browsable API)
    path('api-auth/', include('rest_framework.urls')),
    
    # Cached media serving endpoints (lazy imported to avoid circular imports)
    path('media/document/<str:document_id>/', cached_media_view, name='cached-document'),
    re_path(r'^media/(?P<path>.*)$', cached_public_media_view, name='cached-media'),
]

# Remove the old static media serving for production-ready caching
# The cached views handle all media serving with proper cache headers
