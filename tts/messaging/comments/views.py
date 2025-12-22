# Import all the refactored components
from .viewsets import CommentViewSet, CommentRatingViewSet
from .api_views import (
    add_comment,
    get_comments,
    update_comment,
    delete_comment,
    download_comment_attachment
)

# Re-export for backward compatibility
__all__ = [
    'CommentViewSet',
    'CommentRatingViewSet',
    'add_comment',
    'get_comments',
    'update_comment',
    'delete_comment',
    'download_comment_attachment'
]
