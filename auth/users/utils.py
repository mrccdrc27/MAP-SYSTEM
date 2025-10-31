"""
Utility functions for the users app.
"""
from django.conf import settings
from django.shortcuts import redirect
from systems.models import System
from system_roles.models import UserSystemRole


def get_system_redirect_url(user, system_slug=None):
    """
    Get the appropriate system URL for a user.
    
    Args:
        user: The authenticated user
        system_slug: Optional system slug. If not provided, uses user's first available system.
    
    Returns:
        str: The URL to redirect to
    """
    system = None

    # If user is not authenticated, return None to handle gracefully
    if not getattr(user, 'is_authenticated', False):
        return None

    if system_slug:
        try:
            system = System.objects.get(slug=system_slug)
            # Verify user has access to this system
            has_access = UserSystemRole.objects.filter(
                user=user,
                system=system
            ).exists()
            if not has_access:
                system = None
        except System.DoesNotExist:
            system = None
    
    if not system:
        # Get user's first available system
        user_systems = System.objects.filter(
            user_roles__user=user
        ).distinct()
        system = user_systems.first() if user_systems.exists() else None
    
    # Get the configured URL for the system
    if system:
        system_url = settings.SYSTEM_TEMPLATE_URLS.get(system.slug.lower())
        
        if system_url:
            # Add user information as query parameters for the external system
            redirect_url = f"{system_url}?user_id={user.id}&system={system.slug}"
            return redirect_url
    
    # No system access or system URL not configured
    return None


def create_system_redirect_response(request, system_slug=None, include_token=True):
    """
    Create a redirect response to the appropriate system URL.
    
    Args:
        request: The Django request object
        system_slug: Optional system slug
        include_token: Whether to include JWT token in the redirect URL
    
    Returns:
        HttpResponseRedirect: The redirect response, or None if no valid system URL
    """
    redirect_url = get_system_redirect_url(request.user, system_slug)
    
    if not redirect_url:
        return None
    
    # Optionally add JWT token as a parameter for SSO, but only for
    # authenticated users to avoid exposing tokens for anonymous requests.
    if include_token and getattr(request.user, 'is_authenticated', False):
        access_token = request.COOKIES.get('access_token')
        if access_token:
            separator = '&' if '?' in redirect_url else '?'
            redirect_url += f"{separator}token={access_token}"
    
    return redirect(redirect_url)