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
        secret = settings.SECRET_KEY
        
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
    access_exp = now + timedelta(minutes=15)
    refresh_exp = now + timedelta(days=7)
    
    # Build full name
    full_name = f"{employee.first_name} {employee.middle_name or ''} {employee.last_name}".replace('  ', ' ').strip()
    
    access_payload = {
        'token_type': 'access',
        'exp': int(access_exp.timestamp()),
        'iat': int(now.timestamp()),
        'jti': uuid.uuid4().hex,
        'user_id': employee.id,
        'employee_id': employee.id,  # Keep for backward compatibility
        'email': employee.email,
        'username': employee.username or employee.email.split('@')[0],
        'full_name': full_name,
        'user_type': 'staff',
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
        'user_id': employee.id,
        'employee_id': employee.id,  # Keep for backward compatibility
        'email': employee.email,
        'user_type': 'staff',
    }
    
    algorithm = getattr(settings, 'SIMPLE_JWT', {}).get('ALGORITHM', 'HS256')
    secret = settings.SECRET_KEY
    
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
    
    response.set_cookie(
        'access_token',
        access_token,
        httponly=True,
        secure=use_secure,
        samesite='Strict',
        max_age=900  # 15 minutes
    )
    response.set_cookie(
        'refresh_token',
        refresh_token,
        httponly=True,
        secure=use_secure,
        samesite='Strict',
        max_age=86400 * 7  # 7 days
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
