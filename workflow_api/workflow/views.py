from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError
from django.db import transaction
import logging
from copy import deepcopy

from audit.utils import log_action, compare_models
from .models import Workflows
from .serializers import (
    WorkflowBasicSerializer,
    CreateWorkflowSerializer,
    CreateWorkflowWithGraphSerializer,
    UpdateWorkflowDetailsSerializer,
    UpdateWorkflowGraphSerializer,
    StepSerializer,
    UpdateStepDetailsSerializer,
    TransitionSerializer,
    UpdateTransitionDetailsSerializer,
)
from .services import WorkflowGraphService
from step.models import Steps, StepTransition
from authentication import JWTCookieAuthentication

logger = logging.getLogger(__name__)


class WorkflowViewSet(mixins.CreateModelMixin, mixins.DestroyModelMixin, viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for managing workflows.
    
    Actions:
    - list: GET /workflows/ - List all workflows
    - create: POST /workflows/ - Create workflow with optional graph
    - retrieve: GET /workflows/{id}/ - Get workflow details
    - destroy: DELETE /workflows/{id}/ - Delete a workflow
    - update_graph: PUT /workflows/{id}/update-graph/ - Update workflow graph (nodes/edges)
    - update_details: PUT /workflows/{id}/update-details/ - Update workflow metadata
    - workflow_detail: GET /workflows/{id}/detail/ - Get complete workflow details with graph
    - get_graph: GET /workflows/{id}/graph/ - Get graph only
    """
    queryset = Workflows.objects.all()
    serializer_class = WorkflowBasicSerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    lookup_field = 'workflow_id'
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return CreateWorkflowWithGraphSerializer
        elif self.action == 'update_details':
            return UpdateWorkflowDetailsSerializer
        elif self.action == 'update_graph':
            return UpdateWorkflowGraphSerializer
        return WorkflowBasicSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Create a new workflow with optional graph structure.
        
        Supports two formats:
        1. Simple workflow creation (backward compatible):
           POST /workflows/ 
           { "name": "...", "description": "...", ... }
        
        2. Workflow with graph creation:
           POST /workflows/
           {
               "workflow": { "name": "...", "description": "...", ... },
               "graph": {
                   "nodes": [...],
                   "edges": [...]
               }
           }
        """
        # Determine which serializer to use
        if 'workflow' in request.data and 'graph' in request.data:
            # Combined workflow+graph creation
            serializer = CreateWorkflowWithGraphSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            try:
                workflow_data = serializer.validated_data.get('workflow')
                graph_data = serializer.validated_data.get('graph')
                
                # Use Service to create workflow and graph
                workflow, temp_id_mapping = WorkflowGraphService.create_workflow_with_graph(
                    user=request.user,
                    workflow_data=workflow_data,
                    graph_data=graph_data,
                    request=request
                )
                
                # Return the created workflow with its graph
                return Response(
                    self._get_workflow_detail_response(workflow, temp_id_mapping),
                    status=status.HTTP_201_CREATED
                )
            
            except ValidationError as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                logger.error(f"❌ Error creating workflow with graph: {str(e)}")
                return Response(
                    {'error': f'Failed to create workflow: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Simple workflow creation (backward compatible)
            serializer = CreateWorkflowSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            try:
                workflow = Workflows.objects.create(
                    user_id=request.user.id if hasattr(request.user, 'id') else 1,
                    **serializer.validated_data
                )
                logger.info(f"✅ Created workflow: {workflow.name} (ID: {workflow.workflow_id})")
                try:
                    log_action(request.user, 'create_workflow', target=workflow, request=request)
                except Exception as e:
                    logger.error(f"Failed to log audit for create_workflow: {e}")
                
                output_serializer = WorkflowBasicSerializer(workflow)
                return Response(output_serializer.data, status=status.HTTP_201_CREATED)
            
            except Exception as e:
                logger.error(f"❌ Error creating workflow: {str(e)}")
                return Response(
                    {'error': f'Failed to create workflow: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
    
    def _build_graph_data(self, workflow_id, temp_id_mapping=None):
        """Helper method to build graph data (nodes and edges)"""
        return WorkflowGraphService.build_graph_data(workflow_id, temp_id_mapping)

    def _get_workflow_detail_response(self, workflow, temp_id_mapping=None):
        """Helper method to return complete workflow details with graph as a dict"""
        workflow_serializer = WorkflowBasicSerializer(workflow)
        workflow_data = workflow_serializer.data
        
        graph_data = self._build_graph_data(workflow.workflow_id, temp_id_mapping)
        
        response_data = {
            'workflow': workflow_data,
            'graph': graph_data
        }
        
        if temp_id_mapping:
            response_data['temp_id_mapping'] = temp_id_mapping
        
        return response_data
    
    @action(detail=True, methods=['put'], url_path='update-graph')
    def update_graph(self, request, workflow_id=None):
        """
        Update workflow graph (nodes and edges).
        Supports create, update, and delete operations.
        """
        try:
            workflow = Workflows.objects.get(workflow_id=workflow_id)
        except Workflows.DoesNotExist:
            return Response(
                {'error': f'Workflow with ID {workflow_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = UpdateWorkflowGraphSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        nodes_data = serializer.validated_data.get('nodes', [])
        edges_data = serializer.validated_data.get('edges', [])
        
        try:
            # Save old state for audit if needed, but service handles logging.
            # However, the service logs the 'update_workflow' action.
            # The service returns graph_changes and temp_id_mapping.
            
            _, temp_id_mapping = WorkflowGraphService.update_workflow_graph(
                user=request.user,
                workflow=workflow,
                nodes_data=nodes_data,
                edges_data=edges_data,
                request=request
            )
            
            # Using 200 OK for updates
            return Response(
                self._get_workflow_detail_response(workflow, temp_id_mapping),
                status=status.HTTP_200_OK
            )
        
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"❌ Error updating workflow graph: {str(e)}")
            return Response(
                {'error': f'Failed to update workflow graph: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def retrieve(self, request, *args, **kwargs):
        """
        Get workflow details including graph.
        Overrides default retrieve to return full details.
        """
        instance = self.get_object()
        data = self._get_workflow_detail_response(instance)
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='graph')
    def get_graph(self, request, workflow_id=None):
        """Get complete workflow graph (all nodes and edges)"""
        try:
            workflow = Workflows.objects.get(workflow_id=workflow_id)
        except Workflows.DoesNotExist:
            return Response(
                {'error': f'Workflow with ID {workflow_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(
            self._build_graph_data(workflow.workflow_id),
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['get'], url_path='detail')
    def workflow_detail(self, request, workflow_id=None):
        """Get complete workflow details including metadata and graph"""
        try:
            workflow = Workflows.objects.get(workflow_id=workflow_id)
        except Workflows.DoesNotExist:
            return Response(
                {'error': f'Workflow with ID {workflow_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(
            self._get_workflow_detail_response(workflow),
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['put'], url_path='update-details')
    def update_details(self, request, workflow_id=None):
        """Update workflow metadata (name, description, category, SLAs, etc.)"""
        try:
            workflow = Workflows.objects.get(workflow_id=workflow_id)
        except Workflows.DoesNotExist:
            return Response(
                {'error': f'Workflow with ID {workflow_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = UpdateWorkflowDetailsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Save old state for audit
            old_workflow = deepcopy(workflow)
            
            for field, value in serializer.validated_data.items():
                setattr(workflow, field, value)
            workflow.save()
            
            logger.info(f"✅ Updated workflow: {workflow.name} (ID: {workflow.workflow_id})")
            
            # Log audit event
            changes = compare_models(old_workflow, workflow)
            if changes:
                try:
                    log_action(request.user, 'update_workflow', target=workflow, changes=changes, request=request)
                except Exception as e:
                    logger.error(f"Failed to log audit for update_workflow: {e}")
            
            output_serializer = WorkflowBasicSerializer(workflow)
            return Response(output_serializer.data, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"❌ Error updating workflow: {str(e)}")
            return Response(
                {'error': f'Failed to update workflow: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def destroy(self, request, workflow_id=None):
        """
        Delete a workflow and all its associated steps and transitions.
        """
        try:
            workflow = Workflows.objects.get(workflow_id=workflow_id)
        except Workflows.DoesNotExist:
            return Response(
                {'error': f'Workflow with ID {workflow_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            workflow_name = workflow.name
            workflow_id_str = workflow.workflow_id
            
            # Log audit event before deletion (while object still exists)
            try:
                log_action(request.user, 'delete_workflow', target=workflow, request=request)
            except Exception as e:
                logger.error(f"Failed to log audit for delete_workflow: {e}")
            
            # Delete related steps and transitions will be cascaded by Django
            workflow.delete()
            
            logger.info(f"✅ Deleted workflow: {workflow_name} (ID: {workflow_id_str})")
            
            return Response(
                {'message': f'Workflow {workflow_name} deleted successfully'},
                status=status.HTTP_204_NO_CONTENT
            )
        
        except Exception as e:
            logger.error(f"❌ Error deleting workflow: {str(e)}")
            return Response(
                {'error': f'Failed to delete workflow: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class StepManagementViewSet(viewsets.ViewSet):
    """ViewSet for managing step details."""
    
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['put'], url_path='(?P<step_id>[^/.]+)/update-details')
    def update_details(self, request, step_id=None):
        """Update step details (name, description, instruction, order, design)."""
        try:
            step = Steps.objects.get(step_id=step_id)
        except Steps.DoesNotExist:
            return Response(
                {'error': f'Step with ID {step_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = UpdateStepDetailsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            for field, value in serializer.validated_data.items():
                setattr(step, field, value)
            step.save()
            
            logger.info(f"✅ Updated step: {step.name} (ID: {step.step_id})")
            
            output_serializer = StepSerializer(step)
            return Response(output_serializer.data, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"❌ Error updating step: {str(e)}")
            return Response(
                {'error': f'Failed to update step: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class TransitionManagementViewSet(viewsets.ViewSet):
    """ViewSet for managing transition details."""
    
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['put'], url_path='(?P<transition_id>[^/.]+)/update-details')
    def update_details(self, request, transition_id=None):
        """Update transition details (name only)."""
        try:
            transition = StepTransition.objects.get(transition_id=transition_id)
        except StepTransition.DoesNotExist:
            return Response(
                {'error': f'Transition with ID {transition_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = UpdateTransitionDetailsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            for field, value in serializer.validated_data.items():
                setattr(transition, field, value)
            transition.save()
            
            logger.info(f"✅ Updated transition: {transition.transition_id}")
            
            output_serializer = TransitionSerializer(transition)
            return Response(output_serializer.data, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"❌ Error updating transition: {str(e)}")
            return Response(
                {'error': f'Failed to update transition: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
