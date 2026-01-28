from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.conf import settings



class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that reads tokens from cookies (e.g., 'access_token')
    and falls back to standard Authorization header if cookie is missing or invalid.

    - Uses configurable user_id_field and user_id_claim from settings.SIMPLE_JWT.
    - Gracefully handles invalid/missing cookie tokens.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        simple_jwt_settings = getattr(settings, 'SIMPLE_JWT', {})
        self.user_id_field = simple_jwt_settings.get('USER_ID_FIELD', 'id')
        self.user_id_claim = simple_jwt_settings.get('USER_ID_CLAIM', 'user_id')

    def authenticate(self, request):
        # Try to get token from cookie first
        raw_token = request.COOKIES.get('access_token')

        # No cookie token → fallback to header
        if raw_token is None:
            return super().authenticate(request)

        try:
            # Validate the token from cookie
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
            return (user, validated_token)

        except (TokenError, InvalidToken):
            # Invalid or expired cookie token → fallback to header
            return super().authenticate(request)

    def get_user(self, validated_token):
        """
        Returns the user based on the validated token.
        Ensures correct type conversion for user_id.
        """
        try:
            user_id = validated_token[self.user_id_claim]
            user_id = int(user_id) if not isinstance(user_id, int) else user_id
            user = self.user_model.objects.get(**{self.user_id_field: user_id})
            return user

        except (self.user_model.DoesNotExist, ValueError, KeyError) as e:
            raise self.user_model.DoesNotExist(f"No user found with the given token: {str(e)}")
