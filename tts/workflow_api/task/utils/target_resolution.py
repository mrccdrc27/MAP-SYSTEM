"""
Target Resolution Time Calculation Utility

Calculates target resolution times for tasks based on:
1. Ticket priority
2. Workflow SLA (matched to ticket priority)
3. Step weight (relative to total workflow weights)
4. Current step order
"""

from datetime import timedelta
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


def get_sla_for_priority(workflow, priority):
    """
    Get the SLA duration for a given priority level from the workflow.
    
    Args:
        workflow: Workflows model instance
        priority: Priority string ('Low', 'Medium', 'High', 'Critical')
    
    Returns:
        timedelta object for the SLA, or None if not configured
    
    Example:
        >>> sla = get_sla_for_priority(workflow, 'High')
        >>> # Returns timedelta(hours=4)
    """
    priority_lower = priority.lower()
    
    # Map priority names to SLA fields
    sla_mapping = {
        'low': 'low_sla',
        'medium': 'medium_sla',
        'high': 'high_sla',
        'critical': 'urgent_sla',  # Critical maps to urgent_sla in the model
        'urgent': 'urgent_sla',
    }
    
    sla_field = sla_mapping.get(priority_lower)
    if not sla_field:
        logger.warning(f"❌ Unknown priority level: {priority}")
        return None
    
    sla = getattr(workflow, sla_field, None)
    
    if not sla:
        logger.warning(f"[WARNING] No SLA configured for priority '{priority}' in workflow {workflow.name}")
        return None
    
    logger.info(f"[OK] Found SLA for priority '{priority}': {sla}")
    return sla


def calculate_step_weight_percentage(step, workflow):
    """
    Calculate what percentage of the total workflow time this step represents.
    
    Args:
        step: Steps model instance
        workflow: Workflows model instance (for context)
    
    Returns:
        float: Percentage (0-1) of the total workflow time for this step
    
    Example:
        If step has weight 2.5 and total workflow weight is 10:
        Returns 0.25 (25%)
    """
    # Get all steps in the workflow
    from step.models import Steps
    
    all_steps = Steps.objects.filter(workflow_id=workflow)
    total_weight = sum(float(s.weight) for s in all_steps)
    
    if total_weight == 0:
        logger.warning(f"[WARNING] Total workflow weight is 0 for workflow {workflow.name}")
        return 1.0 / len(all_steps) if all_steps.exists() else 1.0
    
    step_percentage = float(step.weight) / total_weight
    logger.info(f"[INFO] Step '{step.name}' weight: {step.weight}, Total: {total_weight}, Percentage: {step_percentage:.2%}")
    
    return step_percentage


def calculate_target_resolution_for_task(ticket, workflow):
    """
    Calculate the target resolution time for a TASK using FULL SLA (not weighted).
    
    Formula:
        target_resolution = now + SLA
    
    Where:
        - SLA is the full SLA duration based on ticket priority (from workflow config)
        - NO step weighting is applied (applies to entire task, all steps combined)
    
    Args:
        ticket: WorkflowTicket model instance (contains priority)
        workflow: Workflows model instance (contains SLA per priority)
    
    Returns:
        datetime: Target resolution datetime, or None if calculation fails
    
    Example:
        >>> ticket = WorkflowTicket.objects.get(id=1)  # priority='High'
        >>> workflow = Workflows.objects.get(workflow_id=1)
        >>> # workflow.high_sla = timedelta(hours=8)
        >>> target = calculate_target_resolution_for_task(ticket, workflow)
        >>> # Returns: now + 8 hours
    """
    try:
        # Get ticket priority
        priority = ticket.priority or 'Medium'
        logger.info(f"[INFO] Calculating TASK target resolution for ticket {ticket.ticket_number}, priority: {priority}")
        
        # Get FULL SLA for this priority (no weighting)
        sla = get_sla_for_priority(workflow, priority)
        if not sla:
            logger.warning(f"[WARNING] Cannot calculate target resolution: no SLA for priority '{priority}'")
            return None
        
        # Calculate target resolution using full SLA (no step weight applied)
        now = timezone.now()
        
        # 🕒 Time Travel Support: Use original submit_date if available (for historical data/seeding)
        submit_date_str = ticket.ticket_data.get('submit_date')
        if submit_date_str:
            try:
                from django.utils.dateparse import parse_datetime
                parsed_date = parse_datetime(submit_date_str)
                if parsed_date:
                    logger.info(f"⏳ Using historical submit date for SLA calculation: {parsed_date}")
                    now = parsed_date
            except Exception as e:
                logger.warning(f"⚠️ Failed to parse submit_date '{submit_date_str}', using current time: {e}")
                
        target_resolution = now + sla
        
        logger.info(
            f"[OK] TASK Target resolution calculated:\n"
            f"   Ticket: {ticket.ticket_number}\n"
            f"   Priority: {priority}\n"
            f"   Full SLA: {sla}\n"
            f"   Target: {target_resolution}"
        )
        
        return target_resolution
        
    except Exception as e:
        logger.error(f"[ERROR] Error calculating TASK target resolution: {e}", exc_info=True)
        return None


def calculate_target_resolution_for_task_item(ticket, step, workflow):
    """
    Calculate the target resolution time for a TASK ITEM using WEIGHTED SLA.
    
    Formula:
        target_resolution = now + (SLA * step_weight_percentage)
    
    Where:
        - SLA is based on ticket priority (from workflow config)
        - step_weight_percentage is calculated relative to total workflow weights
    
    Args:
        ticket: WorkflowTicket model instance (contains priority)
        step: Steps model instance (contains weight)
        workflow: Workflows model instance (contains SLA per priority)
    
    Returns:
        datetime: Target resolution datetime, or None if calculation fails
    
    Example:
        >>> ticket = WorkflowTicket.objects.get(id=1)  # priority='High'
        >>> step = Steps.objects.get(step_id=1)  # weight=2.0
        >>> workflow = Workflows.objects.get(workflow_id=1)
        >>> # workflow.high_sla = timedelta(hours=8)
        >>> # total_steps_weight = 10, so step_percentage = 0.2 (20%)
        >>> target = calculate_target_resolution_for_task_item(ticket, step, workflow)
        >>> # Returns: now + (8 hours * 0.2) = now + 1.6 hours
    """
    try:
        # Get ticket priority
        priority = ticket.priority or 'Medium'
        logger.info(f"[INFO] Calculating TASK ITEM target resolution for ticket {ticket.ticket_number}, priority: {priority}")
        
        # Get SLA for this priority
        sla = get_sla_for_priority(workflow, priority)
        if not sla:
            logger.warning(f"[WARNING] Cannot calculate target resolution: no SLA for priority '{priority}'")
            return None
        
        # Calculate step weight percentage
        step_percentage = calculate_step_weight_percentage(step, workflow)
        
        # Calculate time allocation for this step (weighted)
        step_sla = sla * step_percentage
        
        # Calculate target resolution
        now = timezone.now()

        # 🕒 Time Travel Support: Use original submit_date if available
        submit_date_str = ticket.ticket_data.get('submit_date')
        if submit_date_str:
            try:
                from django.utils.dateparse import parse_datetime
                parsed_date = parse_datetime(submit_date_str)
                if parsed_date:
                    now = parsed_date
            except Exception:
                pass

        target_resolution = now + step_sla
        
        logger.info(
            f"[OK] TASK ITEM Target resolution calculated:\n"
            f"   Priority: {priority}\n"
            f"   Full SLA: {sla}\n"
            f"   Step weight: {step.weight} ({step_percentage:.2%})\n"
            f"   Weighted allocation: {step_sla}\n"
            f"   Target: {target_resolution}"
        )
        
        return target_resolution
        
    except Exception as e:
        logger.error(f"[ERROR] Error calculating TASK ITEM target resolution: {e}", exc_info=True)
        return None


def calculate_target_resolution(ticket, step, workflow):
    """
    DEPRECATED: Use calculate_target_resolution_for_task_item() instead.
    
    Calculate the target resolution time for a task at a specific step.
    
    Formula:
        target_resolution = now + (SLA * step_weight_percentage)
    
    Where:
        - SLA is based on ticket priority (from workflow config)
        - step_weight_percentage is calculated relative to total workflow weights
    
    Args:
        ticket: WorkflowTicket model instance (contains priority)
        step: Steps model instance (contains weight)
        workflow: Workflows model instance (contains SLA per priority)
    
    Returns:
        datetime: Target resolution datetime, or None if calculation fails
    
    Example:
        >>> ticket = WorkflowTicket.objects.get(id=1)  # priority='High'
        >>> step = Steps.objects.get(step_id=1)  # weight=2.0
        >>> workflow = Workflows.objects.get(workflow_id=1)
        >>> # workflow.high_sla = timedelta(hours=8)
        >>> # total_steps_weight = 10, so step_percentage = 0.2 (20%)
        >>> target = calculate_target_resolution(ticket, step, workflow)
        >>> # Returns: now + (8 hours * 0.2) = now + 1.6 hours
    """
    # Delegate to the new function
    return calculate_target_resolution_for_task_item(ticket, step, workflow)


def calculate_step_sla_summary(workflow):
    """
    Generate a summary of SLA allocations across all steps in a workflow.
    
    Useful for debugging and understanding the workflow's time distribution.
    
    Args:
        workflow: Workflows model instance
    
    Returns:
        dict: Summary with SLA allocations per step per priority
    
    Example output:
        {
            'High': [
                {'step_name': 'Review', 'weight': 2.0, 'percentage': 0.2, 'allocation': timedelta(hours=1.6)},
                {'step_name': 'Approve', 'weight': 1.5, 'percentage': 0.15, 'allocation': timedelta(hours=1.2)},
            ]
        }
    """
    from step.models import Steps
    
    try:
        all_steps = Steps.objects.filter(workflow_id=workflow).order_by('order')
        total_weight = sum(float(s.weight) for s in all_steps)
        
        if total_weight == 0:
            logger.warning(f"⚠️ Cannot generate summary: total workflow weight is 0")
            return {}
        
        summary = {}
        
        # Process each priority level
        for priority in ['Low', 'Medium', 'High', 'Critical']:
            sla = get_sla_for_priority(workflow, priority)
            if not sla:
                continue
            
            priority_steps = []
            for step in all_steps:
                percentage = float(step.weight) / total_weight
                allocation = sla * percentage
                
                priority_steps.append({
                    'step_id': step.step_id,
                    'step_name': step.name,
                    'order': step.order,
                    'weight': float(step.weight),
                    'percentage': percentage,
                    'allocation': allocation
                })
            
            summary[priority] = priority_steps
        
        return summary
        
    except Exception as e:
        logger.error(f"❌ Error generating SLA summary: {e}", exc_info=True)
        return {}
