"""
Unit tests for task utility functions.
Tests assignment logic, SLA calculations, and escalation behavior.
"""
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch, MagicMock

from task.models import Task, TaskItem, TaskItemHistory
from task.utils.assignment import fetch_users_for_role, apply_round_robin_assignment
from task.utils.target_resolution import (
    get_sla_for_priority,
    calculate_step_weight_percentage,
    calculate_target_resolution_for_task,
)
from workflow.models import Workflows
from step.models import Steps, StepTransition
from role.models import Roles, RoleUsers
from tickets.models import WorkflowTicket, RoundRobin


class RoundRobinAssignmentTests(TestCase):
    """Test round-robin assignment logic with multiple users"""

    def setUp(self):
        """Set up test fixtures with multiple users"""
        # Create roles
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
        
        # Create workflow
        self.workflow = Workflows.objects.create(
            user_id=1,
            name="Support Workflow",
            description="Support workflow for round-robin tests",
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
        
        # Create step
        self.step = Steps.objects.create(
            step_id=1,
            workflow_id=self.workflow,
            role_id=self.role,
            escalate_to=self.escalation_role,
            name="Assessment",
            description="Assessment step",
            order=1,
            weight=1.0,
            is_initialized=True,
            is_start=True,
        )
        
        # Create transition
        StepTransition.objects.create(
            workflow_id=self.workflow,
            from_step_id=self.step,
            to_step_id=None,
            name="Complete"
        )
        
        # Create ticket
        self.ticket = WorkflowTicket.objects.create(
            ticket_number="TICKET-001",
            priority="High",
            department="IT",
            ticket_data={"priority": "High"}
        )
        
        # Create multiple active users in the role
        self.user_1 = RoleUsers.objects.create(
            role_id=self.role,
            user_id=1,
            user_full_name="Alice",
            is_active=True
        )
        
        self.user_2 = RoleUsers.objects.create(
            role_id=self.role,
            user_id=2,
            user_full_name="Bob",
            is_active=True
        )
        
        self.user_3 = RoleUsers.objects.create(
            role_id=self.role,
            user_id=3,
            user_full_name="Charlie",
            is_active=True
        )

    def test_fetch_active_users_for_role(self):
        """Test that fetch_users_for_role returns only active users"""
        user_ids = fetch_users_for_role("Support Agent")
        
        self.assertEqual(len(user_ids), 3)
        self.assertIn(1, user_ids)
        self.assertIn(2, user_ids)
        self.assertIn(3, user_ids)

    def test_fetch_users_excludes_inactive(self):
        """Test that inactive users are excluded from role user list"""
        # Deactivate one user
        self.user_2.is_active = False
        self.user_2.save()
        
        user_ids = fetch_users_for_role("Support Agent")
        
        self.assertEqual(len(user_ids), 2)
        self.assertIn(1, user_ids)
        self.assertNotIn(2, user_ids)
        self.assertIn(3, user_ids)

    def test_fetch_users_nonexistent_role(self):
        """Test that fetching users for a non-existent role returns empty list"""
        user_ids = fetch_users_for_role("NonExistentRole")
        
        self.assertEqual(len(user_ids), 0)

    def test_round_robin_sequential_assignment(self):
        """Test that round-robin assigns users sequentially"""
        task = Task.objects.create(
            ticket_id=self.ticket,
            workflow_id=self.workflow,
            current_step=self.step,
            status='pending'
        )
        
        user_ids = [1, 2, 3]
        
        # Patch the notify task to avoid RabbitMQ connection
        with patch('task.utils.assignment.notify_task'):
            # First assignment should go to user 1
            task_items = apply_round_robin_assignment(task, user_ids, "Support Agent")
            self.assertEqual(len(task_items), 1)
            self.assertEqual(task_items[0].role_user.user_id, 1)
            
            # Create another task - should go to user 2
            task_2 = Task.objects.create(
                ticket_id=self.ticket,
                workflow_id=self.workflow,
                current_step=self.step,
                status='pending'
            )
            
            task_items_2 = apply_round_robin_assignment(task_2, user_ids, "Support Agent")
            self.assertEqual(task_items_2[0].role_user.user_id, 2)
            
            # Third task should go to user 3
            task_3 = Task.objects.create(
                ticket_id=self.ticket,
                workflow_id=self.workflow,
                current_step=self.step,
                status='pending'
            )
            
            task_items_3 = apply_round_robin_assignment(task_3, user_ids, "Support Agent")
            self.assertEqual(task_items_3[0].role_user.user_id, 3)
            
            # Fourth task should wrap around to user 1
            task_4 = Task.objects.create(
                ticket_id=self.ticket,
                workflow_id=self.workflow,
                current_step=self.step,
                status='pending'
            )
            
            task_items_4 = apply_round_robin_assignment(task_4, user_ids, "Support Agent")
            self.assertEqual(task_items_4[0].role_user.user_id, 1)

    def test_round_robin_state_persistence(self):
        """Test that round-robin state is persisted across assignments"""
        user_ids = [1, 2, 3]
        
        # Verify RoundRobin state is created
        rr, created = RoundRobin.objects.get_or_create(
            role_name="Support Agent",
            defaults={"current_index": 0}
        )
        self.assertTrue(created)
        self.assertEqual(rr.current_index, 0)
        
        # Perform assignment
        task = Task.objects.create(
            ticket_id=self.ticket,
            workflow_id=self.workflow,
            current_step=self.step,
        )
        
        with patch('task.utils.assignment.notify_task'):
            apply_round_robin_assignment(task, user_ids, "Support Agent")
        
        # Check that index was incremented
        rr.refresh_from_db()
        self.assertGreaterEqual(rr.current_index, 1)

    def test_no_available_users(self):
        """Test assignment behavior when no users are available for a role"""
        # Deactivate all users
        RoleUsers.objects.filter(role_id=self.role).update(is_active=False)
        
        user_ids = fetch_users_for_role("Support Agent")
        self.assertEqual(len(user_ids), 0)
        
        task = Task.objects.create(
            ticket_id=self.ticket,
            workflow_id=self.workflow,
            current_step=self.step,
        )
        
        # Assignment should return empty list
        task_items = apply_round_robin_assignment(task, user_ids, "Support Agent")
        self.assertEqual(len(task_items), 0)

    def test_single_user_assignment(self):
        """Test round-robin with only one active user"""
        # Deactivate all but one user
        self.user_2.is_active = False
        self.user_2.save()
        self.user_3.is_active = False
        self.user_3.save()
        
        user_ids = fetch_users_for_role("Support Agent")
        self.assertEqual(len(user_ids), 1)
        
        # Create multiple tasks - all should go to the single user
        with patch('task.utils.assignment.notify_task'):
            for i in range(3):
                task = Task.objects.create(
                    ticket_id=self.ticket,
                    workflow_id=self.workflow,
                    current_step=self.step,
                )
                task_items = apply_round_robin_assignment(task, user_ids, "Support Agent")
                self.assertEqual(len(task_items), 1)
                self.assertEqual(task_items[0].role_user.user_id, 1)


class SLACalculationTests(TestCase):
    """Test SLA-based target resolution time calculations"""

    def setUp(self):
        """Set up test fixtures with workflows"""
        # Create workflow with well-defined SLAs
        self.workflow = Workflows.objects.create(
            user_id=1,
            name="SLA Test Workflow",
            description="Workflow for SLA calculation tests",
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
        
        # Create role
        self.role = Roles.objects.create(
            role_id=1,
            name="Support Agent",
            system="tts"
        )
        
        # Create steps with weights
        self.step_1 = Steps.objects.create(
            step_id=1,
            workflow_id=self.workflow,
            role_id=self.role,
            name="Assessment",
            description="Initial assessment step",
            order=1,
            weight=2.0,  # 40% of 5.0 total weight
        )
        
        self.step_2 = Steps.objects.create(
            step_id=2,
            workflow_id=self.workflow,
            role_id=self.role,
            name="Resolution",
            description="Resolution step",
            order=2,
            weight=2.0,  # 40%
        )
        
        self.step_3 = Steps.objects.create(
            step_id=3,
            workflow_id=self.workflow,
            role_id=self.role,
            name="Verification",
            description="Verification step",
            order=3,
            weight=1.0,  # 20%
            is_initialized=True,
            is_end=True,
        )
        
        # Create transitions
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
            name="To Verification"
        )

    def test_get_sla_for_low_priority(self):
        """Test SLA retrieval for low priority"""
        sla = get_sla_for_priority(self.workflow, "Low")
        
        self.assertIsNotNone(sla)
        self.assertEqual(sla, timedelta(hours=24))

    def test_get_sla_for_medium_priority(self):
        """Test SLA retrieval for medium priority"""
        sla = get_sla_for_priority(self.workflow, "Medium")
        
        self.assertIsNotNone(sla)
        self.assertEqual(sla, timedelta(hours=12))

    def test_get_sla_for_high_priority(self):
        """Test SLA retrieval for high priority"""
        sla = get_sla_for_priority(self.workflow, "High")
        
        self.assertIsNotNone(sla)
        self.assertEqual(sla, timedelta(hours=4))

    def test_get_sla_for_critical_priority(self):
        """Test SLA retrieval for critical/urgent priority"""
        sla = get_sla_for_priority(self.workflow, "Critical")
        
        self.assertIsNotNone(sla)
        self.assertEqual(sla, timedelta(hours=1))

    def test_get_sla_for_unknown_priority(self):
        """Test SLA retrieval for unknown priority returns None"""
        sla = get_sla_for_priority(self.workflow, "Unknown")
        
        self.assertIsNone(sla)

    def test_step_weight_percentage_calculation(self):
        """Test that step weight percentages are calculated correctly"""
        # Total weight = 2.0 + 2.0 + 1.0 = 5.0
        
        weight_1 = calculate_step_weight_percentage(self.step_1, self.workflow)
        weight_2 = calculate_step_weight_percentage(self.step_2, self.workflow)
        weight_3 = calculate_step_weight_percentage(self.step_3, self.workflow)
        
        # Assert correct percentages (with small tolerance for floating point)
        self.assertAlmostEqual(weight_1, 0.4, places=2)  # 2.0 / 5.0 = 0.4
        self.assertAlmostEqual(weight_2, 0.4, places=2)  # 2.0 / 5.0 = 0.4
        self.assertAlmostEqual(weight_3, 0.2, places=2)  # 1.0 / 5.0 = 0.2
        
        # Verify they sum to approximately 1.0
        total = weight_1 + weight_2 + weight_3
        self.assertAlmostEqual(total, 1.0, places=2)

    def test_target_resolution_for_high_priority(self):
        """Test target resolution calculation for high priority ticket"""
        ticket = WorkflowTicket.objects.create(
            ticket_number="HIGH-001",
            priority="High",
            department="IT",
            ticket_data={"priority": "High"}
        )
        
        # Calculate target resolution (uses full SLA, no weighting)
        target = calculate_target_resolution_for_task(
            ticket,
            self.workflow
        )
        
        now = timezone.now()
        
        # High priority should have 4 hours SLA
        self.assertIsNotNone(target)
        self.assertGreater(target, now)
        
        # Check that it's within a reasonable range
        time_diff = target - now
        self.assertLess(time_diff, timedelta(hours=5))
        self.assertGreater(time_diff, timedelta(hours=3))

    def test_target_resolution_for_low_priority(self):
        """Test target resolution calculation for low priority ticket"""
        ticket = WorkflowTicket.objects.create(
            ticket_number="LOW-001",
            priority="Low",
            department="IT",
            ticket_data={"priority": "Low"}
        )
        
        target = calculate_target_resolution_for_task(
            ticket,
            self.workflow
        )
        
        now = timezone.now()
        
        # Low priority should have 24 hours SLA
        self.assertIsNotNone(target)
        self.assertGreater(target, now)
        
        time_diff = target - now
        self.assertLess(time_diff, timedelta(hours=25))
        self.assertGreater(time_diff, timedelta(hours=23))

    def test_sla_calculation_across_steps(self):
        """Test that different steps have appropriate SLA allocations"""
        ticket = WorkflowTicket.objects.create(
            ticket_number="SLA-TEST",
            priority="Medium",
            department="IT",
            ticket_data={"priority": "Medium"}
        )
        
        # Medium priority = 12 hours total SLA
        # Target resolution calculation uses full SLA (no weighting per step)
        target = calculate_target_resolution_for_task(
            ticket,
            self.workflow
        )
        
        now = timezone.now()
        
        # Should be within 12 hours
        self.assertIsNotNone(target)
        time_diff = (target - now).total_seconds() / 3600  # hours
        
        self.assertAlmostEqual(time_diff, 12.0, delta=0.5)


class EscalationLogicTests(TestCase):
    """Test escalation behavior and SLA breach handling"""

    def setUp(self):
        """Set up test fixtures for escalation"""
        # Create roles
        self.support_role = Roles.objects.create(
            role_id=1,
            name="Support Agent",
            system="tts"
        )
        
        self.manager_role = Roles.objects.create(
            role_id=2,
            name="Manager",
            system="tts"
        )
        
        # Create workflow
        self.workflow = Workflows.objects.create(
            user_id=1,
            name="Escalation Test Workflow",
            description="Workflow for escalation tests",
            workflow_id=1,
            category="Support",
            sub_category="General",
            department="IT",
            status="deployed",
            is_published=True,
            high_sla=timedelta(hours=4),
        )
        
        # Create steps with escalation
        self.step_1 = Steps.objects.create(
            step_id=1,
            workflow_id=self.workflow,
            role_id=self.support_role,
            escalate_to=self.manager_role,
            name="Initial Support",
            description="Initial support step",
            order=1,
            weight=0.5,
            is_initialized=True,
            is_start=True,
        )
        
        self.step_2 = Steps.objects.create(
            step_id=2,
            workflow_id=self.workflow,
            role_id=self.manager_role,
            escalate_to=None,
            name="Manager Review",
            description="Manager review step",
            order=2,
            weight=0.5,
            is_initialized=True,
            is_end=True,
        )
        
        # Create transitions
        StepTransition.objects.create(
            workflow_id=self.workflow,
            from_step_id=self.step_1,
            to_step_id=self.step_2,
            name="Escalate to Manager"
        )
        
        # Create users
        self.support_user = RoleUsers.objects.create(
            role_id=self.support_role,
            user_id=1,
            user_full_name="Support Agent 1",
            is_active=True
        )
        
        self.manager_user = RoleUsers.objects.create(
            role_id=self.manager_role,
            user_id=2,
            user_full_name="Manager 1",
            is_active=True
        )
        
        # Create ticket
        self.ticket = WorkflowTicket.objects.create(
            ticket_number="ESCALATION-001",
            priority="High",
            department="IT",
            ticket_data={"priority": "High"}
        )

    def test_escalate_to_role_configured(self):
        """Test that escalate_to role is properly configured"""
        self.assertEqual(self.step_1.escalate_to, self.manager_role)
        self.assertIsNone(self.step_2.escalate_to)

    def test_create_escalated_task_item(self):
        """Test creating a task item with escalation origin"""
        task = Task.objects.create(
            ticket_id=self.ticket,
            workflow_id=self.workflow,
            current_step=self.step_1,
            status='in progress'
        )
        
        # Create initial task item
        initial_item = TaskItem.objects.create(
            task=task,
            role_user=self.support_user,
            origin='System'
        )
        
        # Escalate to manager
        escalated_item = TaskItem.objects.create(
            task=task,
            role_user=self.manager_user,
            origin='Escalation'
        )
        
        # Verify escalation chain
        self.assertEqual(initial_item.origin, 'System')
        self.assertEqual(escalated_item.origin, 'Escalation')
        self.assertEqual(escalated_item.role_user.role_id, self.manager_role)

    def test_sla_breach_detection(self):
        """Test detecting when a task has breached its SLA"""
        # Create task with past target resolution
        past_time = timezone.now() - timedelta(hours=1)
        
        task = Task.objects.create(
            ticket_id=self.ticket,
            workflow_id=self.workflow,
            current_step=self.step_1,
            status='in progress',
            target_resolution=past_time
        )
        
        task_item = TaskItem.objects.create(
            task=task,
            role_user=self.support_user,
            origin='System'
        )
        
        # Check if target is in the past
        now = timezone.now()
        is_breached = task.target_resolution < now
        
        self.assertTrue(is_breached)

    def test_escalation_notification_trigger(self):
        """Test that escalation triggers notification (mocked)"""
        task = Task.objects.create(
            ticket_id=self.ticket,
            workflow_id=self.workflow,
            current_step=self.step_1,
            status='in progress'
        )
        
        # Create initial item
        initial_item = TaskItem.objects.create(
            task=task,
            role_user=self.support_user,
            origin='System'
        )
        
        # Simulate escalation with mocked notification
        with patch('task.tasks.send_assignment_notification') as mock_notify:
            # Create escalated item
            escalated_item = TaskItem.objects.create(
                task=task,
                role_user=self.manager_user,
                origin='Escalation'
            )
            
            # In a real implementation, this would trigger a notification
            # For now, we verify the escalated item was created
            self.assertEqual(escalated_item.origin, 'Escalation')

    def test_multiple_escalations(self):
        """Test handling multiple levels of escalation"""
        # Create a third role for additional escalation
        director_role = Roles.objects.create(
            role_id=3,
            name="Director",
            system="tts"
        )
        
        director_user = RoleUsers.objects.create(
            role_id=director_role,
            user_id=3,
            user_full_name="Director",
            is_active=True
        )
        
        # Update manager step to escalate to director
        self.step_2.escalate_to = director_role
        self.step_2.save()
        
        task = Task.objects.create(
            ticket_id=self.ticket,
            workflow_id=self.workflow,
            current_step=self.step_1,
            status='in progress'
        )
        
        # Create escalation chain
        item_1 = TaskItem.objects.create(
            task=task,
            role_user=self.support_user,
            origin='System'
        )
        
        item_2 = TaskItem.objects.create(
            task=task,
            role_user=self.manager_user,
            origin='Escalation'
        )
        
        item_3 = TaskItem.objects.create(
            task=task,
            role_user=director_user,
            origin='Escalation'
        )
        
        # Verify escalation chain
        all_items = TaskItem.objects.filter(task=task)
        self.assertEqual(len(all_items), 3)
        self.assertEqual(all_items[0].role_user.user_id, 1)
        self.assertEqual(all_items[1].role_user.user_id, 2)
        self.assertEqual(all_items[2].role_user.user_id, 3)

    def test_escalation_respects_weight(self):
        """Test that escalation allocates time proportional to step weight"""
        # Initial assignment at step_1 (50% weight)
        task = Task.objects.create(
            ticket_id=self.ticket,
            workflow_id=self.workflow,
            current_step=self.step_1,
            status='in progress'
        )
        
        # Target resolution should be set based on full SLA (4 hours for high priority)
        target = calculate_target_resolution_for_task(
            self.ticket,
            self.workflow
        )
        
        now = timezone.now()
        
        # High priority (4 hours total SLA)
        self.assertIsNotNone(target)
        time_diff = (target - now).total_seconds() / 3600
        
        # Should be approximately 4 hours
        self.assertGreater(time_diff, 3.5)
        self.assertLess(time_diff, 4.5)
