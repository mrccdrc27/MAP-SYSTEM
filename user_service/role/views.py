from django.shortcuts import render
from rest_framework import generics
from .models import Roles
from .serializers import RoleSerializer

# Create new position
class PositionCreateView(generics.CreateAPIView):
    queryset = Roles.objects.all()
    serializer_class = RoleSerializer

# Optionally list all positions
class PositionListView(generics.ListAPIView):
    queryset = Roles.objects.all()
    serializer_class = RoleSerializer
class RoleListCreateView(generics.ListCreateAPIView):
    serializer_class = RoleSerializer

    def get_queryset(self):
        position_id = self.request.query_params.get('id')
        if position_id:
            return Roles.objects.filter(role_id=position_id)
        return Roles.objects.all()
    
class RoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Roles.objects.all()
    serializer_class = RoleSerializer
    lookup_field = 'id'