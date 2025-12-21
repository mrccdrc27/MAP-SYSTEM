# backend/core/authentication.py
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from django.contrib.auth.models import AnonymousUser
from .auth_client import auth_client
import jwt
from django.conf import settings


class CustomUser:
    """Mock user object with auth service data from the JWT."""

    def __init__(self, jwt_payload):
        self.id = jwt_payload.get('user_id')
        self.email = jwt_payload.get('email')
        self.username = jwt_payload.get('username')
        self.first_name = jwt_payload.get('first_name', '')
        self.last_name = jwt_payload.get('last_name', '')

        # --- RBAC ---
        # Store the entire roles dictionary from the JWT payload
        # e.g., {'bms': 'FINANCE_HEAD', 'dts': 'user'}
        self.roles = jwt_payload.get('roles', {})

        # we can keep department info if it's also in the JWT
        self.department_id = jwt_payload.get('department_id')
        self.department_name = jwt_payload.get('department_name')

        # Standard Django properties
        self.is_active = True  # If the token is valid, the user is considered active
        self.is_staff = False  # Staff/superuser status should be determined by roles
        self.is_superuser = False

    @property
    def is_authenticated(self):
        return True

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self):
        return self.email


class MicroserviceJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that creates a CustomUser from the validated token payload.
    """

    def get_user(self, validated_token):
        """
        Returns a CustomUser instance from the token payload
        Does not query the database or an external service
        """
        try:
            # The validated_token IS the payload.
            return CustomUser(validated_token)
        except Exception as e:
            raise InvalidToken(
                f'Could not construct user from token: {str(e)}')
#  `request.user` object in every `budget_service` view will now have a `request.user.roles` dictionary that we can check for permissions