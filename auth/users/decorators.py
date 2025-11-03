from functools import wraps
from django.shortcuts import redirect
from django.urls import reverse # To dynamically get the login URL
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from .models import User # Use relative import within the users app

def get_user_from_jwt_cookie(request):
    """
    Attempts to authenticate a user based on the JWT access token in cookies.
    Returns the User object if successful, otherwise None.
    (Copied from hdts/decorators.py - consider moving to a shared location later)
    """
    token_str = request.COOKIES.get('access_token')
    if not token_str:
        return None

    try:
        access_token = AccessToken(token_str)
        # Verify token (checks signature and expiry)
        access_token.verify() 
        
        # Get user ID from payload
        user_id = access_token.payload.get('user_id')
        if not user_id:
            return None
            
        # Fetch user from database
        user = User.objects.get(id=user_id)
        return user
        
    except (InvalidToken, TokenError, User.DoesNotExist):
        # If token is invalid, expired, or user doesn't exist
        return None
    except Exception:
        # Catch any other unexpected errors during token processing
        return None

def jwt_cookie_required(view_func):
    """
    Decorator for views that require the user to be authenticated via JWT cookie.
    Redirects to login if not authenticated via JWT.
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        # Attempt to authenticate using JWT cookie
        user = get_user_from_jwt_cookie(request)
        
        if user is None:
            # Not authenticated via JWT, redirect to login page
            login_url = reverse('auth_login') 
            # Add the 'next' parameter to redirect back after login
            return redirect(f'{login_url}?next={request.path}') 
            
        # Attach user to request for the view to use
        request.user = user
            
        # If authenticated, proceed with the view
        return view_func(request, *args, **kwargs)
        
    return wrapper
