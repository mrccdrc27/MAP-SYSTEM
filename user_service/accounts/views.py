import os    
from rest_framework import generics
from rest_framework.views import APIView
from django.shortcuts import render
from rest_framework.generics import GenericAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from .serializers import *
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken, TokenError
from rest_framework.response import Response
from rest_framework import status, permissions
from .serializers import VerifyLoginOTPSerializer
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from .models import CustomUser
from .serializers import RequestPasswordResetSerializer, PasswordResetConfirmSerializer
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth import get_user_model
from rest_framework import serializers
from .serializers import InviteUserSerializer
from .models import PendingRegistration
from django.urls import reverse
from rest_framework.generics import CreateAPIView
from rest_framework.renderers import JSONRenderer, BrowsableAPIRenderer
from django.contrib.auth import update_session_auth_hash
from .serializers import UserActivationSerializer
from django.utils.crypto import get_random_string
from django.core.cache import cache
from .serializers import CustomUserSerializer
from .serializers import PendingRegistrationSerializer
from django.utils import timezone
from django.core.mail import send_mail
from urllib.parse import urlencode
from rest_framework.decorators import api_view
from django.core import signing

from django.conf import settings




User = get_user_model()

class UserListView(generics.ListAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserInfoSerializer#CompleteRegistrationSerializer 

class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserInfoSerializer
    lookup_field = "id"  # default is 'pk', change if your URL uses 'id'
    
class PendingRegistrationListView(generics.ListAPIView):
    serializer_class = PendingRegistrationSerializer

    def get_queryset(self):
        now = timezone.now()
        return PendingRegistration.objects.filter(is_used=False, expires_at__gt=now)
    
class PendingRegistrationDeleteView(generics.DestroyAPIView):
    queryset = PendingRegistration.objects.all()
    lookup_field = 'id'  # or 'pk'
    

class ToggleUserActivationAPIView(GenericAPIView):
    # permission_classes = [permissions.IsAdminUser]  # Add later when needed
    renderer_classes = [JSONRenderer, BrowsableAPIRenderer]
    serializer_class = UserActivationSerializer

    def get(self, request, user_id):
        # this is required to render the form properly in the browser
        serializer = UserActivationSerializer()
        return Response(serializer.data)

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        # Accept form data or JSON
        serializer = UserActivationSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'success': True, 'is_active': user.is_active})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



# Is a protected Route, must put token to validate and get request
class HelloView(APIView):
    permission_classes = (IsAuthenticated, )

    def get(self, request):
        content = {'message': 'Hello'}
        return Response(content)
    
class AdminView(APIView):
    permission_classes = (IsAuthenticated, )

    def get(self, request):
        if not request.user.is_staff:
            return Response("invalid credentials", status= status.HTTP_401_UNAUTHORIZED)
        content = {'message': 'Hello Admin'}
        return Response(content)

class Verify(APIView):
    # checks if there are any tampering done to the jwt
    permission_classes = (IsAuthenticated, )
    def get(self, request):
        content = {'is_staff': request.user.is_staff}
        if not request.user.is_staff:
            return Response(content, status= status.HTTP_200_OK)
        return Response(content, status= status.HTTP_200_OK)

class Me(APIView):
    # checks if there are any tampering done to the jwt
    permission_classes = (IsAuthenticated, )
    def get(self, request):
        content = {'is_staff': request.user.is_staff}
        if not request.user.is_staff:
            return Response(content, status= status.HTTP_200_OK)
        return Response(content, status= status.HTTP_200_OK)


class UserLoginAPIView(GenericAPIView):
    permission_classes = (AllowAny,)
    serializer_class = UserLoginSerializer
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data= request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data

         # Generate 6-digit OTP
        otp = get_random_string(length=6, allowed_chars='0123456789')

        # Store OTP in cache for 5 minutes
        cache.set(f'otp:{user.email}', otp, timeout=300)

        # Send OTP email
        send_mail(
            subject='Your Login OTP',
            message=f'Hi {user.email},\n\nYour OTP is: {otp}\n\nThis will expire in 5 minutes.',
            from_email='Gensys Support Team <no-reply@gensys.com>',
            recipient_list=[user.email],
        )

        # Create a signed (temporary) token with the email, expires in 5 minutes
        temp_token = signing.dumps(user.email, salt='otp-salt')

        return Response({
            "message": "OTP sent to your email. Please verify to complete login.",
            "temp_token": temp_token,
        }, status=200)

class VerifyLoginOTPAPIView(GenericAPIView):
    serializer_class = VerifyLoginOTPSerializer
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        temp_token = serializer.validated_data['temp_token']
        otp = serializer.validated_data['otp']

        # Decode email from token
        try:
            email = signing.loads(temp_token, salt='otp-salt', max_age=300)  # 5 minutes expiry
        except BadSignature:
            return Response({'error': 'Invalid or expired token.'}, status=400)

        cached_otp = cache.get(f'otp:{email}')
        if cached_otp != otp:
            return Response({'error': 'Invalid or expired OTP.'}, status=400)

        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)


        # Clear OTP 
        cache.delete(f'otp:{email}')

        # Create JWT, Reason for removal of JWT on login: Need to verify with 2FA first before issuing JWT.
        token = RefreshToken.for_user(user)
        data = {
            "refresh": str(token),
            "access": str(token.access_token),
            "is_staff": user.is_staff,
            "user": CustomUserSerializer(user).data
        }

        return Response(data, status=200)


# class UserLogoutAPIView(GenericAPIView):    
#     def post(self, request, *args, **kwargs):
#         try:
#             refresh_token = request.data["refresh"]
#             token = RefreshToken(refresh_token)
#             token.blacklist()
#             return Response(status=status.HTTP_205_RESET_CONTENT)
#         except Exception as e:
#             return Response(status= status.HTTP_400_BAD_REQUEST)

    
#     def get_object(self):
#         return self.request.user
    

class UserLogoutAPIView(APIView):
    permission_classes = [AllowAny]  # No access token required

    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response({"detail": "Refresh token required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()  # Will raise TokenError if already blacklisted or invalid
            return Response({"detail": "Successfully logged out."}, status=status.HTTP_205_RESET_CONTENT)
        except TokenError as e:
            return Response({"detail": "Invalid or already blacklisted refresh token."}, status=status.HTTP_400_BAD_REQUEST)
    
class RequestPasswordResetAPIView(GenericAPIView):
    permission_classes = (AllowAny,)
    serializer_class = RequestPasswordResetSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        try:
            user = CustomUser.objects.get(email=email)
            token = PasswordResetTokenGenerator().make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_link = f"http://localhost:8000/api/password/reset/confirm/?uid={uid}&token={token}"
  # Change to your frontend URL

            message = f"""
            Hi,

            We received a request to reset your password. You can reset it by clicking the link below:

            {reset_link}

            If you did not request a password reset, you can safely ignore this email.

            This link will expire in 24 hours for your security.

            Thank you,  
            GenSys Support Team
            """
            
            # Send email
            send_mail(
                'Reset Your Password',
                message,
                'Gensys Support Team',
                [email],
            )

            return Response({'message': 'Password reset link sent.'}, status=200)
        except CustomUser.DoesNotExist:
            return Response({'error': 'User with this email does not exist.'}, status=404)

class PasswordResetConfirmAPIView(GenericAPIView):
    permission_classes = (AllowAny,)
    serializer_class = PasswordResetConfirmSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uidb64 = serializer.validated_data['uid']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = CustomUser.objects.get(pk=uid)

            if PasswordResetTokenGenerator().check_token(user, token):
                user.set_password(new_password)
                user.save()
                return Response({'message': 'Password reset successfully.'}, status=200)
            else:
                return Response({'error': 'Invalid or expired token.'}, status=400)
        except Exception:
            return Response({'error': 'Invalid reset link.'}, status=400)

class PasswordTokenCheckAPI(APIView):
    permission_classes = (AllowAny,)
    
    def get(self, request, uidb64, token):
        try:
            id = force_str(urlsafe_base64_decode(uidb64))
            user = CustomUser.objects.get(id=id)
            if not PasswordResetTokenGenerator().check_token(user, token):
                return Response({'error': 'Invalid token, please request a new one.'}, status=status.HTTP_401_UNAUTHORIZED)
            return Response({'success': True, 'message': 'Valid token', 'uidb64': uidb64, 'token': token}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': 'Token is invalid or expired, please request a new one.'}, status=status.HTTP_401_UNAUTHORIZED)


class PasswordResetCompleteAPIView(APIView):
    def post(self, request, *args, **kwargs):
        uidb64 = request.data.get("uidb64")
        token = request.data.get("token")
        new_password = request.data.get("new_password")
        
        try:
            # Decode the uidb64 to get the user ID
            uid = urlsafe_base64_decode(uidb64).decode()
            user = get_user_model().objects.get(id=uid)
            
            # Validate the token
            if default_token_generator.check_token(user, token):
                # Set new password and save
                user.set_password(new_password)
                user.save()
                return Response({"message": "Password reset successful"}, status=status.HTTP_200_OK)
            else:
                return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": "Invalid request"}, status=status.HTTP_400_BAD_REQUEST)
        



class InviteUserView(CreateAPIView):
    # permission_classes = [permissions.IsAdminUser]
    serializer_class = InviteUserSerializer

    def perform_create(self, serializer):
        registration = serializer.save()
        token = str(registration.token)

        # FRONTEND URL (change this to your production domain when deployed)
        # frontend_base_url = "http://localhost:3000/api/authapi/register/${token}/"
# "http://localhost:1000/register"
        frontend_base_url = settings.FRONTEND_URL
        query_string = urlencode({'token': token})
        url = f"{frontend_base_url}?{query_string}"

        send_mail(
            subject="Action Required: Complete Your Registration",
            message=(
                f"Dear Agent,\n\n"
                f"You have been invited to complete your account registration.\n"
                f"Please click the link below to set your credentials and activate your account:\n\n"
                f"{url}\n\n"
                f"Note: This link will expire in 24 hours for security purposes.\n\n"
                f"If you did not request this invitation, you may safely ignore this email.\n\n"
                f"Best regards,\n"
                f"Gensys Support Team"
            ),
            from_email='Gensys Support Team <no-reply@gensys.com>',
            recipient_list=[registration.email],
        )

        


@api_view(['GET'])
def validate_registration_token(request):
    token = request.query_params.get('token')
    if not token:
        return Response({'valid': False, 'message': 'Token missing'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        invite = PendingRegistration.objects.get(token=token)
        if invite.is_expired():
            return Response({'valid': False, 'message': 'Token expired'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'valid': True})
    except PendingRegistration.DoesNotExist:
        return Response({'valid': False, 'message': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)
    


class RegisterUserView(generics.CreateAPIView):
    serializer_class = CompleteRegistrationSerializer

    # def create(self, request, *args, **kwargs):
    #     serializer = self.get_serializer(data=request.data)
    #     serializer.is_valid(raise_exception=True)
    #     result = serializer.save()

        # user = result['user']
        # return Response({
        #     'user': {
        #         'id': user.id,
        #         'email': user.email,
        #         'first_name': user.first_name,
        #         'last_name': user.last_name,
        #         'role': user.role,
        #     },
        #     'refresh': result['refresh'],
        #     'access': result['access'],
        # }, status=status.HTTP_201_CREATED)

class ChangePasswordAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Password changed successfully."}, status=200)
        return Response(serializer.errors, status=400)
    

class AccountCreateView(generics.ListCreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = AccountSerializer

    def get_queryset(self):
        workflow_id = self.request.query_params.get('workflow')
        if workflow_id:
            return CustomUser.objects.filter(workflow__id=workflow_id)
        return CustomUser.objects.all()
    
class AccountDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = AccountSerializer
    lookup_field = 'id'

class UsersByRoleView(APIView):
    def get(self, request, role_id):
        try:
            # Ensure role exists
            Roles.objects.get(role_id=role_id)
        except Roles.DoesNotExist:
            return Response({"detail": "Role not found."}, status=status.HTTP_404_NOT_FOUND)
        
        users = CustomUser.objects.filter(role__role_id=role_id)
        serializer = CustomUserSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    

class Me(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = CustomUserSerializer(request.user)
        return Response(serializer.data)
    
class UserIDsByRoleView(APIView):
    def get(self, request):
        role_id = request.query_params.get('role_id')
        if not role_id:
            return Response({"error": "role_id parameter is required."}, status=status.HTTP_400_BAD_REQUEST)

        user_ids = CustomUser.objects.filter(role_id=role_id).values_list('id', flat=True)
        return Response(list(user_ids), status=status.HTTP_200_OK)
