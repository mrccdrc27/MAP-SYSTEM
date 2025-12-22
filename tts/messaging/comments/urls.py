from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a local router for comment-specific endpoints
router = DefaultRouter()
router.register(r'comments', views.CommentViewSet, basename='comment')
router.register(r'ratings', views.CommentRatingViewSet, basename='comment-rating')

urlpatterns = [
    # Include router URLs for ViewSet endpoints (includes nested actions like rate, reply, etc.)
    path('', include(router.urls)),
    
    # Additional function-based view endpoints with api/ prefix for backwards compatibility
    path('api/add-comment/', views.add_comment, name='add-comment'),
    path('api/comments/<int:ticket_id>/', views.get_comments, name='get-comments'),
    path('api/comments/<int:comment_id>/update/', views.update_comment, name='update-comment'),
    path('api/comments/<int:comment_id>/delete/', views.delete_comment, name='delete-comment'),
    path('api/attachments/<int:attachment_id>/download/', views.download_comment_attachment, name='download-attachment'),
]