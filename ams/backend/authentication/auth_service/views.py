from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import api_view, action
from rest_framework.permissions import AllowAny
from .models import *
from .serializers import *
from rest_framework.response import Response
from django.contrib.auth import get_user_model
User = get_user_model()

@api_view(['GET'])
def api_test(request):
    return Response({"message": "API is working!"}, status=status.HTTP_200_OK)

class RegisterViewset(viewsets.ModelViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    
    def create(self, request):
        serializer = self.serializer_class(data=request.data)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        else:
            return Response(serializer.errors, status=400)
        
    def destroy(self, request, pk=None):
        user = self.queryset.get(pk=pk)
        user.is_active = False
        user.save()
        return Response(status=204)

class UsersViewset(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]
    register_serializer = RegisterSerializer

    # List of all urls for users viewset.
    def list(self, request):
        base_url = request.build_absolute_uri().rstrip('/')

        # Generate URL for actions
        has_active_url = self.reverse_action(self.has_active_admin.url_name)
        get_current_user_url = self.reverse_action(self.get_current_user.url_name)
        get_all_users_url = self.reverse_action(self.get_all_users.url_name)

        return Response({
            "has_active_admin": has_active_url,
            "update_user": f'{base_url}/pk',
            "get_current_user": get_current_user_url,
            "get_all_users": get_all_users_url,
        })

    # Update auth account by pk
    def update(self, request, pk=None):
        queryset = self.queryset.filter(pk=pk, is_active=True).first()
        if queryset:
            serializer = self.get_serializer(queryset)
            return Response(serializer.data)
        return Response({"message": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # Determine if there is any active admin.
    @action(detail=False, methods=['get'])
    def has_active_admin(self, request):
        has_active_admin = self.queryset.filter(is_active=True, is_superuser=True).exists()

        return Response(has_active_admin)
    
    # Get current user
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def get_current_user(self, request):
        user = request.user
        serializer = self.register_serializer(user)
        return Response(serializer.data)
    
    # Get all active users fullname
    @action(detail=False, methods=['get'])
    def get_all_users(self, request):
        users = self.queryset.filter(is_active=True)
        serializer = UserFullNameSerializer(users, many=True)
        return Response(serializer.data)
    
