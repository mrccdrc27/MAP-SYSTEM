from step.models import StepTransition
from task.utils.assignment import fetch_users_for_role, apply_round_robin_assignment
import logging

logger = logging.getLogger(__name__)

class TaskService:
    @staticmethod
    def move_task_to_next_step(task):
        """
        Move task to the next step in the workflow.
        Handles finding the transition, updating the step, and assigning users.
        """
        
        if not task.current_step:
            logger.warning("⚠️ No current step set for this task")
            return False
        
        # Find next step through transitions
        transition = StepTransition.objects.filter(
            from_step_id=task.current_step,
            workflow_id=task.workflow_id
        ).first()
        
        if not transition:
            logger.warning(f"⚠️ No transition found from step {task.current_step.name}")
            return False
        
        # Move to next step
        next_step = transition.to_step_id
        
        # Assign users for the new step BEFORE updating task.current_step
        # Pass step explicitly to ensure TaskItems get correct assigned_on_step
        if next_step and next_step.role_id:
            # Fetch new users for the next step's role
            users_for_role = fetch_users_for_role(next_step.role_id.name)
            if users_for_role:
                # apply_round_robin_assignment handles TaskItem creation
                apply_round_robin_assignment(
                    task, 
                    users_for_role, 
                    next_step.role_id.name,
                    step=next_step  # Explicitly pass the target step
                )
        
        # Update task.current_step after assignments are made
        task.current_step = next_step
            # If no users, keep existing assignments (don't clear)
        
        task.status = 'pending'
        task.save()
        
        logger.info(f"✅ Task moved to step: {next_step.name}")
        return True
