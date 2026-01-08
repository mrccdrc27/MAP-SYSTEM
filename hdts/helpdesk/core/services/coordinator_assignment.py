"""
Automatic Ticket Coordinator Assignment Service

This service handles the automatic assignment of ticket coordinators as "ticket owners"
when a ticket is approved/opened. The selection algorithm follows a priority order:

1. Pick a coordinator with NO active tickets
2. If all have active tickets → pick one with a Low priority ticket
3. If all have Low priority → pick one with Resolved status
4. If all Resolved → pick one nearest to 3-day auto-close deadline

Active tickets are those NOT in: Closed, Withdrawn, Rejected status
"""

import random
import logging
import requests
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.db.models import Q, Count, Min

logger = logging.getLogger(__name__)


def get_ticket_coordinators():
    """
    Fetch all ticket coordinators from the auth service.
    Returns a list of coordinator user data including their IDs.
    """
    auth_service_url = getattr(settings, 'DJANGO_AUTH_SERVICE', 'http://localhost:8003')
    
    try:
        # Call the dedicated coordinators endpoint for efficiency
        api_url = f"{auth_service_url}/api/v1/hdts/user-management/coordinators/api/"
        
        response = requests.get(api_url, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        coordinators = data.get('coordinators', [])
        
        logger.info(f"[CoordinatorAssignment] Found {len(coordinators)} ticket coordinators")
        return coordinators
        
    except requests.RequestException as e:
        logger.error(f"[CoordinatorAssignment] Failed to fetch coordinators from auth service: {e}")
        # Fallback: try the general users endpoint and filter
        return _fallback_get_coordinators(auth_service_url)
    except Exception as e:
        logger.error(f"[CoordinatorAssignment] Error processing coordinator data: {e}")
        return []


def _fallback_get_coordinators(auth_service_url):
    """
    Fallback method to fetch coordinators from the general users endpoint.
    Used when the dedicated coordinators endpoint is not available.
    """
    try:
        api_url = f"{auth_service_url}/api/v1/hdts/user-management/users/api/"
        
        response = requests.get(api_url, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        all_users = data.get('all_users', []) or data.get('users', [])
        
        # Filter for Ticket Coordinators
        coordinators = []
        for user in all_users:
            system_roles = user.get('system_roles', [])
            for role in system_roles:
                if role.get('system_slug') == 'hdts' and role.get('role_name') == 'Ticket Coordinator':
                    coordinators.append({
                        'id': user.get('id'),
                        'email': user.get('email'),
                        'first_name': user.get('first_name'),
                        'last_name': user.get('last_name'),
                    })
                    break  # Only add once per user
        
        logger.info(f"[CoordinatorAssignment] Fallback: Found {len(coordinators)} ticket coordinators")
        return coordinators
        
    except Exception as e:
        logger.error(f"[CoordinatorAssignment] Fallback also failed: {e}")
        return []


def get_coordinator_active_tickets(coordinator_id):
    """
    Get all active (non-closed) tickets for a specific coordinator.
    Active tickets are NOT in: Closed, Withdrawn, Rejected status
    """
    from ..models import Ticket
    
    inactive_statuses = ['Closed', 'Withdrawn', 'Rejected']
    
    return Ticket.objects.filter(
        ticket_owner_id=coordinator_id
    ).exclude(
        status__in=inactive_statuses
    )


def get_coordinator_ticket_stats(coordinator_ids):
    """
    Get ticket statistics for all coordinators in a single query.
    Returns a dict mapping coordinator_id to their ticket info.
    """
    from ..models import Ticket
    
    inactive_statuses = ['Closed', 'Withdrawn', 'Rejected']
    
    # Build stats for each coordinator
    stats = {}
    for coord_id in coordinator_ids:
        active_tickets = Ticket.objects.filter(
            ticket_owner_id=coord_id
        ).exclude(
            status__in=inactive_statuses
        ).values('id', 'priority', 'status', 'update_date', 'ticket_number')
        
        stats[coord_id] = {
            'active_count': len(active_tickets),
            'tickets': list(active_tickets),
            'has_low_priority': any(t['priority'] == 'Low' for t in active_tickets),
            'has_resolved': any(t['status'] == 'Resolved' for t in active_tickets),
            'nearest_closing': None
        }
        
        # Calculate nearest closing time for Resolved tickets (3-day auto-close)
        resolved_tickets = [t for t in active_tickets if t['status'] == 'Resolved']
        if resolved_tickets:
            # Auto-close happens 72 hours after the last update
            nearest = min(resolved_tickets, key=lambda t: t['update_date'])
            auto_close_time = nearest['update_date'] + timedelta(hours=72)
            stats[coord_id]['nearest_closing'] = auto_close_time
    
    return stats


def select_coordinator_by_priority(coordinators):
    """
    Select a coordinator using the priority-based algorithm:
    
    1. Pick coordinator with NO active tickets (random if multiple)
    2. If all have active tickets → pick one with Low priority ticket
    3. If all have Low priority → pick one with Resolved status  
    4. If all Resolved → pick one nearest to 3-day auto-close deadline
    
    Returns the selected coordinator dict or None if no coordinators available.
    """
    if not coordinators:
        logger.warning("[CoordinatorAssignment] No coordinators available")
        return None
    
    coordinator_ids = [c['id'] for c in coordinators]
    stats = get_coordinator_ticket_stats(coordinator_ids)
    
    # Create a mapping of coordinator data by ID for easy lookup
    coord_by_id = {c['id']: c for c in coordinators}
    
    # PRIORITY 1: Coordinators with NO active tickets
    no_active_tickets = [c for c in coordinators if stats.get(c['id'], {}).get('active_count', 0) == 0]
    if no_active_tickets:
        selected = random.choice(no_active_tickets)
        logger.info(f"[CoordinatorAssignment] Priority 1: Selected coordinator {selected['id']} ({selected['email']}) with no active tickets")
        return selected
    
    # PRIORITY 2: Coordinators with Low priority tickets
    with_low_priority = [c for c in coordinators if stats.get(c['id'], {}).get('has_low_priority', False)]
    if with_low_priority:
        selected = random.choice(with_low_priority)
        logger.info(f"[CoordinatorAssignment] Priority 2: Selected coordinator {selected['id']} ({selected['email']}) with Low priority ticket")
        return selected
    
    # PRIORITY 3: Coordinators with Resolved status tickets
    with_resolved = [c for c in coordinators if stats.get(c['id'], {}).get('has_resolved', False)]
    if with_resolved:
        selected = random.choice(with_resolved)
        logger.info(f"[CoordinatorAssignment] Priority 3: Selected coordinator {selected['id']} ({selected['email']}) with Resolved ticket")
        return selected
    
    # PRIORITY 4: Coordinator nearest to 3-day auto-close deadline
    # Find coordinators with nearest_closing set and pick the one with the earliest time
    with_closing_times = [(c, stats.get(c['id'], {}).get('nearest_closing')) 
                         for c in coordinators 
                         if stats.get(c['id'], {}).get('nearest_closing') is not None]
    
    if with_closing_times:
        # Sort by nearest closing time (earliest first)
        with_closing_times.sort(key=lambda x: x[1])
        selected = with_closing_times[0][0]
        logger.info(f"[CoordinatorAssignment] Priority 4: Selected coordinator {selected['id']} ({selected['email']}) nearest to auto-close deadline")
        return selected
    
    # FALLBACK: If none of the above, just pick randomly
    selected = random.choice(coordinators)
    logger.info(f"[CoordinatorAssignment] Fallback: Randomly selected coordinator {selected['id']} ({selected['email']})")
    return selected


def assign_ticket_coordinator(ticket, exclude_coordinator_id=None):
    """
    Main function to assign a ticket coordinator as the ticket owner.
    
    Args:
        ticket: The Ticket instance to assign a coordinator to
        exclude_coordinator_id: Optional coordinator ID to exclude (e.g., the approving coordinator)
    
    Returns:
        The assigned coordinator data dict, or None if assignment failed
    """
    try:
        # Fetch all coordinators from auth service
        coordinators = get_ticket_coordinators()
        
        if not coordinators:
            logger.warning(f"[CoordinatorAssignment] No coordinators found for ticket {ticket.ticket_number}")
            return None
        
        # Optionally exclude a specific coordinator (e.g., the one who approved)
        if exclude_coordinator_id:
            coordinators = [c for c in coordinators if c['id'] != exclude_coordinator_id]
            if not coordinators:
                logger.warning(f"[CoordinatorAssignment] All coordinators excluded for ticket {ticket.ticket_number}")
                # Re-include the excluded coordinator as fallback
                coordinators = get_ticket_coordinators()
        
        # Select using priority algorithm
        selected = select_coordinator_by_priority(coordinators)
        
        if selected:
            # Assign the ticket owner
            ticket.ticket_owner_id = selected['id']
            ticket.save(update_fields=['ticket_owner_id'])
            
            logger.info(f"[CoordinatorAssignment] Assigned coordinator {selected['id']} ({selected['email']}) to ticket {ticket.ticket_number}")
            return selected
        
        return None
        
    except Exception as e:
        logger.exception(f"[CoordinatorAssignment] Error assigning coordinator to ticket {ticket.ticket_number}: {e}")
        return None


def get_coordinator_workload_summary():
    """
    Get a summary of coordinator workloads for debugging/monitoring.
    Returns a list of coordinators with their active ticket counts and statuses.
    """
    coordinators = get_ticket_coordinators()
    coordinator_ids = [c['id'] for c in coordinators]
    stats = get_coordinator_ticket_stats(coordinator_ids)
    
    summary = []
    for coord in coordinators:
        coord_stats = stats.get(coord['id'], {})
        summary.append({
            'coordinator': coord,
            'active_tickets': coord_stats.get('active_count', 0),
            'has_low_priority': coord_stats.get('has_low_priority', False),
            'has_resolved': coord_stats.get('has_resolved', False),
            'nearest_closing': coord_stats.get('nearest_closing'),
        })
    
    return summary
