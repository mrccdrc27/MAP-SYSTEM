from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from users.models import User
from roles.models import Role
from systems.models import System
from system_roles.models import UserSystemRole
from django.db.models import Q
from users.authentication import CookieJWTAuthentication
from rest_framework.permissions import IsAuthenticated
from .serializers import TTSUserWithRoleSerializer, AssignAgentToRoleSerializer

# Create your views here.

class UserIDsByRoleView(APIView):
    """
    API endpoint for TTS round-robin user selection.
    Returns users that have the specified role_id or role_name.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        role_id = request.query_params.get('role_id')
        role_name = request.query_params.get('role_name')
        
        if not role_id and not role_name:
            return Response({"error": "Either role_id or role_name parameter is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get TTS system
            try:
                tts_system = System.objects.get(slug='tts')
                
                # Set up filter for UserSystemRole query
                user_system_role_filter = {'system': tts_system}
                
                # If role_id is provided, try to use it
                if role_id:
                    try:
                        # Convert role_id to integer
                        role_id = int(role_id)
                        user_system_role_filter['role__id'] = role_id
                    except ValueError:
                        return Response({"error": "role_id must be a number."}, status=status.HTTP_400_BAD_REQUEST)
                # If role_name is provided, use case-insensitive matching
                elif role_name:
                    # Use iexact for case-insensitive matching
                    user_system_role_filter['role__name__iexact'] = role_name
                
                # Find users with this role in TTS
                user_system_roles = UserSystemRole.objects.filter(**user_system_role_filter)
                
                # Extract the user IDs
                user_ids = user_system_roles.values_list('user__id', flat=True)
                
                return Response(list(user_ids), status=status.HTTP_200_OK)
            
            except System.DoesNotExist:
                return Response([], status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserInfoByIDView(APIView):
    """
    API endpoint for fetching user information by user ID.
    Returns business and non-sensitive user information only.
    Requires JWT authentication for service-to-service communication.
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, user_id):
        try:
            # Convert user_id to integer
            try:
                user_id = int(user_id)
            except ValueError:
                return Response({"error": "user_id must be a number."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Fetch user by ID
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
            
            # Return only business and non-sensitive information
            user_info = {
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "department": getattr(user, 'department', None),
                "position": getattr(user, 'position', None),
                "is_active": user.is_active,
                "date_joined": user.date_joined,
                # Add any other business-relevant fields that exist in your User model
            }
            
            return Response(user_info, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UsersInfoBatchView(APIView):
    """
    API endpoint for fetching multiple users' information in a batch request.
    Returns business and non-sensitive user information only.
    Requires JWT authentication for service-to-service communication.
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Get employee_cookie_ids from request body
            employee_cookie_ids = request.data.get('employee_cookie_ids', [])
            
            if not employee_cookie_ids:
                return Response({"error": "employee_cookie_ids array is required."}, status=status.HTTP_400_BAD_REQUEST)
            
            if not isinstance(employee_cookie_ids, list):
                return Response({"error": "employee_cookie_ids must be an array."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Convert all IDs to integers and validate
            try:
                employee_cookie_ids = [int(id_val) for id_val in employee_cookie_ids]
            except ValueError:
                return Response({"error": "All employee_cookie_ids must be numbers."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Fetch users by IDs
            users = User.objects.filter(id__in=employee_cookie_ids)
            
            # Build response mapping employee_cookie_id to user info
            user_info_map = {}
            for user in users:
                user_info_map[user.id] = {
                    "id": user.id,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                    "department": getattr(user, 'department', None),
                    "position": getattr(user, 'position', None),
                    "is_active": user.is_active,
                    "date_joined": user.date_joined,
                }
            
            return Response(user_info_map, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AssignAgentToRoleView(GenericAPIView):
    """
    API endpoint for assigning existing TTS agents to TTS roles.
    Requires JWT authentication for service-to-service communication.
    
    The browsable API provides dropdown menus for:
    - userID: Select from available users
    - role: Select from available roles
    
    POST body:
    {
        "userID": <int>,
        "role": <int>  # role ID
    }
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = AssignAgentToRoleSerializer
    
    def post(self, request):
        try:
            # Validate input using serializer
            serializer = AssignAgentToRoleSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {"errors": serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Extract validated data (both are already objects from PrimaryKeyRelatedField)
            user = serializer.validated_data['user']  # Mapped from userID via source='user'
            role_obj = serializer.validated_data['role']
            
            # Get TTS system
            try:
                tts_system = System.objects.get(slug='tts')
            except System.DoesNotExist:
                return Response(
                    {"error": "TTS system not found in database."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Check if user already has this specific role in TTS system
            existing_assignment = UserSystemRole.objects.filter(
                user=user,
                system=tts_system,
                role=role_obj
            ).first()
            
            if existing_assignment:
                # User already has this exact role in TTS
                return Response(
                    {
                        "message": "User is already assigned to this role in TTS.",
                        "userID": user.id,
                        "role": role_obj.name,
                        "system": tts_system.slug
                    },
                    status=status.HTTP_200_OK
                )
            
            # Create new role assignment (user can have multiple roles)
            user_system_role = UserSystemRole.objects.create(
                user=user,
                system=tts_system,
                role=role_obj
            )
            
            return Response(
                {
                    "message": "User successfully assigned to TTS role.",
                    "userID": user.id,
                    "role": role_obj.name,
                    "system": tts_system.slug
                },
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get(self, request):
        """
        Retrieve all TTS users and their assigned roles.
        Returns a list of users with their role information.
        """
        try:
            # Get TTS system
            try:
                tts_system = System.objects.get(slug='tts')
            except System.DoesNotExist:
                return Response(
                    {"error": "TTS system not found in database."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Fetch all user-system-role assignments for TTS
            user_system_roles = UserSystemRole.objects.filter(
                system=tts_system
            ).select_related('user', 'role')
            
            if not user_system_roles.exists():
                return Response(
                    {"message": "No TTS users assigned to roles.", "users": []},
                    status=status.HTTP_200_OK
                )
            
            # Serialize the data
            serializer = TTSUserWithRoleSerializer(user_system_roles, many=True)
            
            return Response(
                {
                    "count": len(serializer.data),
                    "system": "tts",
                    "users": serializer.data
                },
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
