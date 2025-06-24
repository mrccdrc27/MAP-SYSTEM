from rest_framework import generics
from rest_framework.exceptions import ValidationError
from .models import Steps
from .serializers import *
from rest_framework.response import Response
from rest_framework import status

# --- STEPS ---
class StepListCreateView(generics.ListCreateAPIView):
    queryset = Steps.objects.all()
    serializer_class = StepSerializer

    def get_queryset(self):
        workflow_id = self.request.query_params.get('workflow')
        if workflow_id:
            return Steps.objects.filter(workflow__id=workflow_id)
        return Steps.objects.all()
    
class StepDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Steps.objects.all()
    serializer_class = StepSerializer
    lookup_field = 'step_id'

class Stepviews(generics.ListAPIView):
    """
    List all steps for a given workflow.
    """
    serializer_class = StepSerializer
    queryset = Steps.objects.all()

# --- STEP TRANSITIONS ---
class StepTransitionListCreateView(generics.ListCreateAPIView):
    queryset = StepTransition.objects.all()
    serializer_class = StepTransitionSerializer

    def get_queryset(self):
        step_id = self.request.query_params.get("step", None)
        if step_id:
            try:
                step_id = int(step_id)
            except ValueError:
                raise ValidationError({"error": "Invalid Parameters"})
            return StepTransition.objects.filter(from_step__id=step_id)
        return StepTransition.objects.all()

class StepTransitionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = StepTransition.objects.all()
    serializer_class = StepTransitionSerializer
    lookup_field = 'transition_id'

class StepTransitionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = StepTransition.objects.all()
    serializer_class = StepTransitionSerializer
    lookup_field = 'transition_id'

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.from_step_id is None:
            return Response(
                {"detail": "Cannot delete the start transition (from_step = null)."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)