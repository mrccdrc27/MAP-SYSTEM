from django.shortcuts import render
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import Roles
from .serializers import RoleSerializer
from authentication import JWTCookieAuthentication


# Create new position
class PositionCreateView(generics.CreateAPIView):
    queryset = Roles.objects.all()
    serializer_class = RoleSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]


# Optionally list all positions
class PositionListView(generics.ListAPIView):
    queryset = Roles.objects.all()
    serializer_class = RoleSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]


class RoleListCreateView(generics.ListCreateAPIView):
    serializer_class = RoleSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        position_id = self.request.query_params.get('id')
        if position_id:
            return Roles.objects.filter(id=position_id)
        return Roles.objects.all()

    
class RoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Roles.objects.all()
    serializer_class = RoleSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'