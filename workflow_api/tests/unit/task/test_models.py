"""
Unit tests for Task model functionality.
Tests basic model operations and state management.

Run with: python manage.py test tests.unit.task.test_models
"""
from django.utils import timezone
from datetime import timedelta

from tests.base import BaseTestCase
from task.models import Task, TaskItem, TaskItemHistory, TASK_STATUS_CHOICES, TASK_ITEM_STATUS_CHOICES
from workflow.models import Workflows
from step.models import Steps, StepTransition
from role.models import Roles, RoleUsers
from tickets.models import WorkflowTicket


class TaskModelTests(BaseTestCase):
    """Test Task model creation, updates, and status transitions"""

    def setUp(self):
        """Set up test fixtures"""
        # Create a role
        self.role = Roles.objects.create(
            role_id=1,
            name="Support Agent",
            system="tts"
        )
        
        # Create escalation role
        self.escalation_role = Roles.objects.create(
            role_id=2,
            name="Manager",
            system="tts"
        )
        
        # Create workflow with SLAs
        self.workflow = Workflows.objects.create(
            user_id=1,
            name="Default Support Workflow",
            description="Test workflow",
            workflow_id=1,
            category="Support",
            sub_category="General",
            department="IT",
            status="deployed",
            is_published=True,
            low_sla=timedelta(hours=24),
            medium_sla=timedelta(hours=12),
            high_sla=timedelta(hours=4),
            urgent_sla=timedelta(hours=1),
        )
        
        # Create steps
        self.step_1 = Steps.objects.create(
            step_id=1,
            workflow_id=self.workflow,
            role_id=self.role,
            escalate_to=self.escalation_role,
            name="Initial Assessment",
            description="Assess the ticket",
            order=1,
            weight=0.3,
            is_initialized=True,
            is_start=True,
        )
        
        self.step_2 = Steps.objects.create(
            step_id=2,
            workflow_id=self.workflow,
            role_id=self.role,
            escalate_to=self.escalation_role,
            name="Resolution",
            description="Resolve the ticket",
            order=2,
            weight=0.5,
            is_initialized=True,
        )
        
        self.step_3 = Steps.objects.create(
            step_id=3,
            workflow_id=self.workflow,
            role_id=self.escalation_role,
            escalate_to=None,
            name="Final Review",
            description="Final review",
            order=3,
            weight=0.2,
            is_initialized=True,
            is_end=True,
        )
        
        # Create step transitions
        StepTransition.objects.create(
            workflow_id=self.workflow,
            from_step_id=self.step_1,
            to_step_id=self.step_2,
            name="To Resolution"
        )
        StepTransition.objects.create(
            workflow_id=self.workflow,
            from_step_id=self.step_2,
            to_step_id=self.step_3,
            name="To Review"
        )
        
        # Create test ticket
        self.ticket = WorkflowTicket.objects.create(
            ticket_number="TICKET-001",
            original_ticket_id="TSK-001",
            department="IT",
            priority="High",
            ticket_data={
                "title": "Test Issue",
                "description": "Test Description",
                "priority": "High",
                "department": "IT",
            }
        )
        
        # Create a test user in the role
        self.role_user = RoleUsers.objects.create(
            role_id=self.role,
            user_id=1,
            user_full_name="John Doe",
            is_active=True
        )

    def test_task_creation(self):
        """Test basic task creation"""
        task = Task.objects.create(
            ticket_id=self.ticket,
            workflow_id=self.workflow,
            current_step=self.step_1,
            status='pending'
        )
        
        self.assertEqual(task.ticket_id, self.ticket)
        self.assertEqual(task.workflow_id, self.workflow)
        self.assertEqual(task.current_step, self.step_1)
        self.assertEqual(task.status, 'pending')
        self.assertIsNotNone(task.created_at)
        self.assertIsNotNone(task.updated_at)

    def test_task_status_choices(self):
        """Test that task respects status choices"""
        task = Task.objects.create(
            ticket_id=self.ticket,
            workflow_id=self.workflow,
            current_step=self.step_1,
            status='in progress'
        )
        self.assertEqual(task.status, 'in progress')
        
        task.status = 'completed'
        task.save()
        task.refresh_from_db()
        self.assertEqual(task.status, 'completed')

    def test_task_target_resolution_calculation(self):
        """Test that target_resolution is set and can be updated"""
        now = timezone.now()
        target_time = now + timedelta(hours=4)
        
        task = Task.objects.create(
            ticket_id=self.ticket,
            workflow_id=self.workflow,
            current_step=self.step_1,
            status='in progress',
            target_resolution=target_time
        )
        
        self.assertIsNotNone(task.target_resolution)
        self.assertGreater(task.target_resolution, now)

    def test_task_ticket_owner_assignment(self):
        """Test that ticket owner can be assigned"""
        task = Task.objects.create(
            ticket_id=self.ticket,
            workflow_id=self.workflow,
            current_step=self.step_1,
            ticket_owner=self.role_user,
            status='pending'
        )
        
        self.assertEqual(task.ticket_owner, self.role_user)
        self.assertEqual(task.ticket_owner.user_id, 1)

    def test_task_get_assigned_users(self):
        """Test retrieving assigned users from task"""
        task = Task.objects.create(
            ticket_id=self.ticket,
            workflow_id=self.workflow,
            current_step=self.step_1,
        )
        
        # Create task items with assignments
        TaskItem.objects.create(
            task=task,
            role_user=self.role_user,
            origin='System'
        )
        
        user_ids = task.get_assigned_user_ids()
        self.assertIn(1, user_ids)

    def test_task_completion_workflow(self):
        """Test complete task lifecycle from creation to completion"""
        task = Task.objects.create(
            ticket_id=self.ticket,
            workflow_id=self.workflow,
            current_step=self.step_1,
            status='pending'
        )
        
        # Move to in progress
        task.status = 'in progress'
        task.save()
        self.assertEqual(task.status, 'in progress')
        
        # Complete
        now = timezone.now()
        task.status = 'completed'
        task.resolution_time = now
        task.save()
        
        task.refresh_from_db()
        self.assertEqual(task.status, 'completed')
        self.assertIsNotNone(task.resolution_time)


class TaskItemModelTests(BaseTestCase):
    """Test TaskItem model for user assignments"""

    def setUp(self):
        """Set up test fixtures"""
        self.role = Roles.objects.create(
            role_id=1,
            name="Support Agent",
            system="tts"
        )
        
        self.escalation_role = Roles.objects.create(
            role_id=2,
            name="Manager",
            system="tts"
        )
        
        self.workflow = Workflows.objects.create(
            user_id=1,
            name="Test Workflow",
            description="Test workflow for task items",
            workflow_id=1,
            category="Support",
            sub_category="General",
            department="IT",
            status="deployed",
            is_published=True,
            low_sla=timedelta(hours=24),
            medium_sla=timedelta(hours=12),
            high_sla=timedelta(hours=4),
            urgent_sla=timedelta(hours=1),
        )
        
        self.step = Steps.objects.create(
            step_id=1,
            workflow_id=self.workflow,
            role_id=self.role,
            escalate_to=self.escalation_role,
            name="Assessment",
            description="Task assessment step",
            order=1,
            weight=1.0,
            is_initialized=True,
            is_end=True,
        )
        
        # Create transition
        StepTransition.objects.create(
            workflow_id=self.workflow,
            from_step_id=self.step,
            to_step_id=None,
            name="Complete"
        )
        
        self.ticket = WorkflowTicket.objects.create(
            ticket_number="TICKET-001",
            ticket_data={}
        )
        
        self.task = Task.objects.create(
            ticket_id=self.ticket,
            workflow_id=self.workflow,
            current_step=self.step,
        )
        
        self.role_user = RoleUsers.objects.create(
            role_id=self.role,
            user_id=1,
            user_full_name="Jane Smith",
            is_active=True
        )

    def test_task_item_creation(self):
        """Test TaskItem creation and assignment"""
        task_item = TaskItem.objects.create(
            task=self.task,
            role_user=self.role_user,
            origin='System'
        )
        
        self.assertEqual(task_item.task, self.task)
        self.assertEqual(task_item.role_user, self.role_user)
        self.assertEqual(task_item.origin, 'System')

    def test_task_item_status_transitions(self):
        """Test TaskItem status transitions"""
        task_item = TaskItem.objects.create(
            task=self.task,
            role_user=self.role_user,
            origin='System'
        )
        
        # Create history records to track transitions
        history1 = TaskItemHistory.objects.create(
            task_item=task_item,
            status='in progress'
        )
        
        history2 = TaskItemHistory.objects.create(
            task_item=task_item,
            status='resolved'
        )
        
        # Verify history was created
        self.assertEqual(history1.status, 'in progress')
        self.assertEqual(history2.status, 'resolved')
        
        # Verify both are linked to the same task item
        history_records = TaskItemHistory.objects.filter(task_item=task_item)
        self.assertEqual(history_records.count(), 2)

    def test_task_item_origin_tracking(self):
        """Test that task item origin is tracked correctly"""
        task_item = TaskItem.objects.create(
            task=self.task,
            role_user=self.role_user,
            origin='System'
        )
        
        self.assertEqual(task_item.origin, 'System')
        
        # Create an escalated assignment
        escalated_item = TaskItem.objects.create(
            task=self.task,
            role_user=self.role_user,
            origin='Escalation'
        )
        
        self.assertEqual(escalated_item.origin, 'Escalation')

    def test_task_item_history_creation(self):
        """Test that task item history is recorded"""
        task_item = TaskItem.objects.create(
            task=self.task,
            role_user=self.role_user,
            origin='System'
        )
        
        # Create a history entry
        history = TaskItemHistory.objects.create(
            task_item=task_item,
            status='in progress'
        )
        
        self.assertEqual(history.task_item, task_item)
        self.assertEqual(history.status, 'in progress')
        self.assertIsNotNone(history.created_at)
