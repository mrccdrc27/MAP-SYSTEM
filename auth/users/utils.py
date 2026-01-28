"""
Utility functions for the users app.
"""
from django.conf import settings


def get_cookie_settings():
    """
    Get consistent cookie settings based on environment.
    
    Returns a dict with:
        - domain: Cookie domain (e.g., '.ticketing.mapactive.tech')
        - secure: Whether to use Secure flag
        - samesite: SameSite policy ('None', 'Lax', or 'Strict')
        - httponly: Whether to use HttpOnly flag
    
    For cross-subdomain cookies in production (e.g., login.domain.com -> api.domain.com):
    - Use SameSite=None with Secure=True
    - Use domain with leading dot for subdomain coverage
    
    For localhost/development:
    - Use SameSite=Lax
    - No domain restriction
    """
    cookie_domain = getattr(settings, 'COOKIE_DOMAIN', 'localhost')
    use_secure = not settings.DEBUG
    
    # Check if this is a production domain (not localhost, not IP address)
    is_production_domain = (
        cookie_domain and 
        cookie_domain not in ('localhost', '127.0.0.1') and 
        not cookie_domain.replace('.', '').isdigit()
    )
    
    if is_production_domain and use_secure:
        # Production with HTTPS - use SameSite=None for cross-subdomain
        samesite = 'None'
    else:
        # Development or non-HTTPS - use SameSite=Lax
        samesite = 'Lax'
    
    return {
        'domain': cookie_domain if cookie_domain != 'localhost' else None,
        'secure': use_secure,
        'samesite': samesite,
        'httponly': True,
    }


def set_auth_cookies(response, access_token, refresh_token=None, remember_me=False):
    """
    Set authentication cookies on the response with proper settings.
    
    Args:
        response: Django/DRF Response object
        access_token: The access token string
        refresh_token: The refresh token string (optional)
        remember_me: If True, use extended cookie lifetime
    
    Returns:
        The response with cookies set
    """
    cookie_settings = get_cookie_settings()
    
    # Determine max_age based on remember_me
    if remember_me:
        access_max_age = 30 * 24 * 60 * 60  # 30 days
        refresh_max_age = 30 * 24 * 60 * 60
    else:
        access_max_age = int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
        refresh_max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())
    
    response.set_cookie(
        'access_token',
        access_token,
        max_age=access_max_age,
        httponly=cookie_settings['httponly'],
        secure=cookie_settings['secure'],
        samesite=cookie_settings['samesite'],
        path='/',
        domain=cookie_settings['domain'],
    )
    
    if refresh_token:
        response.set_cookie(
            'refresh_token',
            refresh_token,
            max_age=refresh_max_age,
            httponly=cookie_settings['httponly'],
            secure=cookie_settings['secure'],
            samesite=cookie_settings['samesite'],
            path='/',
            domain=cookie_settings['domain'],
        )
    
    return response
