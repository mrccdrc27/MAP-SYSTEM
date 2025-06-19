from rest_framework import generics
from rest_framework.generics import RetrieveAPIView
from rest_framework.exceptions import ValidationError
from .models import Workflows
from .serializers import *

class WorkflowListCreateView(generics.ListCreateAPIView):
    queryset = Workflows.objects.all()
    serializer_class = WorkflowSerializer

    def get_queryset(self):
        workflow_id = self.request.query_params.get('id')
        if workflow_id:
            return Workflows.objects.filter(id=workflow_id)
        return Workflows.objects.all()


class WorkflowDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Workflows.objects.all()
    serializer_class = WorkflowSerializer
    lookup_field = 'id'

from rest_framework import viewsets
from .models import Category
from .serializers import CategorySerializer

class CategoryListCreateView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class WorkflowAggregatedView(generics.ListAPIView):
    serializer_class = FullWorkflowSerializer
    queryset = Workflows.objects.all()

class WorkflowAggregatedDetailView(RetrieveAPIView):
    queryset = Workflows.objects.all()
    serializer_class = FullWorkflowSerializer
    lookup_field = 'workflow_id'