# Import all the refactored components
from .viewsets import CommentViewSet, CommentRatingViewSet

# Re-export for backward compatibility
__all__ = [
    'CommentViewSet',
    'CommentRatingViewSet',
]
