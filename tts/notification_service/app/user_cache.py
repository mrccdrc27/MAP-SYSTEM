"""
User email cache - imports from models for backward compatibility.
The actual model is defined in models.py
"""

from .models import UserEmailCache

__all__ = ['UserEmailCache']


def delete_user(user_id):
    """Remove a user from the cache."""
    return UserEmailCache.objects.filter(user_id=user_id).delete()
