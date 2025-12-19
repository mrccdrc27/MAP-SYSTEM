"""
Unit Tests for the Tickets Application

This file contains comprehensive unit tests for the core functionalities
of the `tickets` Django application within the Workflow API. It focuses on
verifying the behavior of the `receive_ticket` and `create_task_for_ticket`
Celery tasks, which are central to ticket ingestion and automated workflow
initiation.

Key functionalities tested include:

-   **`receive_ticket` task**:
    -   Correct creation and updating of `WorkflowTicket` instances.
    -   Accurate extraction of `ticket_number` from various input data fields.
    -   Proper triggering of `create_task_for_ticket` only for newly created tickets.
    -   Robust error handling for unexpected input or internal issues.

-   **`create_task_for_ticket` task**:
    -   Identification of matching workflows based on ticket department and category.
    -   Correct retrieval of the initial step of a workflow.
    -   Reliable creation of `Task` instances linked to appropriate `WorkflowTicket` and `WorkflowVersion`.
    -   On-demand creation of `WorkflowVersion` if none is active for a matched workflow.
    -   Correct assignment of ticket owners and initial task users via mocked assignment utilities.
    -   Handling of edge cases such as non-existent tickets, missing workflows, or workflows without steps/users.

The tests utilize Django's `TestCase` for database isolation and `unittest.mock`
for simulating external dependencies (like assignment utilities and workflow
versioning signals) to ensure focused unit testing.

Run with: python manage.py test tests.unit.tickets.test_tickets
"""

import os
from unittest.mock import patch, MagicMock
from datetime import timedelta

import django
from django.utils import timezone
from decimal import Decimal

# Setup Django settings before importing models
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'workflow_api.settings')
django.setup()

# Import models
from tests.base import BaseTestCase
from tickets.models import WorkflowTicket, RoundRobin
from workflow.models import Workflows, WorkflowVersion
from step.models import Steps, StepTransition
from role.models import Roles, RoleUsers
from task.models import Task, TaskItem, TaskItemHistory


class BaseTicketTaskTest(BaseTestCase):
    """
    Base class for setting up common test data and cleanup.
    Mimics the setup in test_workflow_versioning.py
    """

    def setUp(self):
        super().setUp()
        self._cleanup_test_data()
        self._create_roles()
        self._create_role_users()

    def tearDown(self):
        super().tearDown()
        self._cleanup_test_data()

    def _cleanup_test_data(self):
        """Clean up test data to ensure fresh start"""
        # Disconnect signals temporarily to avoid signal handler errors during cleanup
        from django.db.models.signals import post_save, post_delete
        from workflow.signals import update_workflow_status, push_initialized_workflow
        from task.signals import create_step_instance
        
        # Disconnect workflow signals
        post_save.disconnect(update_workflow_status, sender=Steps)
        post_save.disconnect(update_workflow_status, sender=StepTransition)
        post_delete.disconnect(update_workflow_status, sender=Steps)
        post_delete.disconnect(update_workflow_status, sender=StepTransition)
        post_save.disconnect(push_initialized_workflow, sender=Workflows)
        
        # Disconnect task signals
        post_save.disconnect(create_step_instance, sender=Task)
        post_delete.disconnect(create_step_instance, sender=Task)
        
        try:
            TaskItemHistory.objects.all().delete()
            TaskItem.objects.all().delete()
            Task.objects.all().delete()
            WorkflowTicket.objects.all().delete()
            RoundRobin.objects.all().delete()
            StepTransition.objects.all().delete()
            Steps.objects.all().delete()
            WorkflowVersion.objects.all().delete()
            Workflows.objects.all().delete()
            RoleUsers.objects.all().delete()
            Roles.objects.all().delete()
        finally:
            # Reconnect signals
            post_save.connect(update_workflow_status, sender=Steps)
            post_save.connect(update_workflow_status, sender=StepTransition)
            post_delete.connect(update_workflow_status, sender=Steps)
            post_delete.connect(update_workflow_status, sender=StepTransition)
            post_save.connect(push_initialized_workflow, sender=Workflows)
            post_save.connect(create_step_instance, sender=Task)
            post_delete.connect(create_step_instance, sender=Task)


    def _create_roles(self):
        self.roles = {}
        role_definitions = [
            {'role_id': 1, 'name': 'Ticket Coordinator', 'system': 'tts'},
            {'role_id': 2, 'name': 'Technical Support', 'system': 'tts'},
            {'role_id': 3, 'name': 'Level 2 Support', 'system': 'tts'},
            {'role_id': 4, 'name': 'Manager', 'system': 'tts'},
        ]
        for role_def in role_definitions:
            role, _ = Roles.objects.get_or_create(
                role_id=role_def['role_id'],
                defaults={'name': role_def['name'], 'system': role_def['system']}
            )
            self.roles[role_def['name']] = role

    def _create_role_users(self):
        self.role_users = []
        user_assignments = [
            {'user_id': 101, 'role_name': 'Ticket Coordinator', 'full_name': 'John Coordinator'},
            {'user_id': 102, 'role_name': 'Technical Support', 'full_name': 'Alice Tech'},
            {'user_id': 103, 'role_name': 'Technical Support', 'full_name': 'Bob Tech'},
        ]
        for assignment in user_assignments:
            role = self.roles[assignment['role_name']]
            role_user, _ = RoleUsers.objects.get_or_create(
                user_id=assignment['user_id'],
                role_id=role,
                defaults={
                    'user_full_name': assignment['full_name'],
                    'is_active': True
                }
            )
            self.role_users.append(role_user)

    def _create_workflow_with_steps(self, name, category, department, sub_category='Default Subcategory', auto_initialize=True):
        workflow = Workflows.objects.create(
            user_id=1,
            name=name,
            description=f"Test workflow: {name}",
            category=category,
            sub_category=sub_category,
            department=department,
            status='draft',
            is_published=False,
            low_sla=timedelta(hours=72),
            medium_sla=timedelta(hours=48),
            high_sla=timedelta(hours=24),
            urgent_sla=timedelta(hours=8),
        )

        steps_config = [
            {'name': 'Initial Review', 'role': 'Ticket Coordinator', 'order': 1, 'is_start': True, 'is_end': False},
            {'name': 'Technical Analysis', 'role': 'Technical Support', 'order': 2, 'is_start': False, 'is_end': True},
        ]
        steps = []
        for config in steps_config:
            step = Steps.objects.create(
                workflow_id=workflow,
                role_id=self.roles[config['role']],
                name=config['name'],
                description=f"Step: {config['name']}",
                order=config['order'],
                weight=Decimal('0.5'),
                is_start=config.get('is_start', False) if auto_initialize else False,
                is_end=config.get('is_end', False) if auto_initialize else False,
            )
            steps.append(step)

        for i in range(len(steps) - 1):
            StepTransition.objects.create(
                workflow_id=workflow,
                from_step_id=steps[i],
                to_step_id=steps[i + 1],
                name=f"To {steps[i + 1].name}"
            )
        
        # Manually ensure workflow is initialized and has a version for testing
        workflow.status = 'initialized'
        workflow.is_published = True
        workflow.save() # This should trigger the push_initialized_workflow signal

        # Fetch the WorkflowVersion created by the signal
        workflow_version = WorkflowVersion.objects.filter(
            workflow=workflow,
            is_active=True
        ).order_by('-version').first()
        
        return workflow, steps, workflow_version


class ReceiveTicketTests(BaseTicketTaskTest):
    """Tests for the receive_ticket Celery task."""

    @patch('tickets.tasks.create_task_for_ticket')
    def test_receive_ticket_creation(self, mock_create_task_for_ticket):
        """Test that receive_ticket creates a new WorkflowTicket and calls create_task_for_ticket."""
        from tickets.tasks import receive_ticket
        ticket_data = {
            'ticket_number': 'TICKET-001',
            'subject': 'New Ticket Subject',
            'description': 'Description for new ticket',
            'priority': 'High',
            'status': 'Open',
            'department': 'IT',
            'category': 'Hardware'
        }

        response = receive_ticket(ticket_data)

        self.assertEqual(response['status'], 'success')
        self.assertEqual(response['action'], 'created')
        self.assertEqual(response['ticket_number'], 'TICKET-001')

        ticket = WorkflowTicket.objects.get(ticket_number='TICKET-001')
        self.assertEqual(ticket.priority, 'High')
        self.assertEqual(ticket.status, 'Open')
        self.assertEqual(ticket.ticket_data['subject'], 'New Ticket Subject')

        # Verify create_task_for_ticket was called for a new ticket
        mock_create_task_for_ticket.assert_called_once_with(ticket.id)

    @patch('tickets.tasks.create_task_for_ticket')
    def test_receive_ticket_update(self, mock_create_task_for_ticket):
        """Test that receive_ticket updates an existing WorkflowTicket and does NOT call create_task_for_ticket."""
        from tickets.tasks import receive_ticket
        # First create a ticket
        initial_ticket_data = {
            'ticket_number': 'TICKET-002',
            'subject': 'Initial Subject',
            'priority': 'Medium',
            'status': 'Open',
            'department': 'HR',
            'category': 'Onboarding'
        }
        receive_ticket(initial_ticket_data) # This will call create_task_for_ticket internally

        # Now update it
        updated_ticket_data = {
            'ticket_number': 'TICKET-002',
            'subject': 'Updated Subject',
            'priority': 'Low',
            'status': 'Closed',
            'department': 'HR',
            'category': 'Onboarding'
        }

        # Reset mock call count before the update call
        mock_create_task_for_ticket.reset_mock()
        response = receive_ticket(updated_ticket_data)

        self.assertEqual(response['status'], 'success')
        self.assertEqual(response['action'], 'updated')
        self.assertEqual(response['ticket_number'], 'TICKET-002')

        ticket = WorkflowTicket.objects.get(ticket_number='TICKET-002')
        self.assertEqual(ticket.priority, 'Low')
        self.assertEqual(ticket.status, 'Closed')
        self.assertEqual(ticket.ticket_data['subject'], 'Updated Subject')

        # Verify create_task_for_ticket was NOT called for an update
        mock_create_task_for_ticket.assert_not_called()

    @patch('tickets.tasks.create_task_for_ticket')
    def test_receive_ticket_different_ticket_id_fields(self, mock_create_task_for_ticket):
        """Test that receive_ticket correctly extracts ticket_number from different fields."""
        from tickets.tasks import receive_ticket
        test_cases = [
            ({'id': 'TICKET-ID-003', 'subject': 'Test ID'}, 'TICKET-ID-003'),
            ({'ticket_id': 'TICKET-TID-004', 'subject': 'Test Ticket_ID'}, 'TICKET-TID-004'),
            ({'original_ticket_id': 'TICKET-OID-005', 'subject': 'Test Original_Ticket_ID'}, 'TICKET-OID-005'),
            ({'ticket_number': 'TICKET-NUM-006', 'subject': 'Test Ticket_Number'}, 'TICKET-NUM-006'),
        ]

        for i, (data, expected_ticket_number) in enumerate(test_cases):
            with self.subTest(f"Case {i+1}: {expected_ticket_number}"):
                data.update({'priority': 'Medium', 'status': 'Open', 'department': 'IT', 'category': 'General'})
                mock_create_task_for_ticket.reset_mock() # Reset for each subtest
                response = receive_ticket(data)
                
                self.assertEqual(response['status'], 'success')
                self.assertEqual(response['action'], 'created')
                self.assertEqual(response['ticket_number'], expected_ticket_number)
                
                ticket = WorkflowTicket.objects.get(ticket_number=expected_ticket_number)
                self.assertEqual(ticket.ticket_data['ticket_number'], expected_ticket_number)
                mock_create_task_for_ticket.assert_called_once() # Should be called for new tickets

    def test_receive_ticket_error_handling(self):
        """Test receive_ticket handles internal exceptions gracefully."""
        from tickets.tasks import receive_ticket
        # Simulate an error by passing bad data that causes model validation to fail if not handled
        # Or, patch a dependency to raise an exception
        with patch('tickets.models.WorkflowTicket.objects.update_or_create') as mock_update_or_create:
            mock_update_or_create.side_effect = Exception("Database error simulation")
            ticket_data = {
                'ticket_number': 'ERROR-001',
                'subject': 'Error Test',
                'priority': 'Low',
                'status': 'Open',
                'department': 'IT',
                'category': 'Software'
            }
            response = receive_ticket(ticket_data)
            self.assertEqual(response['status'], 'error')
            self.assertEqual(response['type'], 'exception')
            self.assertIn('Database error simulation', response['error'])
            self.assertIn('trace', response)


class CreateTaskForTicketTests(BaseTicketTaskTest):
    """Tests for the create_task_for_ticket Celery task."""

    def setUp(self):
        super().setUp()
        self.workflow, self.steps, self.workflow_version = self._create_workflow_with_steps(
            name='IT Support Workflow',
            department='IT',
            category='Hardware',
            sub_category='Laptop Repair' # Provide a specific sub_category
        )
        self.ticket = WorkflowTicket.objects.create(
            ticket_number='TKT-123',
            ticket_data={'subject': 'Laptop Issue', 'department': 'IT', 'category': 'Hardware', 'sub_category': 'Laptop Repair', 'priority': 'High'},
            priority='High',
            status='Open',
            department='IT'
        )
        self.first_step = self.steps[0]


    @patch('task.utils.assignment.assign_users_for_step')
    @patch('task.utils.assignment.assign_ticket_owner')
    def test_create_task_for_ticket_success(self, mock_assign_ticket_owner, mock_assign_users_for_step):
        """Test successful creation of a Task for a valid ticket and workflow."""
        from tickets.tasks import create_task_for_ticket

        # Mock the assignment functions
        mock_assign_ticket_owner.return_value = self.role_users[0] # John Coordinator
        mock_assign_users_for_step.return_value = [
            MagicMock(role_user=self.role_users[0], to_dict=lambda: {'user_id': self.role_users[0].user_id, 'role': 'Ticket Coordinator'})
        ]

        response = create_task_for_ticket(self.ticket.id)

        self.assertEqual(response['status'], 'success')
        self.assertIsNotNone(response['task_id'])
        self.assertEqual(response['workflow'], 'IT Support Workflow')
        self.assertEqual(response['step'], 'Initial Review')

        task = Task.objects.get(task_id=response['task_id']) # RE-INSERTED LINE

        self.assertEqual(task.ticket_id, self.ticket)
        self.assertEqual(task.workflow_id, self.workflow)
        # In this test, we expect the workflow_version to be created by the signal handler
        self.assertIsNotNone(task.workflow_version) 
        self.assertEqual(task.current_step, self.first_step)
        self.assertEqual(task.status, 'pending')

        mock_assign_ticket_owner.assert_called_once_with(task)
        mock_assign_users_for_step.assert_called_once_with(task, self.first_step, self.first_step.role_id.name)

    def test_create_task_for_ticket_not_found(self):
        """Test create_task_for_ticket handles non-existent ticket_id."""
        from tickets.tasks import create_task_for_ticket
        response = create_task_for_ticket(99999)  # Non-existent ID
        self.assertEqual(response['status'], 'error')
        self.assertIn('Ticket 99999 not found', response['message'])

    @patch('tickets.tasks.find_matching_workflow', return_value=None)
    def test_create_task_for_ticket_no_matching_workflow(self, mock_find_matching_workflow):
        """Test create_task_for_ticket when no workflow matches the ticket."""
        from tickets.tasks import create_task_for_ticket
        response = create_task_for_ticket(self.ticket.id)
        self.assertEqual(response['status'], 'error')
        self.assertEqual(response['message'], 'No matching workflow found')
        mock_find_matching_workflow.assert_called_once_with(
            self.ticket.ticket_data['department'],
            self.ticket.ticket_data['category'],
            self.ticket.ticket_data.get('sub_category') # FIX: Expect dynamic sub_category
        )
    
    @patch('tickets.tasks.find_matching_workflow')
    def test_create_task_for_ticket_no_steps_in_workflow(self, mock_find_matching_workflow):
        """Test create_task_for_ticket when the matched workflow has no steps."""
        from tickets.tasks import create_task_for_ticket
        # Create a workflow without steps
        workflow_no_steps = Workflows.objects.create(
            user_id=1, name='No Step Workflow', department='IT', category='Software',
            status='draft', is_published=False, # Create as draft first
            description='No Step Workflow Description',
            sub_category='No Subcategory'
        )
        # Manually create an empty WorkflowVersion
        WorkflowVersion.objects.create(
            workflow=workflow_no_steps,
            version=1,
            definition={'nodes': [], 'edges': [], 'metadata': {'workflow_name': workflow_no_steps.name}},
            is_active=True
        )
        # Now set it to initialized and published
        workflow_no_steps.status = 'initialized'
        workflow_no_steps.is_published = True
        workflow_no_steps.save() # This save should not trigger a new version if it already has one.

        mock_find_matching_workflow.return_value = workflow_no_steps

        response = create_task_for_ticket(self.ticket.id)
        self.assertEqual(response['status'], 'error')
        self.assertEqual(response['message'], 'No steps found in workflow')

    @patch('task.utils.assignment.assign_users_for_step', return_value=[])
    @patch('task.utils.assignment.assign_ticket_owner')
    def test_create_task_for_ticket_no_users_for_role(self, mock_assign_ticket_owner, mock_assign_users_for_step):
        """Test create_task_for_ticket when no users are found for the first step's role."""
        from tickets.tasks import create_task_for_ticket
        mock_assign_ticket_owner.return_value = self.role_users[0] # Still assign ticket owner
        response = create_task_for_ticket(self.ticket.id)
        self.assertEqual(response['status'], 'error')
        self.assertEqual(response['message'], 'No users found for role')
        # Task should still be created even if no step users are assigned
        self.assertEqual(Task.objects.count(), 1)
        # ticket.is_task_allocated should NOT be true if no users for step
        self.ticket.refresh_from_db()
        self.assertFalse(self.ticket.is_task_allocated)

    @patch('workflow.models.WorkflowVersion.objects.filter')
    @patch('workflow.signals.create_workflow_version')
    @patch('task.utils.assignment.assign_users_for_step')
    @patch('task.utils.assignment.assign_ticket_owner')
    def test_create_task_for_ticket_on_demand_version_creation(self, mock_assign_ticket_owner, mock_assign_users_for_step, mock_create_workflow_version, mock_workflow_version_filter):
        """Test that a workflow version is created on-demand if none exists."""
        from tickets.tasks import create_task_for_ticket

        # Simulate no active workflow version initially
        mock_workflow_version_filter.return_value.order_by.return_value.first.side_effect = [
            None,  # First call: no version
            self.workflow_version  # Second call after create_workflow_version
        ]

        mock_assign_ticket_owner.return_value = self.role_users[0]
        mock_assign_users_for_step.return_value = [
            MagicMock(role_user=self.role_users[0], to_dict=lambda: {'user_id': self.role_users[0].user_id, 'role': 'Ticket Coordinator'})
        ]

        response = create_task_for_ticket(self.ticket.id)

        self.assertEqual(response['status'], 'success')
        mock_create_workflow_version.assert_called_once_with(self.workflow)
        
        # Verify that task was created with the newly available workflow_version
        task = Task.objects.get(task_id=response['task_id'])
        self.assertEqual(task.workflow_version, self.workflow_version)

    def test_create_task_for_ticket_general_exception_handling(self):
        """Test create_task_for_ticket handles general exceptions."""
        from tickets.tasks import create_task_for_ticket
        
        with patch('tickets.tasks.find_matching_workflow') as mock_find_matching_workflow:
            mock_find_matching_workflow.side_effect = Exception("Workflow matching error")
            response = create_task_for_ticket(self.ticket.id)
            
            self.assertEqual(response['status'], 'error')
            self.assertEqual(response['message'], 'Workflow matching error')