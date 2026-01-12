"""
BMS (Budget Management System) Integration Service

Handles transformation of TTS ticket data to BMS API format and submission
with automatic retry logic and fallback handling.
"""

import requests
import logging
from typing import Dict, Any, Optional, Tuple
from datetime import timedelta
from django.utils import timezone

logger = logging.getLogger(__name__)

# BMS API Configuration - lazy loaded to avoid import-time settings access
def get_bms_config():
    """Get BMS configuration from Django settings."""
    from django.conf import settings
    return {
        'base_url': getattr(settings, 'BMS_API_BASE_URL', 'https://budget-pro.onrender.com/api'),
        'api_key': getattr(settings, 'BMS_API_KEY', 'tts-live-key-112233445'),
    }

# Fallback values for validation errors
FALLBACK_FISCAL_YEARS = [4, 3]  # Safe fiscal year IDs to try
FALLBACK_ACCOUNTS = {
    # Map common account types to fallback IDs
    'default': 4,  # General Expenses (id: 4)
    'equipment': 3,  # Property, Plant & Equipment (id: 3)
    'cash': 1,  # Cash in Bank (id: 1)
    'payable': 2,  # Accounts Payable (id: 2)
    'earnings': 5,  # Retained Earnings (id: 5)
}

# Request timeouts (in seconds)
REQUEST_TIMEOUT = 30
MAX_RETRIES_BEFORE_FAIL = 5


class BMSSubmissionError(Exception):
    """Custom exception for BMS submission errors"""
    def __init__(self, message: str, error_type: str = 'unknown', response_data: dict = None):
        super().__init__(message)
        self.error_type = error_type
        self.response_data = response_data or {}


def parse_float_with_commas(value) -> float:
    """
    Parse a number that may contain comma separators (e.g., '90,000' -> 90000.0).
    Handles strings, integers, floats, and None values safely.
    """
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        # Remove commas and any whitespace
        cleaned = value.replace(',', '').strip()
        if not cleaned:
            return 0.0
        try:
            return float(cleaned)
        except ValueError:
            logger.warning(f"Could not parse value as float: '{value}', returning 0.0")
            return 0.0
    return 0.0


def transform_ticket_to_bms_payload(ticket_data: Dict[str, Any], ticket_number: str) -> Dict[str, Any]:
    """
    Transform TTS ticket data to BMS external budget proposal format.
    
    Input ticket_data structure:
    {
        "subject": "budget for enzo test 1",
        "category": "New Budget Proposal",
        "description": "doneeeeeeee",
        "fiscal_year": 2,
        "employee": {"first_name": "John", "last_name": "Doe", "department": "IT Department"},
        "dynamic_data": {
            "items": [{"account": 2, "costElement": "Equipment", "description": "", "estimatedCost": "2000"}],
            "preparedBy": "hr dept",
            "performanceEndDate": "2026-01-30",
            "performanceStartDate": "2026-01-29"
        }
    }
    
    Output BMS payload:
    {
        "ticket_id": "TX20260111244980",
        "department_input": "IT",
        "title": "budget for enzo test 1",
        "project_summary": "New Budget Proposal",
        "project_description": "doneeeeeeee",
        "submitted_by_name": "John Doe",
        "fiscal_year": 2,
        "items": [{"cost_element": "Equipment", "description": "", "estimated_cost": 2000, "account": 2}]
    }
    """
    # Extract employee info
    employee = ticket_data.get('employee', {}) or {}
    first_name = employee.get('first_name', '')
    last_name = employee.get('last_name', '')
    submitted_by_name = f"{first_name} {last_name}".strip() or 'Unknown'
    
    # Extract department - try multiple sources
    department = (
        employee.get('department', '') or 
        ticket_data.get('department', '') or 
        ticket_data.get('department_input', '') or
        'Unknown'
    )
    # Clean up department name (e.g., "IT Department" -> "IT")
    department_clean = department.replace(' Department', '').strip()
    
    # Extract dynamic data
    dynamic_data = ticket_data.get('dynamic_data', {}) or {}
    
    # Transform items
    raw_items = dynamic_data.get('items', []) or []
    transformed_items = []
    
    # Fallback description from ticket
    fallback_description = ticket_data.get('description', 'Budget item')[:200] or 'Budget item'
    
    # Get category_code from ticket's sub_category (e.g., "CAPEX", "OPEX")
    category_code = (
        ticket_data.get('sub_category') or 
        ticket_data.get('subcategory') or 
        'OPEX'  # Default fallback
    )
    
    for idx, item in enumerate(raw_items, start=1):
        item_desc = item.get('description', '') or ''
        # Get cost element - fallback to "Budget Item #N" if empty
        cost_element = item.get('costElement', item.get('cost_element', '')) or ''
        if not cost_element.strip():
            cost_element = f"Budget Item #{idx}"
        
        # If description is empty, use costElement or fallback
        if not item_desc.strip():
            item_desc = cost_element or fallback_description
        
        # Get estimated cost with comma handling (e.g., '90,000' -> 90000.0)
        raw_cost = item.get('estimatedCost', item.get('estimated_cost', 0))
        
        transformed_item = {
            'cost_element': cost_element,
            'description': item_desc,
            'estimated_cost': parse_float_with_commas(raw_cost),
            'account': int(item.get('account', FALLBACK_ACCOUNTS['default'])),
            'category_code': category_code,
        }
        transformed_items.append(transformed_item)
    
    # If no items, create a default one
    if not transformed_items:
        transformed_items = [{
            'cost_element': 'General Budget Item',
            'description': fallback_description,
            'estimated_cost': parse_float_with_commas(ticket_data.get('requested_budget', 0)),
            'account': FALLBACK_ACCOUNTS['default'],
            'category_code': category_code,
        }]
    
    # Build the payload
    payload = {
        'ticket_id': ticket_number,
        'department_input': department_clean,
        'title': ticket_data.get('subject', 'Untitled Budget Proposal'),
        'project_summary': ticket_data.get('category', 'Budget Proposal'),
        'project_description': ticket_data.get('description', '') or 'Budget proposal submitted via TTS',
        'submitted_by_name': submitted_by_name,
        'fiscal_year': int(ticket_data.get('fiscal_year', FALLBACK_FISCAL_YEARS[0]) or FALLBACK_FISCAL_YEARS[0]),
        'items': transformed_items,
    }
    
    # Add optional performance dates if available
    perf_start = dynamic_data.get('performanceStartDate') or ticket_data.get('performance_start_date')
    perf_end = dynamic_data.get('performanceEndDate') or ticket_data.get('performance_end_date')
    
    if perf_start:
        payload['performance_start_date'] = str(perf_start)
    if perf_end:
        payload['performance_end_date'] = str(perf_end)
    
    return payload


def apply_fallbacks(payload: Dict[str, Any], error_response: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Apply fallback values based on validation errors.
    
    Returns:
        Tuple of (modified_payload, fallback_info)
    """
    fallback_info = {
        'used_fallback_fiscal_year': False,
        'used_fallback_accounts': False,
        'original_fiscal_year': payload.get('fiscal_year'),
        'original_accounts': [item.get('account') for item in payload.get('items', [])],
    }
    
    error_str = str(error_response).lower()
    
    # Check for fiscal year errors
    if 'fiscal_year' in error_str or 'fiscal year' in error_str:
        logger.info(f"Applying fallback fiscal year. Original: {payload['fiscal_year']}")
        # Try first fallback fiscal year
        if payload['fiscal_year'] != FALLBACK_FISCAL_YEARS[0]:
            payload['fiscal_year'] = FALLBACK_FISCAL_YEARS[0]
        else:
            payload['fiscal_year'] = FALLBACK_FISCAL_YEARS[1]
        fallback_info['used_fallback_fiscal_year'] = True
    
    # Check for account errors
    if 'account' in error_str:
        logger.info(f"Applying fallback accounts")
        for item in payload.get('items', []):
            item['account'] = FALLBACK_ACCOUNTS['default']
        fallback_info['used_fallback_accounts'] = True
    
    return payload, fallback_info


def submit_to_bms(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Submit budget proposal to BMS API.
    
    Returns:
        BMS API response on success
        
    Raises:
        BMSSubmissionError on failure
    """
    config = get_bms_config()
    url = f"{config['base_url']}/external-budget-proposals/"
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': config['api_key'],
    }
    
    logger.info(f"Submitting budget proposal to BMS: {url}")
    logger.debug(f"Payload: {payload}")
    
    try:
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=REQUEST_TIMEOUT
        )
        
        # Log response details
        logger.info(f"BMS Response Status: {response.status_code}")
        
        try:
            response_data = response.json()
        except ValueError:
            response_data = {'raw_response': response.text}
        
        # Success
        if response.status_code in [200, 201]:
            logger.info(f"Successfully submitted budget proposal to BMS")
            return response_data
        
        # Validation error (4xx)
        if 400 <= response.status_code < 500:
            raise BMSSubmissionError(
                f"BMS validation error: {response_data}",
                error_type='validation',
                response_data=response_data
            )
        
        # Server error (5xx)
        if response.status_code >= 500:
            raise BMSSubmissionError(
                f"BMS server error: {response.status_code}",
                error_type='service_unavailable',
                response_data=response_data
            )
        
        # Other errors
        raise BMSSubmissionError(
            f"Unexpected BMS response: {response.status_code}",
            error_type='unknown',
            response_data=response_data
        )
        
    except requests.exceptions.Timeout:
        raise BMSSubmissionError(
            f"BMS request timeout after {REQUEST_TIMEOUT}s",
            error_type='timeout'
        )
    except requests.exceptions.ConnectionError as e:
        raise BMSSubmissionError(
            f"Cannot connect to BMS service: {str(e)}",
            error_type='service_unavailable'
        )
    except requests.exceptions.RequestException as e:
        raise BMSSubmissionError(
            f"BMS request failed: {str(e)}",
            error_type='unknown'
        )


def submit_budget_proposal(task, apply_fallback_on_error: bool = True) -> Dict[str, Any]:
    """
    Main entry point to submit a task's ticket as a budget proposal to BMS.
    
    Handles:
    1. Transform ticket data to BMS format
    2. Submit to BMS API
    3. Apply fallbacks on validation errors and retry
    4. Store failed submissions for later retry
    
    Args:
        task: Task model instance
        apply_fallback_on_error: Whether to apply fallbacks on validation errors
        
    Returns:
        Dict with status and details
    """
    from task.models import FailedBMSSubmission
    
    ticket = task.ticket_id
    if not ticket:
        return {
            'status': 'error',
            'message': 'Task has no associated ticket',
            'error_type': 'validation'
        }
    
    ticket_number = ticket.ticket_number
    ticket_data = ticket.ticket_data or {}
    
    logger.info(f"Starting BMS submission for ticket {ticket_number}")
    
    # Transform ticket data to BMS payload
    try:
        payload = transform_ticket_to_bms_payload(ticket_data, ticket_number)
    except Exception as e:
        logger.error(f"Failed to transform ticket data: {str(e)}")
        # Store as failed submission
        FailedBMSSubmission.objects.create(
            task=task,
            ticket_number=ticket_number,
            submission_payload={},
            original_ticket_data=ticket_data,
            status='failed',
            error_type='validation',
            error_message=f"Transform error: {str(e)}"
        )
        return {
            'status': 'error',
            'message': f'Failed to transform ticket data: {str(e)}',
            'error_type': 'validation'
        }
    
    original_payload = payload.copy()
    fallback_info = {}
    
    # First attempt
    try:
        response = submit_to_bms(payload)
        logger.info(f"BMS submission successful for {ticket_number}")
        return {
            'status': 'success',
            'message': 'Budget proposal submitted to BMS',
            'bms_response': response,
            'ticket_number': ticket_number
        }
    except BMSSubmissionError as e:
        logger.warning(f"BMS submission failed: {e.error_type} - {str(e)}")
        
        # Try fallbacks for validation errors
        if apply_fallback_on_error and e.error_type == 'validation':
            payload, fallback_info = apply_fallbacks(payload, e.response_data)
            
            if fallback_info.get('used_fallback_fiscal_year') or fallback_info.get('used_fallback_accounts'):
                logger.info(f"Retrying with fallbacks for {ticket_number}")
                
                try:
                    response = submit_to_bms(payload)
                    logger.info(f"BMS submission successful with fallbacks for {ticket_number}")
                    return {
                        'status': 'success',
                        'message': 'Budget proposal submitted to BMS (with fallbacks)',
                        'bms_response': response,
                        'ticket_number': ticket_number,
                        'fallbacks_applied': fallback_info
                    }
                except BMSSubmissionError as retry_error:
                    logger.error(f"BMS submission failed even with fallbacks: {str(retry_error)}")
                    e = retry_error  # Use the retry error for storing
        
        # Store failed submission for later retry (service unavailable or timeout)
        if e.error_type in ['service_unavailable', 'timeout']:
            # These are retriable - schedule for retry
            next_retry = timezone.now() + timedelta(seconds=30)
            failed_sub = FailedBMSSubmission.objects.create(
                task=task,
                ticket_number=ticket_number,
                submission_payload=payload,
                original_ticket_data=ticket_data,
                status='pending',
                error_type=e.error_type,
                error_message=str(e),
                error_response=e.response_data,
                next_retry_at=next_retry,
                used_fallback_fiscal_year=fallback_info.get('used_fallback_fiscal_year', False),
                used_fallback_accounts=fallback_info.get('used_fallback_accounts', False),
                original_fiscal_year=fallback_info.get('original_fiscal_year'),
                original_accounts=fallback_info.get('original_accounts'),
            )
            logger.info(f"Stored failed BMS submission {failed_sub.failed_bms_id} for retry at {next_retry}")
            
            return {
                'status': 'pending_retry',
                'message': f'BMS service unavailable, scheduled for retry',
                'failed_submission_id': failed_sub.failed_bms_id,
                'next_retry_at': next_retry.isoformat(),
                'error_type': e.error_type
            }
        else:
            # Validation errors that couldn't be fixed with fallbacks
            FailedBMSSubmission.objects.create(
                task=task,
                ticket_number=ticket_number,
                submission_payload=payload,
                original_ticket_data=ticket_data,
                status='failed',
                error_type=e.error_type,
                error_message=str(e),
                error_response=e.response_data,
                used_fallback_fiscal_year=fallback_info.get('used_fallback_fiscal_year', False),
                used_fallback_accounts=fallback_info.get('used_fallback_accounts', False),
                original_fiscal_year=fallback_info.get('original_fiscal_year'),
                original_accounts=fallback_info.get('original_accounts'),
            )
            
            return {
                'status': 'error',
                'message': f'BMS submission failed: {str(e)}',
                'error_type': e.error_type,
                'error_response': e.response_data
            }


def retry_failed_submission(failed_submission) -> Dict[str, Any]:
    """
    Retry a previously failed BMS submission.
    
    Args:
        failed_submission: FailedBMSSubmission model instance
        
    Returns:
        Dict with status and details
    """
    if not failed_submission.should_retry():
        return {
            'status': 'skipped',
            'message': 'Submission has exceeded max retries or already succeeded',
            'failed_submission_id': failed_submission.failed_bms_id
        }
    
    logger.info(f"Retrying BMS submission {failed_submission.failed_bms_id} (attempt {failed_submission.retry_count + 1})")
    
    # Update retry tracking
    failed_submission.status = 'retrying'
    failed_submission.retry_count += 1
    failed_submission.last_retry_at = timezone.now()
    failed_submission.save()
    
    payload = failed_submission.submission_payload
    
    try:
        response = submit_to_bms(payload)
        
        # Success!
        failed_submission.status = 'success'
        failed_submission.succeeded_at = timezone.now()
        failed_submission.bms_response = response
        
        # Extract proposal ID if available
        if isinstance(response, dict):
            failed_submission.bms_proposal_id = str(response.get('id', response.get('proposal_id', '')))
        
        failed_submission.save()
        
        logger.info(f"BMS submission {failed_submission.failed_bms_id} succeeded on retry")
        
        return {
            'status': 'success',
            'message': 'Budget proposal submitted to BMS',
            'bms_response': response,
            'failed_submission_id': failed_submission.failed_bms_id,
            'retry_count': failed_submission.retry_count
        }
        
    except BMSSubmissionError as e:
        logger.warning(f"BMS retry failed: {e.error_type} - {str(e)}")
        
        # Update error info
        failed_submission.error_type = e.error_type
        failed_submission.error_message = str(e)
        failed_submission.error_response = e.response_data
        
        if failed_submission.retry_count >= failed_submission.max_retries:
            # Max retries exceeded - mark as permanently failed
            failed_submission.status = 'failed'
            logger.error(f"BMS submission {failed_submission.failed_bms_id} permanently failed after {failed_submission.retry_count} attempts")
        else:
            # Schedule next retry with exponential backoff
            backoff = failed_submission.get_backoff_seconds()
            failed_submission.status = 'pending'
            failed_submission.next_retry_at = timezone.now() + timedelta(seconds=backoff)
            logger.info(f"BMS submission {failed_submission.failed_bms_id} scheduled for retry in {backoff}s")
        
        failed_submission.save()
        
        return {
            'status': 'pending_retry' if failed_submission.status == 'pending' else 'error',
            'message': str(e),
            'error_type': e.error_type,
            'retry_count': failed_submission.retry_count,
            'next_retry_at': failed_submission.next_retry_at.isoformat() if failed_submission.next_retry_at else None
        }
