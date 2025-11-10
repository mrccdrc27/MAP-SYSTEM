from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError
from django.db import transaction
import logging

from .models import Workflows, Category
from .serializers import (
    WorkflowBasicSerializer,
    WorkflowGraphResponseSerializer,
    CreateWorkflowSerializer,
    CreateWorkflowWithGraphSerializer,
    UpdateWorkflowDetailsSerializer,
    UpdateWorkflowGraphSerializer,
    UpdateWorkflowGraphSerializerV2,
    CategorySerializer,
    StepSerializer,
    UpdateStepDetailsSerializer,
    TransitionSerializer,
    UpdateTransitionDetailsSerializer,
)
from step.models import Steps, StepTransition
from role.models import Roles
from authentication import JWTCookieAuthentication

logger = logging.getLogger(__name__)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing workflow categories.
    
    Actions:
    - list: GET /categories/ - List all categories
    - retrieve: GET /categories/{id}/ - Get category details
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]


class WorkflowViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing workflows.
    
    Actions:
    - list: GET /workflows/ - List all workflows
    - create: POST /workflows/ - Create workflow with optional graph
    - retrieve: GET /workflows/{id}/ - Get workflow details
    - update: PUT /workflows/{id}/ - Update workflow
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
                with transaction.atomic():
                    workflow_data = serializer.validated_data.get('workflow')
                    graph_data = serializer.validated_data.get('graph')
                    
                    # Create workflow
                    workflow = Workflows.objects.create(
                        user_id=request.user.id if hasattr(request.user, 'id') else 1,
                        name=workflow_data['name'],
                        description=workflow_data.get('description', ''),
                        category=workflow_data['category'],
                        sub_category=workflow_data['sub_category'],
                        department=workflow_data['department'],
                        end_logic=workflow_data.get('end_logic', ''),
                        low_sla=workflow_data.get('low_sla'),
                        medium_sla=workflow_data.get('medium_sla'),
                        high_sla=workflow_data.get('high_sla'),
                        urgent_sla=workflow_data.get('urgent_sla'),
                    )
                    logger.info(f"✅ Created workflow: {workflow.name} (ID: {workflow.workflow_id})")
                    
                    temp_id_mapping = {}
                    
                    # Process nodes if graph is provided
                    if graph_data:
                        nodes_data = graph_data.get('nodes', [])
                        edges_data = graph_data.get('edges', [])
                        
                        # Create all nodes
                        for node in nodes_data:
                            node_id = node.get('id')
                            if not node.get('to_delete', False):
                                role_name = node.get('role')
                                role = Roles.objects.get(name=role_name)
                                
                                new_step = Steps.objects.create(
                                    workflow_id=workflow,
                                    role_id=role,
                                    name=node.get('name', ''),
                                    description=node.get('description', ''),
                                    instruction=node.get('instruction', ''),
                                    design=node.get('design', {}),
                                    order=0
                                )
                                temp_id_mapping[node_id] = new_step.step_id
                                logger.info(f"✅ Created node: {node_id} -> DB ID {new_step.step_id}")
                        
                        # Create all edges
                        for edge in edges_data:
                            edge_id = edge.get('id')
                            if not edge.get('to_delete', False):
                                from_id = edge.get('from_node')
                                to_id = edge.get('to_node')
                                
                                # Resolve temp IDs to actual IDs
                                if str(from_id) in temp_id_mapping:
                                    from_id = temp_id_mapping[str(from_id)]
                                if str(to_id) in temp_id_mapping:
                                    to_id = temp_id_mapping[str(to_id)]
                                
                                from_step = Steps.objects.get(step_id=int(from_id), workflow_id=workflow.workflow_id)
                                to_step = Steps.objects.get(step_id=int(to_id), workflow_id=workflow.workflow_id)
                                
                                StepTransition.objects.create(
                                    workflow_id=workflow,
                                    from_step_id=from_step,
                                    to_step_id=to_step,
                                    name=edge.get('name', '')
                                )
                                logger.info(f"✅ Created edge: {edge_id} -> DB {from_id}→{to_id}")
                    
                    # Return the created workflow with its graph
                    return self._get_workflow_detail_response(workflow, temp_id_mapping)
            
            except Roles.DoesNotExist as e:
                logger.error(f"❌ Role not found: {str(e)}")
                return Response(
                    {'error': f'Role not found: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except ValidationError as e:
                logger.error(f"❌ Validation error: {str(e)}")
                return Response(
                    {'error': f'Validation error: {str(e)}'},
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
                
                output_serializer = WorkflowBasicSerializer(workflow)
                return Response(output_serializer.data, status=status.HTTP_201_CREATED)
            
            except Exception as e:
                logger.error(f"❌ Error creating workflow: {str(e)}")
                return Response(
                    {'error': f'Failed to create workflow: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
    
    def _get_workflow_detail_response(self, workflow, temp_id_mapping=None):
        """Helper method to return complete workflow details with graph"""
        workflow_serializer = WorkflowBasicSerializer(workflow)
        workflow_data = workflow_serializer.data
        
        nodes = Steps.objects.filter(workflow_id=workflow.workflow_id)
        edges = StepTransition.objects.filter(workflow_id=workflow.workflow_id)
        
        nodes_data = []
        for node in nodes:
            created_at = node.created_at
            updated_at = node.updated_at
            if hasattr(created_at, 'isoformat'):
                created_at = created_at.isoformat()
            if hasattr(updated_at, 'isoformat'):
                updated_at = updated_at.isoformat()
            
            nodes_data.append({
                'id': node.step_id,
                'name': node.name,
                'role': node.role_id.name if node.role_id else '',
                'description': node.description or '',
                'instruction': node.instruction or '',
                'design': node.design or {},
                'created_at': created_at,
                'updated_at': updated_at,
            })
        
        edges_data = []
        for edge in edges:
            edges_data.append({
                'id': edge.transition_id,
                'from': edge.from_step_id.step_id if edge.from_step_id else None,
                'to': edge.to_step_id.step_id if edge.to_step_id else None,
                'name': edge.name or ''
            })
        
        graph_data = {
            'nodes': nodes_data,
            'edges': edges_data
        }
        
        response_data = {
            'workflow': workflow_data,
            'graph': graph_data
        }
        
        if temp_id_mapping:
            response_data['temp_id_mapping'] = temp_id_mapping
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['put'], url_path='update-graph')
    def update_graph(self, request, workflow_id=None):
        """
        Update workflow graph (nodes and edges).
        Supports create, update, and delete operations.
        
        Request body:
        {
            "nodes": [
                {"id": 1, "name": "Updated", "role": "Admin", "description": "...", ...},
                {"id": "temp-1", "name": "New Node", "role": "User", "design": {"x": 100, "y": 200}},
                {"id": 5, "to_delete": true}
            ],
            "edges": [
                {"id": 1, "from_node": 1, "to_node": 2, "name": "Edge Name"},
                {"id": "temp-e1", "from_node": 1, "to_node": "temp-1"},
                {"id": 10, "to_delete": true}
            ]
        }
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
            with transaction.atomic():
                temp_id_mapping = {}  # Maps temp-ids to actual DB ids
                
                # ===== PROCESS NODES =====
                for node in nodes_data:
                    node_id = node.get('id')
                    to_delete = node.get('to_delete', False)
                    
                    if to_delete:
                        # Delete existing node (cascade delete edges)
                        if not str(node_id).startswith('temp-'):
                            try:
                                step = Steps.objects.get(step_id=int(node_id), workflow_id=workflow_id)
                                step.delete()
                                logger.info(f"✅ Deleted node: {node_id}")
                            except Steps.DoesNotExist:
                                logger.warning(f"⚠️ Node {node_id} not found for deletion")
                    else:
                        # Create or update node
                        if str(node_id).startswith('temp-'):
                            # Create new node
                            role_name = node.get('role')
                            try:
                                role = Roles.objects.get(name=role_name)
                            except Roles.DoesNotExist:
                                return Response(
                                    {'error': f'Role "{role_name}" not found'},
                                    status=status.HTTP_400_BAD_REQUEST
                                )
                            
                            new_step = Steps.objects.create(
                                workflow_id=workflow,
                                role_id=role,
                                name=node.get('name', ''),
                                description=node.get('description', ''),
                                instruction=node.get('instruction', ''),
                                design=node.get('design', {}),
                                order=0
                            )
                            temp_id_mapping[node_id] = new_step.step_id
                            logger.info(f"✅ Created node: {node_id} -> DB ID {new_step.step_id}")
                        else:
                            # Update existing node
                            try:
                                step = Steps.objects.get(step_id=int(node_id), workflow_id=workflow_id)
                                
                                if 'name' in node:
                                    step.name = node['name']
                                if 'description' in node:
                                    step.description = node['description']
                                if 'instruction' in node:
                                    step.instruction = node['instruction']
                                if 'design' in node:
                                    step.design = node['design']
                                if 'role' in node:
                                    try:
                                        role = Roles.objects.get(name=node['role'])
                                        step.role_id = role
                                    except Roles.DoesNotExist:
                                        return Response(
                                            {'error': f'Role "{node["role"]}" not found'},
                                            status=status.HTTP_400_BAD_REQUEST
                                        )
                                
                                step.save()
                                logger.info(f"✅ Updated node: {node_id}")
                            except Steps.DoesNotExist:
                                logger.warning(f"⚠️ Node {node_id} not found for update")
                
                # ===== PROCESS EDGES =====
                for edge in edges_data:
                    edge_id = edge.get('id')
                    from_id = edge.get('from_node')
                    to_id = edge.get('to_node')
                    to_delete = edge.get('to_delete', False)
                    
                    # Resolve temp IDs to actual IDs
                    if str(from_id).startswith('temp-'):
                        from_id = temp_id_mapping.get(from_id, from_id)
                    if str(to_id).startswith('temp-'):
                        to_id = temp_id_mapping.get(to_id, to_id)
                    
                    if to_delete:
                        # Delete existing edge
                        if not str(edge_id).startswith('temp-'):
                            try:
                                transition = StepTransition.objects.get(
                                    transition_id=int(edge_id),
                                    workflow_id=workflow_id
                                )
                                transition.delete()
                                logger.info(f"✅ Deleted edge: {edge_id}")
                            except StepTransition.DoesNotExist:
                                logger.warning(f"⚠️ Edge {edge_id} not found for deletion")
                    else:
                        # Create or update edge
                        if str(edge_id).startswith('temp-'):
                            # Create new edge
                            try:
                                from_step = Steps.objects.get(step_id=int(from_id), workflow_id=workflow_id)
                                to_step = Steps.objects.get(step_id=int(to_id), workflow_id=workflow_id)
                                
                                new_transition = StepTransition.objects.create(
                                    workflow_id=workflow,
                                    from_step_id=from_step,
                                    to_step_id=to_step,
                                    name=edge.get('name', '')
                                )
                                logger.info(f"✅ Created edge: {edge_id} -> DB ID {new_transition.transition_id}")
                            except Steps.DoesNotExist as e:
                                return Response(
                                    {'error': f'Step not found: {str(e)}'},
                                    status=status.HTTP_400_BAD_REQUEST
                                )
                            except ValidationError as e:
                                return Response(
                                    {'error': f'Invalid edge: {str(e)}'},
                                    status=status.HTTP_400_BAD_REQUEST
                                )
                        else:
                            # Update existing edge
                            try:
                                transition = StepTransition.objects.get(
                                    transition_id=int(edge_id),
                                    workflow_id=workflow_id
                                )
                                
                                if 'name' in edge:
                                    transition.name = edge['name']
                                if 'from_node' in edge:
                                    try:
                                        from_step = Steps.objects.get(step_id=int(from_id), workflow_id=workflow_id)
                                        transition.from_step_id = from_step
                                    except Steps.DoesNotExist:
                                        return Response(
                                            {'error': f'From step {from_id} not found'},
                                            status=status.HTTP_400_BAD_REQUEST
                                        )
                                if 'to_node' in edge:
                                    try:
                                        to_step = Steps.objects.get(step_id=int(to_id), workflow_id=workflow_id)
                                        transition.to_step_id = to_step
                                    except Steps.DoesNotExist:
                                        return Response(
                                            {'error': f'To step {to_id} not found'},
                                            status=status.HTTP_400_BAD_REQUEST
                                        )
                                
                                transition.save()
                                logger.info(f"✅ Updated edge: {edge_id}")
                            except StepTransition.DoesNotExist:
                                logger.warning(f"⚠️ Edge {edge_id} not found for update")
                
                # Return updated graph
                return self._get_workflow_graph_response(workflow, temp_id_mapping)
        
        except Exception as e:
            logger.error(f"❌ Error updating workflow graph: {str(e)}")
            return Response(
                {'error': f'Failed to update workflow graph: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _get_workflow_graph_response(self, workflow, temp_id_mapping=None):
        """Helper method to return workflow graph with all nodes and edges"""
        nodes = Steps.objects.filter(workflow_id=workflow.workflow_id)
        edges = StepTransition.objects.filter(workflow_id=workflow.workflow_id)
        
        nodes_data = []
        for node in nodes:
            nodes_data.append({
                'id': node.step_id,
                'name': node.name,
                'role': node.role_id.name if node.role_id else '',
                'description': node.description or '',
                'instruction': node.instruction or '',
                'design': node.design or {}
            })
        
        edges_data = []
        for edge in edges:
            edges_data.append({
                'id': edge.transition_id,
                'from_node': edge.from_step_id.step_id if edge.from_step_id else None,
                'to_node': edge.to_step_id.step_id if edge.to_step_id else None,
                'name': edge.name or ''
            })
        
        response_data = {
            'nodes': nodes_data,
            'edges': edges_data
        }
        
        if temp_id_mapping:
            response_data['temp_id_mapping'] = temp_id_mapping
        
        return Response(response_data, status=status.HTTP_200_OK)
    
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
        
        return self._get_workflow_graph_response(workflow)
    
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
        
        # Get workflow details
        workflow_serializer = WorkflowBasicSerializer(workflow)
        workflow_data = workflow_serializer.data
        
        # Get graph data
        nodes = Steps.objects.filter(workflow_id=workflow_id)
        edges = StepTransition.objects.filter(workflow_id=workflow_id)
        
        nodes_data = []
        for node in nodes:
            # Convert datetime to ISO format string
            created_at = node.created_at
            updated_at = node.updated_at
            if hasattr(created_at, 'isoformat'):
                created_at = created_at.isoformat()
            if hasattr(updated_at, 'isoformat'):
                updated_at = updated_at.isoformat()
            
            nodes_data.append({
                'id': node.step_id,
                'name': node.name,
                'role': node.role_id.name if node.role_id else '',
                'description': node.description or '',
                'instruction': node.instruction or '',
                'design': node.design or {},
                'created_at': created_at,
                'updated_at': updated_at,
            })
        
        edges_data = []
        for edge in edges:
            edges_data.append({
                'id': edge.transition_id,
                'from': edge.from_step_id.step_id if edge.from_step_id else None,
                'to': edge.to_step_id.step_id if edge.to_step_id else None,
                'name': edge.name or ''
            })
        
        graph_data = {
            'nodes': nodes_data,
            'edges': edges_data
        }
        
        # Combine workflow details with graph
        response_data = {
            'workflow': workflow_data,
            'graph': graph_data
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
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
            for field, value in serializer.validated_data.items():
                setattr(workflow, field, value)
            workflow.save()
            
            logger.info(f"✅ Updated workflow: {workflow.name} (ID: {workflow.workflow_id})")
            
            output_serializer = WorkflowBasicSerializer(workflow)
            return Response(output_serializer.data, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"❌ Error updating workflow: {str(e)}")
            return Response(
                {'error': f'Failed to update workflow: {str(e)}'},
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
