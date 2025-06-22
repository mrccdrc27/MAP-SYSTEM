from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from .models import ActionLog
from .serializers import ActionLogSerializer

class ActionLogViewSet(viewsets.ModelViewSet):
    queryset = ActionLog.objects.all().order_by('-created_at')  # ✅ Add ordering here
    serializer_class = ActionLogSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['task_id']

# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import WorkflowProgressSerializer

class WorkflowProgressView(APIView):
    def get(self, request, *args, **kwargs):
        task_id = request.query_params.get("task_id")
        serializer = WorkflowProgressSerializer(data={"task_id": task_id})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)
