"""
Custom Test Runner for Python 3.13 Compatibility and Verbosity Control

This custom test runner:
1. Fixes the 'ValueError: I/O operation on closed file' error in Python 3.13+
2. Provides verbosity-based logging control for cleaner test output

Verbosity Levels:
- 0: Silent (no output except final results)
- 1: Minimal (test names and pass/fail only)
- 2: Normal (test headers, warnings, and errors)
- 3: Verbose (all debug logs including workflow initialization)
"""
import sys
import io
import logging
from django.test.runner import DiscoverRunner
from django.core.management import color, base


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
    
    def __init__(self, *args, **kwargs):
        """Initialize the test runner and ensure stdout/stderr are available."""
        # Ensure stdout/stderr are not closed before initialization
        self._ensure_open_streams()
        super().__init__(*args, **kwargs)
        
        # Configure logging based on verbosity
        self._configure_logging()
    
    def _configure_logging(self):
        """Configure logging levels based on test verbosity."""
        verbosity = self.verbosity
        
        # Get root logger and workflow-related loggers
        root_logger = logging.getLogger()
        workflow_logger = logging.getLogger('workflow')
        step_logger = logging.getLogger('step')
        task_logger = logging.getLogger('task')
        
        if verbosity == 0:
            # Silent: Only critical errors
            root_logger.setLevel(logging.CRITICAL)
        elif verbosity == 1:
            # Minimal: Suppress info/debug from workflow initialization
            # Only show test case headers and errors
            root_logger.setLevel(logging.ERROR)
            # Allow test loggers to show INFO for test headers
            test_logger = logging.getLogger('tests')
            test_logger.setLevel(logging.INFO)
        elif verbosity == 2:
            # Normal: Show warnings and errors, test headers
            root_logger.setLevel(logging.WARNING)
            test_logger = logging.getLogger('tests')
            test_logger.setLevel(logging.INFO)
        else:  # verbosity >= 3
            # Verbose: Show everything including debug logs
            root_logger.setLevel(logging.DEBUG)
    
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
        return super().run_suite(suite, **kwargs)
