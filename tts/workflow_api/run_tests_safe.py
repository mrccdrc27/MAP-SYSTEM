"""
Safe test runner script for Python 3.13.
Runs Django tests and writes output to a file.
"""
import sys
import os

# Set unbuffered output
os.environ['PYTHONUNBUFFERED'] = '1'

# Ensure stdout/stderr are available
if not hasattr(sys.stdout, 'write') or sys.stdout.closed:
    import io
    sys.stdout = sys.__stdout__ if hasattr(sys, '__stdout__') else io.TextIOWrapper(io.BufferedWriter(io.BytesIO()))
if not hasattr(sys.stderr, 'write') or sys.stderr.closed:
    import io
    sys.stderr = sys.__stderr__ if hasattr(sys, '__stderr__') else io.TextIOWrapper(io.BufferedWriter(io.BytesIO()))

# Import and run Django management command
from django.core.management import execute_from_command_line

if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'workflow_api.settings')
    execute_from_command_line(['manage.py', 'test', '--verbosity=2'])
