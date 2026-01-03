from django.db import transaction
from django.core.exceptions import ValidationError
from copy import deepcopy
import logging

from audit.utils import log_action
from .models import Workflows
from step.models import Steps, StepTransition
from role.models import Roles
from .utils import apply_edge_handles_to_transitions, calculate_default_node_design

logger = logging.getLogger(__name__)

class WorkflowGraphService:
    """
    Service for managing workflow graphs (nodes and edges).
    Handles validation, creation, updates, and retrieval of graph structures.
    """

    @staticmethod
    def create_workflow_with_graph(user, workflow_data, graph_data, request=None):
        """
        Creates a workflow and its associated graph (nodes and edges).
        
        Args:
            user: The user creating the workflow.
            workflow_data: Dictionary containing workflow fields.
            graph_data: Dictionary containing 'nodes' and 'edges' lists.
            request: Optional request object for logging.
            
        Returns:
            tuple: (workflow instance, temp_id_mapping dictionary)
        """
        try:
            with transaction.atomic():
                # Create workflow
                workflow = Workflows.objects.create(
                    user_id=user.id if hasattr(user, 'id') else 1,
                    name=workflow_data['name'],
                    description=workflow_data.get('description', ''),
                    category=workflow_data['category'],
                    sub_category=workflow_data['sub_category'],
                    department=workflow_data['department'],
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
                    for idx, node in enumerate(nodes_data):
                        node_id = node.get('id')
                        if not node.get('to_delete', False):
                            role_name = node.get('role')
                            role = Roles.objects.get(name=role_name)
                            
                            # Handle escalate_to role
                            escalate_to_role = None
                            escalate_to_name = node.get('escalate_to')
                            if escalate_to_name:
                                try:
                                    escalate_to_role = Roles.objects.get(name=escalate_to_name)
                                except Roles.DoesNotExist:
                                    logger.warning(f"Escalate to role '{escalate_to_name}' not found, setting to None")
                            
                            new_step = Steps.objects.create(
                                workflow_id=workflow,
                                role_id=role,
                                escalate_to=escalate_to_role,
                                name=node.get('name', ''),
                                description=node.get('description', ''),
                                instruction=node.get('instruction', ''),
                                weight=node.get('weight', 0.5),
                                design=node.get('design', {}),
                                order=idx,
                                is_start=node.get('is_start', False),
                                is_end=node.get('is_end', False)
                            )
                            temp_id_mapping[node_id] = new_step.step_id
                            logger.info(f"✅ Created node: {node_id} -> DB ID {new_step.step_id}")
                    
                    # Create all edges
                    for edge in edges_data:
                        edge_id = edge.get('id')
                        if not edge.get('to_delete', False):
                            from_id = edge.get('from')
                            to_id = edge.get('to')
                            
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
                
                # Log audit event
                try:
                    log_action(user, 'create_workflow', target=workflow, request=request)
                except Exception as e:
                    logger.error(f"Failed to log audit for create_workflow: {e}")
                
                return workflow, temp_id_mapping
                
        except Roles.DoesNotExist as e:
            logger.error(f"❌ Role not found: {str(e)}")
            raise ValidationError(f'Role not found: {str(e)}')
        except Exception as e:
            # If it's already a ValidationError, re-raise it, otherwise wrap it
            if isinstance(e, ValidationError):
                raise e
            logger.error(f"❌ Error creating workflow with graph: {str(e)}")
            raise ValidationError(f'Failed to create workflow: {str(e)}')

    @staticmethod
    def update_workflow_graph(user, workflow, nodes_data, edges_data, request=None):
        """
        Updates the graph (nodes and edges) of an existing workflow.
        
        Args:
            user: The user performing the update.
            workflow: The workflow instance to update.
            nodes_data: List of node dictionaries.
            edges_data: List of edge dictionaries.
            request: Optional request object for logging.
            
        Returns:
            dict: Changes summary for audit logging.
        """
        try:
            # Track changes for audit logging
            graph_changes = {
                'nodes_added': 0,
                'nodes_updated': 0,
                'nodes_deleted': 0,
                'edges_added': 0,
                'edges_updated': 0,
                'edges_deleted': 0,
            }
            
            with transaction.atomic():
                temp_id_mapping = {}  # Maps temp-ids to actual DB ids
                workflow_id = workflow.workflow_id
                
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
                                graph_changes['nodes_deleted'] += 1
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
                                raise ValidationError(f'Role "{role_name}" not found')
                            
                            # Handle escalate_to role
                            escalate_to_role = None
                            escalate_to_name = node.get('escalate_to')
                            if escalate_to_name:
                                try:
                                    escalate_to_role = Roles.objects.get(name=escalate_to_name)
                                except Roles.DoesNotExist:
                                    logger.warning(f"Escalate to role '{escalate_to_name}' not found, setting to None")
                            
                            new_step = Steps.objects.create(
                                workflow_id=workflow,
                                role_id=role,
                                escalate_to=escalate_to_role,
                                name=node.get('name', ''),
                                description=node.get('description', ''),
                                instruction=node.get('instruction', ''),
                                weight=node.get('weight', 0.5),
                                design=node.get('design', {}),
                                order=0,
                                is_start=node.get('is_start', False),
                                is_end=node.get('is_end', False)
                            )
                            graph_changes['nodes_added'] += 1
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
                                if 'weight' in node:
                                    step.weight = node['weight']
                                if 'design' in node:
                                    step.design = node['design']
                                if 'is_start' in node:
                                    step.is_start = node['is_start']
                                if 'is_end' in node:
                                    step.is_end = node['is_end']
                                if 'role' in node:
                                    try:
                                        role = Roles.objects.get(name=node['role'])
                                        step.role_id = role
                                    except Roles.DoesNotExist:
                                        raise ValidationError(f'Role "{node["role"]}" not found')
                                if 'escalate_to' in node:
                                    if node['escalate_to']:
                                        try:
                                            escalate_role = Roles.objects.get(name=node['escalate_to'])
                                            step.escalate_to = escalate_role
                                        except Roles.DoesNotExist:
                                            logger.warning(f"Escalate to role '{node['escalate_to']}' not found")
                                            step.escalate_to = None
                                    else:
                                        step.escalate_to = None
                                
                                step.save()
                                logger.info(f"✅ Updated node: {node_id}")
                                graph_changes['nodes_updated'] += 1
                            except Steps.DoesNotExist:
                                logger.warning(f"⚠️ Node {node_id} not found for update")
                
                # ===== PROCESS EDGES =====
                for edge in edges_data:
                    edge_id = edge.get('id')
                    from_id = edge.get('from')
                    to_id = edge.get('to')
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
                                graph_changes['edges_deleted'] += 1
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
                                graph_changes['edges_added'] += 1
                            except Steps.DoesNotExist as e:
                                raise ValidationError(f'Step not found: {str(e)}')
                        else:
                            # Update existing edge
                            try:
                                transition = StepTransition.objects.get(
                                    transition_id=int(edge_id),
                                    workflow_id=workflow_id
                                )
                                
                                if 'name' in edge:
                                    transition.name = edge['name']
                                if 'from' in edge:
                                    try:
                                        from_step = Steps.objects.get(step_id=int(from_id), workflow_id=workflow_id)
                                        transition.from_step_id = from_step
                                    except Steps.DoesNotExist:
                                        raise ValidationError(f'From step {from_id} not found')
                                if 'to' in edge:
                                    try:
                                        to_step = Steps.objects.get(step_id=int(to_id), workflow_id=workflow_id)
                                        transition.to_step_id = to_step
                                    except Steps.DoesNotExist:
                                        raise ValidationError(f'To step {to_id} not found')
                                
                                transition.save()
                                logger.info(f"✅ Updated edge: {edge_id}")
                                graph_changes['edges_updated'] += 1
                            except StepTransition.DoesNotExist:
                                logger.warning(f"⚠️ Edge {edge_id} not found for update")
                
                # Log updates if any
                if any(graph_changes.values()):
                    try:
                        log_action(
                            user, 
                            'update_workflow', 
                            target=workflow, 
                            changes=graph_changes, 
                            request=request
                        )
                    except Exception as e:
                        logger.error(f"Failed to log audit for update_workflow: {e}")
                
                return graph_changes, temp_id_mapping

        except Exception as e:
            if isinstance(e, ValidationError):
                raise e
            logger.error(f"❌ Error updating workflow graph: {str(e)}")
            raise ValidationError(f'Failed to update workflow graph: {str(e)}')

    @staticmethod
    def build_graph_data(workflow_id, temp_id_mapping=None):
        """
        Builds the graph data (nodes and edges) for a given workflow.
        
        Args:
            workflow_id: ID of the workflow.
            temp_id_mapping: Optional mapping of temp IDs to real IDs to include in response.
            
        Returns:
            dict: Dictionary with 'nodes', 'edges', and optionally 'temp_id_mapping'.
        """
        nodes = Steps.objects.filter(workflow_id=workflow_id)
        edges = StepTransition.objects.filter(workflow_id=workflow_id)
        
        # Get total step count for design calculations
        total_steps = nodes.count()
        
        nodes_data = []
        for node in nodes:
            # Convert datetime to ISO format string
            created_at = node.created_at
            updated_at = node.updated_at
            if hasattr(created_at, 'isoformat'):
                created_at = created_at.isoformat()
            if hasattr(updated_at, 'isoformat'):
                updated_at = updated_at.isoformat()
            
            # Use existing design or calculate default if missing
            design = node.design if node.design else {}
            if not design or (not design.get('x') and not design.get('y')):
                # Calculate default design based on step order and total steps
                # node.order is 1-indexed, so convert to 0-indexed for calculation
                design = calculate_default_node_design(
                    step_order=node.order - 1 if node.order > 0 else 0,
                    total_steps=total_steps
                )
            
            nodes_data.append({
                'id': node.step_id,
                'name': node.name,
                'role': node.role_id.name if node.role_id else '',
                'description': node.description or '',
                'instruction': node.instruction or '',
                'design': design,
                'created_at': created_at,
                'updated_at': updated_at,
                'is_start': node.is_start,
                'is_end': node.is_end,
            })
        
        # Use utility function to calculate and apply handles to edges
        edges_data = apply_edge_handles_to_transitions(edges, workflow_id)
        
        graph_data = {
            'nodes': nodes_data,
            'edges': edges_data
        }
        
        if temp_id_mapping:
            graph_data['temp_id_mapping'] = temp_id_mapping
            
        return graph_data
