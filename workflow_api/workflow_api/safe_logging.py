"""
Safe print/logging utility for Python 3.13 compatibility.

This module provides safe alternatives to print() that handle closed stdout/stderr
gracefully during Django test execution, and also respect test verbosity settings.
"""
import sys
import logging

# Configure a logger for the workflow_api
logger = logging.getLogger(__name__)


def _is_test_mode():
    """Check if we're running in test mode with low verbosity."""
    try:
        from workflow_api.test_runner import get_test_verbosity
        return get_test_verbosity() < 2
    except (ImportError, AttributeError):
        return False


def safe_print(*args, **kwargs):
    """
    Safe version of print() that handles closed stdout/stderr.
    
    Also respects test verbosity settings - suppresses output at verbosity < 2.
    Falls back to logging if stdout is unavailable.
    """
    # Suppress output during tests with low verbosity
    if _is_test_mode():
        return
    
    try:
        # Check if stdout is available
        if hasattr(sys.stdout, 'closed') and sys.stdout.closed:
            # Use logging as fallback
            message = ' '.join(str(arg) for arg in args)
            logger.info(message)
        else:
            print(*args, **kwargs)
    except (ValueError, AttributeError, IOError):
        # Fallback to logging if print fails
        message = ' '.join(str(arg) for arg in args)
        logger.info(message)
