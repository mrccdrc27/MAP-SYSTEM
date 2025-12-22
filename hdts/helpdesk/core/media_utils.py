from rest_framework_simplejwt.tokens import AccessToken
from django.conf import settings
from urllib.parse import urlencode


def generate_secure_media_url(file_path, user):
    """
    Generate a secure media URL with authentication token
    
    Args:
        file_path: The relative path to the media file (e.g., 'employee_images/profile.jpg')
        user: The authenticated user requesting the file
    
    Returns:
        A secure URL with embedded access token
    """
    if not file_path:
        return None
    
    # Generate a fresh access token for the user
    token = AccessToken.for_user(user)
    
    # Build the base URL
    if settings.DEBUG:
        # In development, files are served directly
        base_url = f"{settings.MEDIA_URL}{file_path}"
    else:
        # In production, files go through our secure media view
        base_url = f"https://smartsupport-hdts-backend.up.railway.app/media/{file_path}"
    
    # Add token as query parameter
    params = {'token': str(token)}
    secure_url = f"{base_url}?{urlencode(params)}"
    
    return secure_url


def get_media_url_with_token(file_field, user):
    """
    Get a secure media URL for a Django FileField with authentication token
    
    Args:
        file_field: Django FileField instance
        user: The authenticated user requesting the file
    
    Returns:
        A secure URL with embedded access token, or None if no file
    """
    if not file_field:
        return None
    
    try:
        file_path = file_field.name  # Get relative path from MEDIA_ROOT
        return generate_secure_media_url(file_path, user)
    except (ValueError, AttributeError):
        return None
