"""
Custom Test Runner for Python 3.13 Compatibility and Verbosity Control

This custom test runner:
1. Fixes the 'ValueError: I/O operation on closed file' error in Python 3.13+
2. Provides verbosity-based logging control for cleaner test output
3. Suppresses print() output at low verbosity levels

Verbosity Levels:
- 0: Silent (no output except final results)
- 1: Minimal (test names and pass/fail only)
- 2: Normal (test headers, warnings, and errors)
- 3: Verbose (all debug logs including workflow initialization)
"""
import sys
import io
import logging
import builtins
from contextlib import contextmanager
from django.test.runner import DiscoverRunner
from django.core.management import color, base


# Global verbosity level for print suppression
_test_verbosity = 2  # Default to normal verbosity


def get_test_verbosity():
    """Get the current test verbosity level."""
    return _test_verbosity


def set_test_verbosity(level):
    """Set the test verbosity level."""
    global _test_verbosity
    _test_verbosity = level


class SuppressedStream:
    """Stream wrapper that suppresses output at low verbosity levels."""
    
    def __init__(self, original_stream, allowed_prefixes=None, is_stderr=False):
        self._original = original_stream
        self._allowed_prefixes = allowed_prefixes or []
        self._is_stderr = is_stderr
    
    def write(self, msg):
        """Write to stream only if verbosity allows it or message matches allowed prefixes."""
        if _test_verbosity >= 2:
            # At verbosity 2+, show all output
            return self._original.write(msg)
        
        # At verbosity < 2, suppress most stderr output (tracebacks, warnings)
        if self._is_stderr and _test_verbosity < 2:
            # Only show actual test failure messages (FAIL, ERROR)
            stripped = msg.strip()
            if stripped.startswith(('FAIL:', 'ERROR:', '====', '----')):
                return self._original.write(msg)
            # Suppress tracebacks and Django error messages
            return len(msg)
        
        # At verbosity < 2, only allow specific test output patterns
        if any(msg.strip().startswith(prefix) for prefix in self._allowed_prefixes):
            return self._original.write(msg)
        
        # Also allow Django test runner messages (dots, errors, etc.)
        stripped = msg.strip()
        if stripped in ('.', 'E', 'F', 's', 'x', 'ok', 'FAIL', 'ERROR', 'OK'):
            return self._original.write(msg)
        
        # Allow result summaries
        if any(x in stripped for x in ['Ran ', 'tests in', 'FAILED', 'OK']):
            return self._original.write(msg)
        
        # Suppress everything else at low verbosity
        return len(msg)
    
    def flush(self):
        """Flush the underlying stream."""
        if hasattr(self._original, 'flush'):
            return self._original.flush()
    
    def __getattr__(self, name):
        """Delegate attribute access to original stream."""
        return getattr(self._original, name)


# Alias for backward compatibility
SuppressedStdout = SuppressedStream


# Monkey-patch Django's supports_color to handle closed stdout
_original_supports_color = color.supports_color

def patched_supports_color():
    """Patched version of supports_color that handles closed stdout."""
    try:
        return _original_supports_color()
    except (ValueError, AttributeError):
        # If stdout is closed or missing, assume no color support
        return False

color.supports_color = patched_supports_color


# Monkey-patch OutputWrapper to handle closed file descriptors
_OriginalOutputWrapper = base.OutputWrapper

class SafeOutputWrapper(_OriginalOutputWrapper):
    """Output wrapper that handles closed file descriptors gracefully."""
    
    def write(self, msg, style_func=None, ending=None):
        """Write output, handling closed file errors."""
        # Ensure the output stream is open
        if hasattr(self._out, 'closed') and self._out.closed:
            # Replace with appropriate fallback stream
            if self._out is sys.stdout or (hasattr(sys, '__stdout__') and self._out is sys.__stdout__):
                self._out = sys.__stdout__ if not sys.__stdout__.closed else io.TextIOWrapper(io.BufferedWriter(io.BytesIO()))
            elif self._out is sys.stderr or (hasattr(sys, '__stderr__') and self._out is sys.__stderr__):
                self._out = sys.__stderr__ if not sys.__stderr__.closed else io.TextIOWrapper(io.BufferedWriter(io.BytesIO()))
        
        try:
            super().write(msg, style_func, ending)
        except (ValueError, AttributeError) as e:
            if "closed file" in str(e).lower() or "i/o operation" in str(e).lower():
                # Silently skip writing if file is still closed
                pass
            else:
                raise

base.OutputWrapper = SafeOutputWrapper


class Python313CompatibleTestRunner(DiscoverRunner):
    """
    Custom test runner that prevents stdout/stderr closure issues in Python 3.13+
    and provides verbosity-based logging control.
    
    This runner ensures stdout/stderr remain open throughout the entire test lifecycle,
    preventing ValueError exceptions when Django tries to write to these streams.
    
    Verbosity Levels:
    - 0: Silent (no output except final results)
    - 1: Minimal (test names and pass/fail only) - DEFAULT
    - 2: Normal (test headers, warnings, and errors)
    - 3: Verbose (all debug logs including workflow initialization)
    """
    
    _original_stdout = None
    _original_stderr = None
    
    def __init__(self, *args, **kwargs):
        """Initialize the test runner and ensure stdout/stderr are available."""
        # Ensure stdout/stderr are not closed before initialization
        self._ensure_open_streams()
        super().__init__(*args, **kwargs)
        
        # Set global verbosity level for print suppression
        set_test_verbosity(self.verbosity)
        
        # Configure logging based on verbosity
        self._configure_logging()
        
        # Install stdout suppression at low verbosity
        self._install_stdout_suppression()
    
    def _configure_logging(self):
        """Configure logging levels based on test verbosity."""
        verbosity = self.verbosity
        
        # Get root logger and workflow-related loggers
        root_logger = logging.getLogger()
        workflow_logger = logging.getLogger('workflow')
        step_logger = logging.getLogger('step')
        task_logger = logging.getLogger('task')
        tickets_logger = logging.getLogger('tickets')
        
        # Django request/response loggers (these log 4xx/5xx responses)
        django_request_logger = logging.getLogger('django.request')
        django_server_logger = logging.getLogger('django.server')
        
        # Remove all handlers from django.request to prevent error tracebacks
        # at low verbosity levels
        if verbosity < 2:
            django_request_logger.handlers = []
            django_request_logger.propagate = False
        
        # Determine log level based on verbosity
        if verbosity == 0:
            # Silent: Only critical errors
            log_level = logging.CRITICAL
        elif verbosity == 1:
            # Minimal: Suppress info/debug from workflow initialization
            # Only show test case headers and errors
            log_level = logging.CRITICAL  # Suppress all app logging
        elif verbosity == 2:
            # Normal: Show warnings and errors, test headers
            log_level = logging.WARNING
        else:  # verbosity >= 3
            # Verbose: Show everything including debug logs
            log_level = logging.DEBUG
        
        # Set root logger level
        root_logger.setLevel(log_level)
        
        # Also set level on all handlers to ensure they filter properly
        for handler in root_logger.handlers:
            handler.setLevel(log_level)
        
        # Set specific logger levels
        workflow_logger.setLevel(log_level)
        step_logger.setLevel(log_level)
        task_logger.setLevel(log_level)
        tickets_logger.setLevel(log_level)
        
        # Suppress Django request logging at low verbosity
        django_request_logger.setLevel(log_level)
        django_server_logger.setLevel(log_level)
        
        # Allow test loggers to show INFO for test headers at verbosity >= 1
        if verbosity >= 1:
            test_logger = logging.getLogger('tests')
            test_logger.setLevel(logging.INFO)
    
    def _install_stdout_suppression(self):
        """Install stdout suppression for low verbosity levels."""
        if self.verbosity < 2:
            # Save original stdout for restoration
            Python313CompatibleTestRunner._original_stdout = sys.stdout
            
            # Allowed prefixes for test output (numbered test results)
            allowed_prefixes = [
                'Ran ',      # Django test summary
                'OK',        # Django test OK
                'FAILED',    # Django test failures
                '1.',        # Test result lines
                '2.',
                '3.',
                '4.',
                '5.',
                '6.',
                '7.',
                '8.',
                '9.',
                '=',         # Separator lines
                '-',         # Separator lines
                'test_',     # Test method names
                'ERROR:',    # Error output
                'FAIL:',     # Fail output
            ]
            
            sys.stdout = SuppressedStream(sys.stdout, allowed_prefixes, is_stderr=False)
            
            # Also suppress stderr to hide tracebacks from expected errors
            Python313CompatibleTestRunner._original_stderr = sys.stderr
            sys.stderr = SuppressedStream(sys.stderr, allowed_prefixes, is_stderr=True)
    
    def _restore_stdout(self):
        """Restore original stdout/stderr after tests."""
        if Python313CompatibleTestRunner._original_stdout is not None:
            sys.stdout = Python313CompatibleTestRunner._original_stdout
            Python313CompatibleTestRunner._original_stdout = None
        if Python313CompatibleTestRunner._original_stderr is not None:
            sys.stderr = Python313CompatibleTestRunner._original_stderr
            Python313CompatibleTestRunner._original_stderr = None
    
    def _ensure_open_streams(self):
        """Ensure stdout and stderr are open and available."""
        # If stdout is closed, replace with __stdout__ or create new stream
        if sys.stdout is None or (hasattr(sys.stdout, 'closed') and sys.stdout.closed):
            if hasattr(sys, '__stdout__') and sys.__stdout__ is not None:
                sys.stdout = sys.__stdout__
            else:
                sys.stdout = io.TextIOWrapper(io.BufferedWriter(io.BytesIO()))
        
        # If stderr is closed, replace with __stderr__ or create new stream
        if sys.stderr is None or (hasattr(sys.stderr, 'closed') and sys.stderr.closed):
            if hasattr(sys, '__stderr__') and sys.__stderr__ is not None:
                sys.stderr = sys.__stderr__
            else:
                sys.stderr = io.TextIOWrapper(io.BufferedWriter(io.BytesIO()))
    
    def log(self, msg, level=None):
        """
        Safely log messages, handling closed file descriptor errors.
        
        Args:
            msg: The message to log
            level: The logging level (unused in base implementation)
        """
        self._ensure_open_streams()
        try:
            super().log(msg, level)
        except (IOError, ValueError) as e:
            # Suppress errors from writing to closed stdout/stderr
            if "closed file" not in str(e).lower() and "i/o operation" not in str(e).lower():
                # Re-raise if it's a different error
                raise
    
    def build_suite(self, test_labels=None, **kwargs):
        """
        Build the test suite, safely handling logging during discovery.
        
        Args:
            test_labels: Optional list of test labels to run
            **kwargs: Additional arguments passed to parent
            
        Returns:
            Test suite to execute
        """
        self._ensure_open_streams()
        return super().build_suite(test_labels, **kwargs)
    
    def setup_databases(self, **kwargs):
        """
        Set up test databases, ensuring streams are open during migration.
        
        Args:
            **kwargs: Additional arguments passed to parent
            
        Returns:
            Database configuration for teardown
        """
        self._ensure_open_streams()
        return super().setup_databases(**kwargs)
    
    def run_suite(self, suite, **kwargs):
        """
        Run the test suite, ensuring streams remain open.
        
        Args:
            suite: The test suite to run
            **kwargs: Additional arguments passed to parent
            
        Returns:
            Test result
        """
        self._ensure_open_streams()
        try:
            return super().run_suite(suite, **kwargs)
        finally:
            # Restore original stdout after tests complete
            self._restore_stdout()
