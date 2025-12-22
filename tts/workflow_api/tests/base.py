"""
Base Test Case with Verbosity-Aware Logging

This module provides a BaseTestCase class that formats test output according to
the verbosity level set via Django's --verbosity flag.

Output Format:
    N. test_method_name                        ● PASS/FAIL

Usage:
    from tests.base import BaseTestCase, get_test_counter

    class MyTests(BaseTestCase):
        def test_something(self):
            self.assertEqual(1, 1)

See TEST_VERBOSITY_GUIDE.md for verbosity levels and usage.
"""
import sys
import io
import logging
from django.test import TestCase, TransactionTestCase

# Fix Windows console encoding for Unicode
if sys.platform == 'win32':
    try:
        if hasattr(sys.stdout, 'buffer') and not sys.stdout.closed:
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        if hasattr(sys.stderr, 'buffer') and not sys.stderr.closed:
            sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    except (ValueError, AttributeError):
        pass

logger = logging.getLogger(__name__)

# Global test counter for numbering tests
_test_counter = {'count': 0}


def get_test_counter():
    """Get the global test counter dictionary."""
    return _test_counter


def reset_test_counter():
    """Reset the global test counter (useful for test isolation)."""
    _test_counter['count'] = 0


def _get_verbosity():
    """Get the current test verbosity level."""
    try:
        from workflow_api.test_runner import get_test_verbosity
        return get_test_verbosity()
    except (ImportError, AttributeError):
        return 1  # Default to verbosity 1


def _test_print(*args, **kwargs):
    """Print test output using the original stdout (bypasses SuppressedStdout)."""
    try:
        from workflow_api.test_runner import Python313CompatibleTestRunner
        original_stdout = Python313CompatibleTestRunner._original_stdout
        if original_stdout is not None:
            print(*args, file=original_stdout, **kwargs)
        else:
            print(*args, **kwargs)
    except (ImportError, AttributeError):
        print(*args, **kwargs)


class BaseTestCase(TestCase):
    """
    Base test case with one-line test logging.
    
    Provides formatted test output:
        N. test_method_name                        ● PASS/FAIL
    
    This format is controlled by verbosity level:
        - verbosity 0: Silent (no output)
        - verbosity 1: Single-line test results (default)
        - verbosity 2: Results + warnings
        - verbosity 3: Full debug output
    """
    
    # Column width for test name alignment
    TEST_NAME_WIDTH = 50
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        _test_counter['count'] += 1
        self.test_number = _test_counter['count']
    
    def run(self, result=None):
        """Run test and log result in one-line format."""
        # Get test method name
        test_method = str(self).split()[0]
        test_name = test_method.split('.')[-1]
        
        # Run the test
        super().run(result)
        
        # Only output at verbosity >= 1
        if _get_verbosity() >= 1:
            # Determine status
            if result and result.errors and any(test_method in str(e[0]) for e in result.errors):
                status = "● FAIL"
            elif result and result.failures and any(test_method in str(f[0]) for f in result.failures):
                status = "● FAIL"
            else:
                status = "● PASS"
            
            # Print result with aligned formatting (using original stdout)
            _test_print(f"{self.test_number:2}. {test_name:<{self.TEST_NAME_WIDTH}} {status}")


def suppress_request_warnings(original_method):
    """
    Decorator to suppress Django request logging during error tests.
    
    Use this decorator on test methods that intentionally trigger HTTP errors
    (400, 403, 404, 500) to suppress the verbose Django logging.
    
    Example:
        @suppress_request_warnings
        def test_invalid_request(self):
            response = self.client.post('/api/', {})
            self.assertEqual(response.status_code, 400)
    """
    import functools
    import logging
    
    @functools.wraps(original_method)
    def wrapper(*args, **kwargs):
        django_request_logger = logging.getLogger('django.request')
        original_level = django_request_logger.level
        django_request_logger.setLevel(logging.CRITICAL)
        try:
            return original_method(*args, **kwargs)
        finally:
            django_request_logger.setLevel(original_level)
    return wrapper


class BaseTransactionTestCase(TransactionTestCase):
    """
    Base transaction test case with one-line test logging.
    
    Same as BaseTestCase but uses TransactionTestCase for tests
    that require transaction handling or signal processing.
    """
    
    # Column width for test name alignment
    TEST_NAME_WIDTH = 50
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        _test_counter['count'] += 1
        self.test_number = _test_counter['count']
    
    def run(self, result=None):
        """Run test and log result in one-line format."""
        # Get test method name
        test_method = str(self).split()[0]
        test_name = test_method.split('.')[-1]
        
        # Run the test
        super().run(result)
        
        # Only output at verbosity >= 1
        if _get_verbosity() >= 1:
            # Determine status
            if result and result.errors and any(test_method in str(e[0]) for e in result.errors):
                status = "● FAIL"
            elif result and result.failures and any(test_method in str(f[0]) for f in result.failures):
                status = "● FAIL"
            else:
                status = "● PASS"
            
            # Print result with aligned formatting (using original stdout)
            _test_print(f"{self.test_number:2}. {test_name:<{self.TEST_NAME_WIDTH}} {status}")
