"""
Integration Tests for Task State Machine & Transitions
======================================================

Tests the TaskTransitionView and workflow state machine, including:
1. Valid transitions between steps
2. Invalid transitions (skipping steps)
3. Permission checks (user must be assigned to task)
4. TaskItem status updates
5. TaskItemHistory audit trail
6. Round-robin user assignment for next steps

Run with: python manage.py test tests.integration.test_task_transitions
"""

import os
import django

# Setup Django settings before importing models
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'workflow_api.settings')
django.setup()

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from datetime import timedelta
from unittest.mock import patch, MagicMock

# Import all models
from tests.base import BaseTestCase, suppress_request_warnings
from workflow.models import Workflows, WorkflowVersion
from step.models import Steps, StepTransition
from role.models import Roles, RoleUsers
from task.models import Task, TaskItem, TaskItemHistory
from tickets.models import WorkflowTicket
from django.contrib.auth import get_user_model

User = get_user_model()


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
    BROKER_BACKEND='memory'
)
@patch('task.utils.assignment.notify_task.delay', return_value=None)
class TaskTransitionTestCase(BaseTestCase):
    """Test suite for workflow state machine transitions."""
    
    def setUp(self, mock_notify=None):
        """Set up test data for all tests."""
        # Create roles
        self.role_triage = Roles.objects.create(role_id=1, name='Triage Agent', system='tts')
        self.role_support = Roles.objects.create(role_id=2, name='Support Agent', system='tts')
        self.role_senior = Roles.objects.create(role_id=3, name='Senior Agent', system='tts')
        
        # Create users with role assignments
        self.user_triage = RoleUsers.objects.create(
            role_id=self.role_triage,
            user_id=100,
            user_full_name='Triage User',
            is_active=True
        )
        self.user_support = RoleUsers.objects.create(
            role_id=self.role_support,
            user_id=200,
            user_full_name='Support User',
            is_active=True
        )
        self.user_senior = RoleUsers.objects.create(
            role_id=self.role_senior,
            user_id=300,
            user_full_name='Senior User',
            is_active=True
        )
        
        # Create workflow (status='draft' to avoid auto-creating version)
        self.workflow = Workflows.objects.create(
            user_id=1,
            name='IT Support Workflow',
            description='Standard IT support workflow',
            category='IT',
            sub_category='Hardware',
            department='IT',
            status='draft',  # Create as draft first
            low_sla=timedelta(hours=48),
            medium_sla=timedelta(hours=24),
            high_sla=timedelta(hours=8),
            urgent_sla=timedelta(hours=4)
        )
        
        # Create steps
        self.step_triage = Steps.objects.create(
            workflow_id=self.workflow,
            role_id=self.role_triage,
            escalate_to=self.role_senior,
            name='Triage',
            description='Initial triage step',
            order=1,
            weight=Decimal('0.20'),
            is_start=True
        )
        
        self.step_support = Steps.objects.create(
            workflow_id=self.workflow,
            role_id=self.role_support,
            escalate_to=self.role_senior,
            name='In Progress',
            description='Support in progress',
            order=2,
            weight=Decimal('0.60')
        )
        
        self.step_finalize = Steps.objects.create(
            workflow_id=self.workflow,
            role_id=self.role_senior,
            escalate_to=None,
            name='Finalize',
            description='Final review',
            order=3,
            weight=Decimal('0.20'),
            is_end=True
        )
        
        # Create transitions
        self.transition_1to2 = StepTransition.objects.create(
            workflow_id=self.workflow,
            from_step_id=self.step_triage,
            to_step_id=self.step_support,
            name='Move to Support'
        )
        
        self.transition_2to3 = StepTransition.objects.create(
            workflow_id=self.workflow,
            from_step_id=self.step_support,
            to_step_id=self.step_finalize,
            name='Move to Finalize'
        )
        
        # Now initialize the workflow (this will trigger auto-creation of version via signal)
        self.workflow.status = 'initialized'
        self.workflow.save()
        
        # Get the auto-created workflow version
        self.workflow_version = WorkflowVersion.objects.get(workflow=self.workflow, version=1)
        
        # Create ticket
        self.ticket = WorkflowTicket.objects.create(
            ticket_number='TEST-001',
            ticket_data={
                'subject': 'Test Ticket',
                'description': 'Test description',
                'priority': 'Medium',
                'department': 'IT',
                'status': 'Open'
            },
            priority='Medium',
            department='IT'
        )
        
        # Create task
        self.task = Task.objects.create(
            ticket_id=self.ticket,
            workflow_id=self.workflow,
            workflow_version=self.workflow_version,
            current_step=self.step_triage,
            status='pending'
        )
        
        # Create task item for triage user
        self.task_item_triage = TaskItem.objects.create(
            task=self.task,
            role_user=self.user_triage,
            origin='System',
            assigned_on_step=self.step_triage
        )
        
        # Create initial history entry
        TaskItemHistory.objects.create(
            task_item=self.task_item_triage,
            status='new'
        )
        
        # Set up API client
        self.client = APIClient()
        
    def _authenticate_as_user(self, user_id):
        """Helper to create mock user and authenticate"""
        # Create a mock user object with required attributes
        class MockUser:
            def __init__(self, user_id):
                self.user_id = user_id
                self.is_authenticated = True
        
        # Force authentication by directly setting the user
        self.client.force_authenticate(user=MockUser(user_id))
        
    def test_valid_transition_triage_to_support(self, mock_notify):
        """Test valid transition from Triage to In Progress"""
        # Authenticate as triage user
        self._authenticate_as_user(100)
        
        # Perform transition
        response = self.client.post('/transitions/', {
            'task_id': self.task.task_id,
            'transition_id': self.transition_1to2.transition_id,
            'notes': 'Moving to support team'
        }, format='json')
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(response.data['task_id'], self.task.task_id)
        
        # Verify task was updated
        self.task.refresh_from_db()
        self.assertEqual(self.task.current_step.step_id, self.step_support.step_id)
        self.assertEqual(self.task.status, 'pending')
        
        # Verify old TaskItem was marked resolved
        self.task_item_triage.refresh_from_db()
        latest_history = self.task_item_triage.taskitemhistory_set.order_by('-created_at').first()
        self.assertEqual(latest_history.status, 'resolved')
        self.assertIsNotNone(self.task_item_triage.acted_on)
        self.assertEqual(self.task_item_triage.notes, 'Moving to support team')
        
        # Verify new TaskItem was created for support role
        new_task_items = TaskItem.objects.filter(
            task=self.task,
            role_user__role_id=self.role_support
        )
        self.assertTrue(new_task_items.exists())
        
        # Verify new TaskItem has 'new' status in history
        new_item = new_task_items.first()
        new_history = new_item.taskitemhistory_set.order_by('-created_at').first()
        self.assertEqual(new_history.status, 'new')
        
    def test_invalid_transition_skip_steps(self, mock_notify):
        """Test invalid transition attempting to skip steps"""
        # Authenticate as triage user
        self._authenticate_as_user(100)
        
        # Try to transition directly from Triage to Finalize (skipping Support)
        # This should fail because there's no direct transition
        response = self.client.post('/transitions/', {
            'task_id': self.task.task_id,
            'transition_id': self.transition_2to3.transition_id,  # This is Support -> Finalize
            'notes': 'Trying to skip'
        }, format='json')
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('Invalid transition', response.data['error'])
        
        # Verify task state unchanged
        self.task.refresh_from_db()
        self.assertEqual(self.task.current_step.step_id, self.step_triage.step_id)
        
        # Verify TaskItem status unchanged
        latest_history = self.task_item_triage.taskitemhistory_set.order_by('-created_at').first()
        self.assertEqual(latest_history.status, 'new')
        
    def test_permission_check_unauthorized_user(self, mock_notify):
        """Test that user without assignment cannot transition task"""
        # Authenticate as support user who is NOT assigned to this task yet
        self._authenticate_as_user(200)
        
        # Try to transition
        response = self.client.post('/transitions/', {
            'task_id': self.task.task_id,
            'transition_id': self.transition_1to2.transition_id,
            'notes': 'Unauthorized attempt'
        }, format='json')
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertIn('no active', response.data['error'].lower())
        
        # Verify task state unchanged
        self.task.refresh_from_db()
        self.assertEqual(self.task.current_step.step_id, self.step_triage.step_id)
        
    def test_permission_check_user_already_acted(self, mock_notify):
        """Test that user who already acted on task cannot transition again"""
        # Mark the triage user as already resolved
        TaskItemHistory.objects.create(
            task_item=self.task_item_triage,
            status='resolved'
        )
        self.task_item_triage.acted_on = timezone.now()
        self.task_item_triage.save()
        
        # Authenticate as triage user
        self._authenticate_as_user(100)
        
        # Try to transition again
        response = self.client.post('/transitions/', {
            'task_id': self.task.task_id,
            'transition_id': self.transition_1to2.transition_id,
            'notes': 'Trying again'
        }, format='json')
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        
    def test_complete_workflow_sequence(self, mock_notify):
        """Test complete workflow from Triage -> Support -> Finalize"""
        # Step 1: Triage user transitions to Support
        self._authenticate_as_user(100)
        response = self.client.post('/transitions/', {
            'task_id': self.task.task_id,
            'transition_id': self.transition_1to2.transition_id,
            'notes': 'Initial triage complete'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Step 2: Support user transitions to Finalize
        self._authenticate_as_user(200)
        response = self.client.post('/transitions/', {
            'task_id': self.task.task_id,
            'transition_id': self.transition_2to3.transition_id,
            'notes': 'Support work complete'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify task is at Finalize step
        self.task.refresh_from_db()
        self.assertEqual(self.task.current_step.step_id, self.step_finalize.step_id)
        
        # Verify history trail
        all_history = TaskItemHistory.objects.filter(
            task_item__task=self.task
        ).order_by('created_at')
        
        # Should have: new (triage), resolved (triage), new (support), resolved (support), new (finalize)
        self.assertGreaterEqual(all_history.count(), 5)
        
    def test_transition_with_missing_notes(self, mock_notify):
        """Test that transition fails when notes are missing"""
        self._authenticate_as_user(100)
        
        response = self.client.post('/transitions/', {
            'task_id': self.task.task_id,
            'transition_id': self.transition_1to2.transition_id,
            # Missing notes
        }, format='json')
        
        # Should fail validation
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('notes', response.data['error'].lower())
        
    def test_transition_with_empty_notes(self, mock_notify):
        """Test that transition fails when notes are empty"""
        self._authenticate_as_user(100)
        
        response = self.client.post('/transitions/', {
            'task_id': self.task.task_id,
            'transition_id': self.transition_1to2.transition_id,
            'notes': '   '  # Just whitespace
        }, format='json')
        
        # Should fail validation
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        
    def test_transition_nonexistent_task(self, mock_notify):
        """Test transition with nonexistent task ID"""
        self._authenticate_as_user(100)
        
        response = self.client.post('/transitions/', {
            'task_id': 99999,
            'transition_id': self.transition_1to2.transition_id,
            'notes': 'Test'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
    def test_transition_nonexistent_transition(self, mock_notify):
        """Test transition with nonexistent transition ID"""
        self._authenticate_as_user(100)
        
        response = self.client.post('/transitions/', {
            'task_id': self.task.task_id,
            'transition_id': 99999,
            'notes': 'Test'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
    def test_audit_trail_integrity(self, mock_notify):
        """Test that TaskItemHistory maintains complete audit trail"""
        # Initial state: triage user has 'new' status
        initial_history_count = TaskItemHistory.objects.filter(
            task_item=self.task_item_triage
        ).count()
        self.assertEqual(initial_history_count, 1)
        
        # Perform transition
        self._authenticate_as_user(100)
        self.client.post('/transitions/', {
            'task_id': self.task.task_id,
            'transition_id': self.transition_1to2.transition_id,
            'notes': 'Audit test'
        }, format='json')
        
        # Should now have 2 history entries: 'new' and 'resolved'
        final_history_count = TaskItemHistory.objects.filter(
            task_item=self.task_item_triage
        ).count()
        self.assertEqual(final_history_count, 2)
        
        # Verify order and status values
        history_records = TaskItemHistory.objects.filter(
            task_item=self.task_item_triage
        ).order_by('created_at')
        
        self.assertEqual(history_records[0].status, 'new')
        self.assertEqual(history_records[1].status, 'resolved')
        
        # Verify timestamps are sequential
        self.assertLess(
            history_records[0].created_at,
            history_records[1].created_at
        )


class TaskTransitionEdgeCasesTestCase(BaseTestCase):
    """Test edge cases and boundary conditions."""
    
    def setUp(self):
        """Set up minimal test data."""
        self.role = Roles.objects.create(role_id=1, name='Agent', system='tts')
        self.user = RoleUsers.objects.create(
            role_id=self.role,
            user_id=100,
            user_full_name='Test User',
            is_active=True
        )
        
        self.workflow = Workflows.objects.create(
            user_id=1,
            name='Test Workflow',
            description='Test workflow for edge cases',
            category='Test',
            sub_category='Test',
            department='Test',
            status='draft',  # Create as draft first
            low_sla=timedelta(hours=24)
        )
        
        self.step = Steps.objects.create(
            workflow_id=self.workflow,
            role_id=self.role,
            name='Single Step',
            order=1,
            weight=Decimal('1.0')
        )
        
        # Initialize workflow (triggers auto-version creation)
        self.workflow.status = 'initialized'
        self.workflow.save()
        
        # Get the auto-created version
        self.workflow_version = WorkflowVersion.objects.get(workflow=self.workflow, version=1)
        
        self.ticket = WorkflowTicket.objects.create(
            ticket_number='EDGE-001',
            ticket_data={'subject': 'Edge case'},
            priority='Low'
        )
        
        self.task = Task.objects.create(
            ticket_id=self.ticket,
            workflow_id=self.workflow,
            workflow_version=self.workflow_version,
            current_step=self.step,
            status='pending'
        )
        
        self.client = APIClient()
        
    def _authenticate_as_user(self, user_id):
        """Helper to authenticate"""
        class MockUser:
            def __init__(self, user_id):
                self.user_id = user_id
                self.is_authenticated = True
        
        self.client.force_authenticate(user=MockUser(user_id))
        
    def test_task_without_workflow_version(self):
        """Test task without workflow_version reference"""
        # Create task without workflow version
        task_no_version = Task.objects.create(
            ticket_id=self.ticket,
            workflow_id=self.workflow,
            workflow_version=None,  # No version
            current_step=self.step,
            status='pending'
        )
        
        # This should still work - workflow_version is optional
        self.assertIsNone(task_no_version.workflow_version)
        
    def test_task_without_current_step(self):
        """Test task without current_step set"""
        task_no_step = Task.objects.create(
            ticket_id=self.ticket,
            workflow_id=self.workflow,
            workflow_version=self.workflow_version,
            current_step=None,
            status='pending'
        )
        
        task_item = TaskItem.objects.create(
            task=task_no_step,
            role_user=self.user,
            origin='System'
        )
        
        TaskItemHistory.objects.create(
            task_item=task_item,
            status='new'
        )
        
        # Create a transition (will fail because task has no current step)
        transition = StepTransition.objects.create(
            workflow_id=self.workflow,
            from_step_id=self.step,
            to_step_id=None
        )
        
        self._authenticate_as_user(100)
        
        # This should return a 400 Bad Request because the task has no current step
        response = self.client.post('/transitions/', {
            'task_id': task_no_step.task_id,
            'transition_id': transition.transition_id,
            'notes': 'Test'
        }, format='json')
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.data)
        self.assertIn('no current step', response.data['error'].lower())


if __name__ == '__main__':
    import unittest
    unittest.main()
