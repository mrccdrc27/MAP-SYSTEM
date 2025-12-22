from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema


def get_user_bms_role(user):
    """
    Helper function to get the BMS role for a user.
    Works with both the new array-based roles format and backward compatibility.
    
    Args:
        user: The authenticated user object from request.user
        
    Returns:
        str or None: The BMS role name (e.g., 'ADMIN', 'FINANCE_HEAD', 'GENERAL_USER')
    """
    # If user has the new get_role_for_system method
    if hasattr(user, 'get_role_for_system'):
        return user.get_role_for_system('bms')
    
    # If user has the _roles_dict attribute
    if hasattr(user, '_roles_dict'):
        return user._roles_dict.get('bms')
    
    # Fallback: parse roles array directly
    roles = getattr(user, 'roles', [])
    
    # Handle array of role objects
    if isinstance(roles, list):
        for role in roles:
            if isinstance(role, dict):
                if role.get('system') == 'bms':
                    return role.get('role')
            elif isinstance(role, str) and role.startswith('bms:'):
                return role.split(':', 1)[1]
    
    # Handle dict format (old format)
    if isinstance(roles, dict):
        return roles.get('bms')
    
    return None


@extend_schema(
    tags=['Utilities'],
    summary="Get Current Server Time",
    description="Returns the current server time in ISO 8601 format. Useful for syncing frontend clocks.",
    responses={200: {"type": "object", "properties": {"server_time": {"type": "string", "format": "date-time"}}}}
)
@api_view(['GET'])
@permission_classes([AllowAny]) # Must be public endpoint
def get_server_time(request):
    """
    Provides the current server time to sync client-side clocks.
    """
    return Response({"server_time": timezone.now().isoformat()})