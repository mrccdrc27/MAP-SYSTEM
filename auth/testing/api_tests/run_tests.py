"""
Test Runner and Report Generator

This module provides the main entry point for running all API tests
and generating comprehensive test reports.
"""
import os
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path


def run_tests(test_module=None, verbose=False, html_report=False, json_report=False, 
              markers=None, fail_fast=False, coverage=False):
    """
    Run the API tests with specified options.
    
    Args:
        test_module: Specific test module to run (e.g., 'test_login')
        verbose: Enable verbose output
        html_report: Generate HTML report
        json_report: Generate JSON report
        markers: Pytest markers to filter tests
        fail_fast: Stop on first failure
        coverage: Enable coverage report
    
    Returns:
        Exit code (0 for success, non-zero for failure)
    """
    import pytest
    
    # Build pytest arguments
    args = []
    
    # Test directory
    test_dir = Path(__file__).parent
    
    if test_module:
        # Run specific module
        test_path = test_dir / f"{test_module}.py"
        if test_path.exists():
            args.append(str(test_path))
        else:
            print(f"[FAIL] Test module not found: {test_module}")
            return 1
    else:
        # Run all tests in the directory
        args.append(str(test_dir))
    
    # Verbosity
    if verbose:
        args.append('-v')
    else:
        args.append('-q')
    
    # Fail fast
    if fail_fast:
        args.append('-x')
    
    # Markers
    if markers:
        args.extend(['-m', markers])
    
    # Reports directory
    reports_dir = test_dir / 'reports'
    reports_dir.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # HTML report
    if html_report:
        html_path = reports_dir / f'test_report_{timestamp}.html'
        args.extend(['--html', str(html_path), '--self-contained-html'])
    
    # JSON report
    if json_report:
        json_path = reports_dir / f'test_report_{timestamp}.json'
        args.extend(['--json-report', f'--json-report-file={json_path}'])
    
    # JUnit XML report (always generate for CI/CD)
    junit_path = reports_dir / f'junit_{timestamp}.xml'
    args.extend(['--junitxml', str(junit_path)])
    
    # Coverage
    if coverage:
        args.extend([
            '--cov=users',
            '--cov=emails',
            '--cov=systems',
            '--cov=roles',
            '--cov=system_roles',
            '--cov-report=term-missing',
            f'--cov-report=html:{reports_dir}/coverage_{timestamp}'
        ])
    
    # Database settings
    args.append('--reuse-db')
    
    # Show local variables on failure
    args.append('-l')
    
    print(f"\n{'='*60}")
    print(f"AUTH SERVICE API TESTS")
    print(f"{'='*60}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Test directory: {test_dir}")
    if test_module:
        print(f"Module: {test_module}")
    print(f"{'='*60}\n")
    
    # Run pytest
    exit_code = pytest.main(args)
    
    print(f"\n{'='*60}")
    print(f"TEST REPORT SUMMARY")
    print(f"{'='*60}")
    print(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"JUnit XML: {junit_path}")
    if html_report:
        print(f"HTML Report: {html_path}")
    if json_report:
        print(f"JSON Report: {json_path}")
    if coverage:
        print(f"Coverage Report: {reports_dir}/coverage_{timestamp}")
    print(f"{'='*60}\n")
    
    return exit_code


def list_available_tests():
    """List all available test modules and their test cases."""
    test_dir = Path(__file__).parent
    
    print("\nAvailable Test Modules:")
    print("=" * 50)
    
    for test_file in sorted(test_dir.glob('test_*.py')):
        module_name = test_file.stem
        print(f"\nModule: {module_name}")
        
        # Parse the file to find test classes and methods
        with open(test_file, 'r') as f:
            content = f.read()
            
        # Simple parsing for test classes and methods
        in_class = None
        for line in content.split('\n'):
            stripped = line.strip()
            if stripped.startswith('class Test'):
                in_class = stripped.split('(')[0].replace('class ', '')
                print(f"   Class: {in_class}")
            elif stripped.startswith('def test_') and in_class:
                test_name = stripped.split('(')[0].replace('def ', '')
                print(f"      - {test_name}")
    
    print("\n" + "=" * 50)


def generate_summary_report(reports_dir=None):
    """Generate a summary report from the latest test run."""
    if reports_dir is None:
        reports_dir = Path(__file__).parent / 'reports'
    
    # Find the latest JUnit XML file
    junit_files = sorted(reports_dir.glob('junit_*.xml'), reverse=True)
    
    if not junit_files:
        print("No test reports found. Run tests first.")
        return
    
    latest_report = junit_files[0]
    
    # Parse the JUnit XML
    import xml.etree.ElementTree as ET
    
    tree = ET.parse(latest_report)
    root = tree.getroot()
    
    # Extract statistics
    testsuite = root.find('testsuite') or root
    tests = int(testsuite.get('tests', 0))
    errors = int(testsuite.get('errors', 0))
    failures = int(testsuite.get('failures', 0))
    skipped = int(testsuite.get('skipped', 0))
    passed = tests - errors - failures - skipped
    time_taken = float(testsuite.get('time', 0))
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY REPORT")
    print("=" * 60)
    print(f"Report: {latest_report.name}")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 60)
    print(f"Passed:  {passed:>5}")
    print(f"Failed:  {failures:>5}")
    print(f"Errors:  {errors:>5}")
    print(f"Skipped: {skipped:>5}")
    print("-" * 60)
    print(f"Total:   {tests:>5}")
    print(f"Time:    {time_taken:.2f}s")
    print("-" * 60)
    
    success_rate = (passed / tests * 100) if tests > 0 else 0
    print(f"Success Rate: {success_rate:.1f}%")
    print("=" * 60)
    
    # Show failures if any
    if failures > 0 or errors > 0:
        print("\nFAILED TESTS:")
        print("-" * 60)
        for testcase in testsuite.findall('.//testcase'):
            failure = testcase.find('failure')
            error = testcase.find('error')
            if failure is not None or error is not None:
                name = testcase.get('name')
                classname = testcase.get('classname', '').split('.')[-1]
                print(f"  • {classname}::{name}")
                if failure is not None:
                    msg = failure.get('message', '')[:100]
                    print(f"    └─ {msg}")
                if error is not None:
                    msg = error.get('message', '')[:100]
                    print(f"    └─ {msg}")
        print("-" * 60)


def main():
    """Main entry point for the test runner."""
    parser = argparse.ArgumentParser(
        description='Auth Service API Test Runner',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_tests.py                          # Run all tests
  python run_tests.py -m test_login            # Run login tests only
  python run_tests.py -m test_profile -v       # Run profile tests with verbose output
  python run_tests.py --html --json            # Generate HTML and JSON reports
  python run_tests.py --coverage               # Run with coverage report
  python run_tests.py --list                   # List all available tests
  python run_tests.py --summary                # Show summary of last test run
        """
    )
    
    parser.add_argument('-m', '--module', help='Specific test module to run (e.g., test_login)')
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')
    parser.add_argument('--html', action='store_true', help='Generate HTML report')
    parser.add_argument('--json', action='store_true', help='Generate JSON report')
    parser.add_argument('--markers', help='Pytest markers to filter tests')
    parser.add_argument('-x', '--fail-fast', action='store_true', help='Stop on first failure')
    parser.add_argument('--coverage', action='store_true', help='Run with coverage report')
    parser.add_argument('--list', action='store_true', help='List all available tests')
    parser.add_argument('--summary', action='store_true', help='Show summary of last test run')
    
    args = parser.parse_args()
    
    if args.list:
        list_available_tests()
        return 0
    
    if args.summary:
        generate_summary_report()
        return 0
    
    return run_tests(
        test_module=args.module,
        verbose=args.verbose,
        html_report=args.html,
        json_report=args.json,
        markers=args.markers,
        fail_fast=args.fail_fast,
        coverage=args.coverage
    )


if __name__ == '__main__':
    sys.exit(main())
