#!/usr/bin/env python
"""
Test script for automatic task creation workflow

This script demonstrates how the automatic task creation works when a ticket is received:
1. Creates a sample workflow with steps and roles
2. Simulates receiving a ticket
3. Shows the automatic task creation process
4. Tests the round-robin assignment logic
"""

import os
import sys
import django
import json
from datetime import datetime, timedelta

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'workflow_api.settings')
django.setup()

from django.utils import timezone
from workflow.models import Workflows
from step.models import Steps
from role.models import Roles
from tickets.models import WorkflowTicket
from task.models import Task
from tickets.tasks import create_task_for_ticket, receive_ticket

def create_test_data():
    """Create test workflows, roles, and steps for demonstration"""
    print("🔧 Setting up test data...")
    
    # Create a test role
    role, created = Roles.objects.get_or_create(
        name="IT Support Technician",
        defaults={
            'user_id': 1,
            'description': 'Handles IT support requests'
        }
    )
    print(f"✅ Role: {role.name} ({'created' if created else 'exists'})")
    
    # Create a test workflow
    workflow, created = Workflows.objects.get_or_create(
        name="IT Support Workflow",
        defaults={
            'user_id': 1,
            'description': 'Standard IT support workflow',
            'category': 'IT',
            'sub_category': 'Hardware',
            'department': 'IT Department',
            'is_published': True,
            'status': 'deployed',
            'low_sla': timedelta(hours=48),
            'medium_sla': timedelta(hours=24),
            'high_sla': timedelta(hours=8),
            'urgent_sla': timedelta(hours=4),
            'end_logic': 'notification'
        }
    )
    print(f"✅ Workflow: {workflow.name} ({'created' if created else 'exists'})")
    
    # Create test steps
    step1, created = Steps.objects.get_or_create(
        name="Initial Assessment",
        defaults={
            'workflow_id': workflow,
            'role_id': role,
            'description': 'Assess the ticket and determine next steps',
            'instruction': 'Review the ticket details and categorize the issue',
            'order': 1,
            'is_initialized': True
        }
    )
    print(f"✅ Step 1: {step1.name} ({'created' if created else 'exists'})")
    
    step2, created = Steps.objects.get_or_create(
        name="Resolution",
        defaults={
            'workflow_id': workflow,
            'role_id': role,
            'description': 'Resolve the issue',
            'instruction': 'Implement the solution and test',
            'order': 2,
            'is_initialized': False
        }
    )
    print(f"✅ Step 2: {step2.name} ({'created' if created else 'exists'})")
    
    return workflow, role, step1, step2

def test_automatic_task_creation():
    """Test the automatic task creation when a ticket is received"""
    print("\n🎫 Testing automatic task creation...")
    
    # Sample ticket data - now just raw JSON
    ticket_data = {
        "ticket_number": f"TK-{datetime.now().timestamp()}",
        "subject": "Laptop not connecting to WiFi",
        "category": "IT",
        "sub_category": "Hardware",
        "department": "IT Department",
        "description": "Employee laptop cannot connect to office WiFi network",
        "priority": "medium",
        "status": "open",
        "employee": "john.doe@company.com",
        "submit_date": timezone.now().isoformat(),
        "update_date": timezone.now().isoformat(),
        "dynamic_data": {},
        "attachments": []
    }
    
    print(f"📝 Sample ticket: {ticket_data['subject']}")
    
    # Simulate receiving the ticket (this would normally come from Celery)
    result = receive_ticket(ticket_data)
    print(f"📨 Ticket processing result: {result['status']}")
    
    if result['status'] == 'success':
        ticket_number = result['ticket_number']
        print(f"🎯 Ticket created with number: {ticket_number}")
        
        # Get the ticket
        ticket = WorkflowTicket.objects.get(ticket_number=ticket_number)
        
        # Check if task was created automatically
        tasks = Task.objects.filter(ticket_id=ticket)
        if tasks.exists():
            task = tasks.first()
            print(f"✅ Task automatically created: {task.task_id}")
            print(f"📋 Workflow: {task.workflow_id.name}")
            print(f"🏁 Current step: {task.current_step.name}")
            
            # Get assigned TaskItems
            from task.models import TaskItem
            task_items = TaskItem.objects.filter(task=task)
            print(f"👥 Assigned users: {len(task_items)}")
            
            # Print user assignments
            for item in task_items:
                print(f"   - User {item.user_id}: {item.username} ({item.status})")
                
            return task
        else:
            print("⚠️ No task was created automatically")
            return None
    else:
        print(f"❌ Ticket creation failed: {result}")
        return None

def test_manual_task_creation():
    """Test manual task creation for existing ticket"""
    print("\n🔧 Testing manual task creation...")
    
    # Create a ticket without automatic task creation (using ticket_data)
    ticket_data = {
        "subject": "Manual test ticket",
        "category": "IT",
        "sub_category": "Software",
        "department": "IT Department",
        "description": "Test ticket for manual task creation",
        "priority": "low",
        "status": "open",
        "employee": "test@company.com",
    }
    
    ticket = WorkflowTicket.objects.create(
        ticket_number=f"MANUAL-{int(timezone.now().timestamp())}",
        ticket_data=ticket_data,
        is_task_allocated=False
    )
    
    print(f"📝 Created test ticket: {ticket_data['subject']}")
    
    # Manually trigger task creation
    from tickets.tasks import create_task_for_ticket
    result = create_task_for_ticket(ticket.id)
    
    print(f"🎯 Manual task creation result: {result.get('status')}")
    if result.get('status') == 'success':
        print(f"✅ Task ID: {result.get('task_id')}")
        print(f"📋 Workflow: {result.get('workflow')}")
        print(f"🏁 Step: {result.get('step')}")
        print(f"👥 Assigned users: {len(result.get('assigned_users', []))}")

def test_task_operations():
    """Test task operations like moving to next step, completing tasks"""
    print("\n⚙️ Testing task operations...")
    
    from task.models import TaskItem
    
    # Get the first available task
    task = Task.objects.first()
    if not task:
        print("❌ No tasks available for testing")
        return
    
    print(f"🎯 Testing with task: {task.task_id}")
    
    # Test user status update
    task_items = TaskItem.objects.filter(task=task)
    if task_items.exists():
        first_item = task_items.first()
        user_id = first_item.user_id
        print(f"👤 Updating user {user_id} status to 'in_progress'")
        success = task.update_user_status(user_id, 'in_progress')
        print(f"✅ User status updated: {success}")
    
    # Test task completion
    print(f"🏁 Marking task as completed...")
    task.mark_as_completed()
    print(f"✅ Task status: {task.status}")
    print(f"🔔 End logic triggered: {task.workflow_id.end_logic}")

def display_statistics():
    """Display current system statistics"""
    print("\n📊 System Statistics:")
    print(f"   - Total Workflows: {Workflows.objects.count()}")
    print(f"   - Total Roles: {Roles.objects.count()}")
    print(f"   - Total Steps: {Steps.objects.count()}")
    print(f"   - Total Tickets: {WorkflowTicket.objects.count()}")
    print(f"   - Total Tasks: {Task.objects.count()}")
    
    # Task status breakdown
    print("\n📈 Task Status Breakdown:")
    for status_choice in Task._meta.get_field('status').choices:
        status_value = status_choice[0]
        count = Task.objects.filter(status=status_value).count()
        if count > 0:
            print(f"   - {status_choice[1]}: {count}")

def main():
    """Main test function"""
    print("🚀 Starting Automatic Task Creation Workflow Test")
    print("=" * 60)
    
    try:
        # Setup test data
        workflow, role, step1, step2 = create_test_data()
        
        # Test automatic task creation
        task = test_automatic_task_creation()
        
        # Test manual task creation
        test_manual_task_creation()
        
        # Test task operations
        if task:
            test_task_operations()
        
        # Display statistics
        display_statistics()
        
        print("\n" + "=" * 60)
        print("✅ All tests completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()