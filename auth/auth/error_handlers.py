"""
Custom error handlers for the auth service.
Handles 404 and other HTTP errors with smart redirects based on authentication state.
"""
from django.shortcuts import render, redirect
from django.conf import settings
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from systems.models import System
from users.models import User
import jwt
import logging

logger = logging.getLogger(__name__)


def get_user_from_request(request):
    """
    Extract user from JWT token in cookies.
    Returns (user_type, user_id) or (None, None) if not authenticated.
    """
    access_token = request.COOKIES.get('access_token')
    if not access_token:
        return None, None
    
    try:
        # First try to decode as employee token
        algorithm = getattr(settings, 'SIMPLE_JWT', {}).get('ALGORITHM', 'HS256')
        secret = getattr(settings, 'SIMPLE_JWT', {}).get('SIGNING_KEY', settings.SECRET_KEY)
        
        try:
            payload = jwt.decode(access_token, secret, algorithms=[algorithm])
            if 'employee_id' in payload:
                return 'employee', payload.get('employee_id')
        except Exception:
            pass
        
        # Try as staff user token
        token = AccessToken(access_token)
        token.verify()
        user_id = token.get('user_id')
        user_type = token.get('user_type', 'staff')
        
        if user_id:
            return user_type, user_id
            
    except (TokenError, InvalidToken) as e:
        logger.debug(f'Invalid JWT token: {e}')
    except Exception as e:
        logger.warning(f'Error parsing JWT: {e}')
    
    return None, None


def get_user_systems(user_id):
    """Get systems assigned to a user."""
    try:
        return System.objects.filter(
            user_roles__user_id=user_id,
            user_roles__is_active=True
        ).distinct()
    except Exception:
        return System.objects.none()


def custom_404_view(request, exception=None):
    """
    Custom 404 handler that shows a 404 page with smart redirect options.
    The page will show redirect links based on authentication state.
    """
    user_type, user_id = get_user_from_request(request)
    
    context = {
        'is_authenticated': user_type is not None,
        'user_type': user_type,
        'redirect_url': None,
        'redirect_message': None,
    }
    
    # Determine the best redirect URL based on auth state
    if not user_type:
        # Not authenticated - show login links
        context['redirect_url'] = '/staff/login/'
        context['redirect_message'] = 'Please log in to continue.'
    elif user_type == 'employee':
        # Employee - redirect to HDTS
        hdts_url = settings.SYSTEM_TEMPLATE_URLS.get('hdts', 'http://localhost:3000/hdts')
        context['redirect_url'] = hdts_url
        context['redirect_message'] = 'Redirecting to HDTS...'
    elif user_type == 'staff':
        # Staff - check their systems
        systems = list(get_user_systems(user_id))
        
        if len(systems) == 1:
            system_url = settings.SYSTEM_TEMPLATE_URLS.get(systems[0].slug, settings.DEFAULT_SYSTEM_URL)
            context['redirect_url'] = system_url
            context['redirect_message'] = f'Redirecting to {systems[0].name}...'
        elif len(systems) > 1:
            context['redirect_url'] = '/api/v1/users/welcome/'
            context['redirect_message'] = 'Redirecting to system selection...'
        else:
            context['redirect_url'] = '/api/v1/users/welcome/'
            context['redirect_message'] = 'Redirecting to welcome page...'
    
    return render(request, 'errors/404.html', context, status=404)


def custom_500_view(request):
    """Custom 500 error handler."""
    return render(request, 'errors/500.html', status=500)
