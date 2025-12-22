from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router and register viewsets
router = DefaultRouter()
router.register(r'messages', views.MessageViewSet, basename='message')
router.register(r'reactions', views.ReactionViewSet, basename='reaction')
router.register(r'attachments', views.AttachmentViewSet, basename='attachment')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Custom actions
    path('messages/by-ticket/', views.MessageViewSet.as_view({'get': 'by_ticket'}), name='messages-by-ticket'),
    path('messages/<str:pk>/delete/', views.MessageViewSet.as_view({'delete': 'destroy'}), name='delete-message'),
    path('reactions/add/', views.ReactionViewSet.as_view({'post': 'add'}), name='add-reaction'),
    path('reactions/remove/', views.ReactionViewSet.as_view({'post': 'remove'}), name='remove-reaction'),
    path('attachments/<str:attachment_id>/download/', views.AttachmentViewSet.as_view({'get': 'download'}), name='download-attachment'),
]