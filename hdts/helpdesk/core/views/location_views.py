"""
Location views for Asset Check-Out form locations.
Provides CRUD operations for managing locations.
Only System Admin/Admin can create, update, delete locations.
Public endpoint available for fetching active locations (for ticket forms).
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from ..authentication import CookieJWTAuthentication, ExternalUser
from ..models import Location
from ..serializers import LocationSerializer
import logging

logger = logging.getLogger(__name__)


def is_admin_user(request):
    """
    Check if the requesting user has Admin or System Admin role.
    Works with CookieJWTAuthentication (ExternalUser) and Django User.
    """
    ADMIN_ROLES = ['Admin', 'System Admin', 'SystemAdmin', 'HDTS Admin']

    # Check for authenticated user (ExternalUser or Django User)
    user = getattr(request, 'user', None)
    if user and getattr(user, 'is_authenticated', False):
        # ExternalUser from CookieJWTAuthentication
        if isinstance(user, ExternalUser):
            if user.role in ADMIN_ROLES:
                return True
        # Django User
        else:
            if getattr(user, 'is_superuser', False):
                return True
            if hasattr(user, 'role') and user.role in ADMIN_ROLES:
                return True
    
    return False


@api_view(['GET'])
@permission_classes([AllowAny])
def list_locations(request):
    """
    List all active locations. Public endpoint for ticket forms.
    Returns locations formatted for dropdown selection.
    """
    try:
        # Get only active locations for dropdown
        locations = Location.objects.filter(is_active=True).order_by('city', 'zip_code')
        serializer = LocationSerializer(locations, many=True)
        return Response({
            'success': True,
            'count': locations.count(),
            'locations': serializer.data
        })
    except Exception as e:
        logger.error(f"Error listing locations: {e}")
        return Response({
            'success': False,
            'error': 'Failed to retrieve locations'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([AllowAny])
def list_all_locations(request):
    """
    List all locations (including inactive) for admin management.
    Requires Admin or System Admin role.
    """
    if not is_admin_user(request):
        return Response({
            'success': False,
            'error': 'Permission denied. Admin access required.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        locations = Location.objects.all().order_by('city', 'zip_code')
        serializer = LocationSerializer(locations, many=True)
        return Response({
            'success': True,
            'count': locations.count(),
            'locations': serializer.data
        })
    except Exception as e:
        logger.error(f"Error listing all locations: {e}")
        return Response({
            'success': False,
            'error': 'Failed to retrieve locations'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([AllowAny])
def create_location(request):
    """
    Create a new location.
    Requires Admin or System Admin role.
    """
    if not is_admin_user(request):
        return Response({
            'success': False,
            'error': 'Permission denied. Admin access required.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        serializer = LocationSerializer(data=request.data)
        if serializer.is_valid():
            location = serializer.save()
            logger.info(f"Location created: {location.city} - {location.zip_code}")
            return Response({
                'success': True,
                'message': 'Location created successfully',
                'location': LocationSerializer(location).data
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error creating location: {e}")
        return Response({
            'success': False,
            'error': 'Failed to create location'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_location(request, location_id):
    """
    Get a specific location by ID.
    """
    try:
        location = Location.objects.get(id=location_id)
        serializer = LocationSerializer(location)
        return Response({
            'success': True,
            'location': serializer.data
        })
    except Location.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Location not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error getting location {location_id}: {e}")
        return Response({
            'success': False,
            'error': 'Failed to retrieve location'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT', 'PATCH'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([AllowAny])
def update_location(request, location_id):
    """
    Update an existing location.
    Requires Admin or System Admin role.
    """
    if not is_admin_user(request):
        return Response({
            'success': False,
            'error': 'Permission denied. Admin access required.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        location = Location.objects.get(id=location_id)
        partial = request.method == 'PATCH'
        serializer = LocationSerializer(location, data=request.data, partial=partial)
        
        if serializer.is_valid():
            updated_location = serializer.save()
            logger.info(f"Location updated: {updated_location.city} - {updated_location.zip_code}")
            return Response({
                'success': True,
                'message': 'Location updated successfully',
                'location': LocationSerializer(updated_location).data
            })
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    except Location.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Location not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error updating location {location_id}: {e}")
        return Response({
            'success': False,
            'error': 'Failed to update location'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([AllowAny])
def delete_location(request, location_id):
    """
    Delete a location.
    Requires Admin or System Admin role.
    """
    if not is_admin_user(request):
        return Response({
            'success': False,
            'error': 'Permission denied. Admin access required.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        location = Location.objects.get(id=location_id)
        city = location.city
        zip_code = location.zip_code
        location.delete()
        logger.info(f"Location deleted: {city} - {zip_code}")
        return Response({
            'success': True,
            'message': 'Location deleted successfully'
        })
    except Location.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Location not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error deleting location {location_id}: {e}")
        return Response({
            'success': False,
            'error': 'Failed to delete location'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([AllowAny])
def toggle_location_status(request, location_id):
    """
    Toggle a location's active status.
    Requires Admin or System Admin role.
    """
    if not is_admin_user(request):
        return Response({
            'success': False,
            'error': 'Permission denied. Admin access required.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        location = Location.objects.get(id=location_id)
        location.is_active = not location.is_active
        location.save()
        logger.info(f"Location status toggled: {location.city} - {location.zip_code} (active: {location.is_active})")
        return Response({
            'success': True,
            'message': f"Location {'activated' if location.is_active else 'deactivated'} successfully",
            'location': LocationSerializer(location).data
        })
    except Location.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Location not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error toggling location status {location_id}: {e}")
        return Response({
            'success': False,
            'error': 'Failed to toggle location status'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
