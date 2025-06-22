from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.views import APIView
from .serializers import *
from rest_framework.response import Response
from rest_framework import status

# Create your views here.
class WorkflowViewSet(viewsets.ModelViewSet):
    queryset = Workflows.objects.all()
    serializer_class = WorkflowSerializer
    lookup_field = 'workflow_id'

class StepViewSet(viewsets.ModelViewSet):
    queryset = Steps.objects.all()
    serializer_class = StepSerializer
    lookup_field = 'step_id'

class StepTransitionViewSet(viewsets.ModelViewSet):
    queryset = StepTransition.objects.all()
    serializer_class = StepTransitionSerializer
    lookup_field = 'transition_id'

class ActionViewSet(viewsets.ModelViewSet):
    queryset = Actions.objects.all()
    serializer_class = ActionSerializer
    lookup_field = 'action_id'

class SaveGraphView(APIView):
    def post(self, request):
        workflow_id = request.data.get("workflow_id")
        steps = request.data.get("nodes", [])
        transitions = request.data.get("edges", [])

        Steps.objects.filter(workflow_id=workflow_id).delete()
        StepTransition.objects.filter(workflow_id=workflow_id).delete()

        for step in steps:
            step['workflow_id'] = workflow_id
            StepSerializer(data=step).is_valid(raise_exception=True)
            StepSerializer(data=step).save()

        for transition in transitions:
            transition['workflow_id'] = workflow_id
            StepTransitionSerializer(data=transition).is_valid(raise_exception=True)
            StepTransitionSerializer(data=transition).save()

        return Response({"message": "Workflow graph saved"}, status=status.HTTP_201_CREATED)
    

class WorkflowGraphView(APIView):
    def get(self, request, workflow_id):
        workflow = Workflows.objects.get(workflow_id=workflow_id)
        steps = Steps.objects.filter(workflow_id=workflow_id)
        transitions = StepTransition.objects.filter(workflow_id=workflow_id)

        nodes = [
            {
                "id": step.step_id,
                "label": step.name,
                "instruction": step.instruction,
                "role": step.role_id.name if step.role_id else "",
                "status": "draft"  # or “done” if using action_logs
            }
            for step in steps
        ]

        edges = [
            {
                "from": tr.from_step_id.step_id if tr.from_step_id else None,
                "to": tr.to_step_id.step_id if tr.to_step_id else None,
                "action": tr.action_id.name if tr.action_id else ""
            }
            for tr in transitions
        ]

        return Response({
            "workflow_id": workflow.workflow_id,
            "name": workflow.name,
            "nodes": nodes,
            "edges": edges,
        })