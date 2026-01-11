"""
JWT token utilities for employee authentication.
"""
import logging
import jwt
from datetime import timedelta
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def decode_employee_token(token_str):
    """
    Decode custom employee JWT token.
    
    Args:
        token_str: JWT token string
        
    Returns:
        Tuple: (is_valid, payload or error_message)
    """
    try:
        algorithm = getattr(settings, 'SIMPLE_JWT', {}).get('ALGORITHM', 'HS256')
        secret = getattr(settings, 'SIMPLE_JWT', {}).get('SIGNING_KEY', settings.SECRET_KEY)
        
        payload = jwt.decode(token_str, secret, algorithms=[algorithm])
        return True, payload
    except Exception as e:
        logger.warning(f"Token decode error: {str(e)}")
        return False, str(e)


def generate_employee_tokens(employee):
    """
    Generate access and refresh tokens for an employee.
    
    Args:
        employee: Employee model instance
        
    Returns:
        Dict: {'access_token': str, 'refresh_token': str}
    """
    import uuid
    now = timezone.now()
    # Use SIMPLE_JWT settings for consistency with User tokens
    access_lifetime = getattr(settings, 'SIMPLE_JWT', {}).get('ACCESS_TOKEN_LIFETIME', timedelta(minutes=5))
    refresh_lifetime = getattr(settings, 'SIMPLE_JWT', {}).get('REFRESH_TOKEN_LIFETIME', timedelta(days=7))
    access_exp = now + access_lifetime
    refresh_exp = now + refresh_lifetime
    
    # Build full name
    full_name = f"{employee.first_name} {employee.middle_name or ''} {employee.last_name}".replace('  ', ' ').strip()
    
    # Get JWT issuer for Kong compatibility (must match Kong JWT credential key)
    jwt_issuer = getattr(settings, 'SIMPLE_JWT', {}).get('ISSUER', 'tts-jwt-issuer')
    
    access_payload = {
        'token_type': 'access',
        'exp': int(access_exp.timestamp()),
        'iat': int(now.timestamp()),
        'jti': uuid.uuid4().hex,
        'iss': jwt_issuer,  # Required by Kong JWT plugin
        'user_id': employee.id,
        'employee_id': employee.id,  # Keep for backward compatibility
        'email': employee.email,
        'username': employee.username or employee.email.split('@')[0],
        'full_name': full_name,
        'user_type': 'employee',
        'roles': [
            {
                'system': 'hdts',
                'role': 'Employee'
            }
        ]
    }
    
    refresh_payload = {
        'token_type': 'refresh',
        'exp': int(refresh_exp.timestamp()),
        'iat': int(now.timestamp()),
        'jti': uuid.uuid4().hex,
        'iss': jwt_issuer,  # Required by Kong JWT plugin
        'user_id': employee.id,
        'employee_id': employee.id,  # Keep for backward compatibility
        'email': employee.email,
        'user_type': 'employee',
    }
    
    algorithm = getattr(settings, 'SIMPLE_JWT', {}).get('ALGORITHM', 'HS256')
    secret = getattr(settings, 'SIMPLE_JWT', {}).get('SIGNING_KEY', settings.SECRET_KEY)
    
    access_token = jwt.encode(access_payload, secret, algorithm=algorithm)
    refresh_token = jwt.encode(refresh_payload, secret, algorithm=algorithm)
    
    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
    }


def set_employee_cookies(response, access_token, refresh_token):
    """
    Set JWT tokens in secure httponly cookies.
    Adapts secure flag based on DEBUG mode (development vs production).
    
    Args:
        response: Django Response object
        access_token: Access token string
        refresh_token: Refresh token string
        
    Returns:
        Response: Updated response with cookies
    """
    # Only use secure flag in production (when DEBUG=False)
    use_secure = not settings.DEBUG
    
    # Use SIMPLE_JWT settings for cookie max_age
    access_lifetime = getattr(settings, 'SIMPLE_JWT', {}).get('ACCESS_TOKEN_LIFETIME', timedelta(minutes=5))
    refresh_lifetime = getattr(settings, 'SIMPLE_JWT', {}).get('REFRESH_TOKEN_LIFETIME', timedelta(days=7))
    
    # SameSite=Lax allows cookies on same-site navigations.
    # Use COOKIE_DOMAIN from settings for cross-port/subdomain cookie sharing
    cookie_samesite = 'Lax'
    cookie_domain = getattr(settings, 'COOKIE_DOMAIN', 'localhost')
    
    response.set_cookie(
        'access_token',
        access_token,
        httponly=True,
        secure=use_secure,
        samesite=cookie_samesite,
        max_age=int(access_lifetime.total_seconds()),
        path='/',
        domain=cookie_domain,
    )
    response.set_cookie(
        'refresh_token',
        refresh_token,
        httponly=True,
        secure=use_secure,
        samesite=cookie_samesite,
        max_age=int(refresh_lifetime.total_seconds()),
        path='/',
        domain=cookie_domain,
    )
    return response


def clear_employee_cookies(response):
    """
    Clear JWT token cookies.
    
    Args:
        response: Django Response object
        
    Returns:
        Response: Updated response with cleared cookies
    """
    response.delete_cookie('access_token', path='/')
    response.delete_cookie('refresh_token', path='/')
    return response
