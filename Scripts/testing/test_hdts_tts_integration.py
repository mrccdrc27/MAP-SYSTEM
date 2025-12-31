#!/usr/bin/env python
"""
HDTS-TTS Integration Test Script

This script tests the end-to-end integration between:
- HDTS (Helpdesk Ticket System) - ticket_number creation and status sync
- TTS (Ticket Tracking System / workflow_api) - workflow processing and task resolution

Test Flow:
1. Service Health Check - Verify all required services are running
2. Create Test Ticket in HDTS - Seed a controlled ticket with "Open" status
3. Wait for Workflow Task Creation - Poll workflow_api for task
4. Resolve Ticket via Workflow - Progress through workflow steps
5. Verify Sync to HDTS - Check if status changes synced back

Prerequisites:
- All services running via PM2 (see tts-ecosystem.config.js)
- RabbitMQ running and accessible
- Databases migrated and seeded with workflows/roles

Usage:
    python test_hdts_tts_integration.py [options]

Options:
    --auth-url URL          Auth service URL (default: http://localhost:8003)
    --workflow-url URL      Workflow API URL (default: http://localhost:8002)
    --hdts-url URL          HDTS backend URL (default: http://localhost:8000)
    --notification-url URL  Notification service URL (default: http://localhost:8006)
    --messaging-url URL     Messaging service URL (default: http://localhost:8005)
    --target-status STATUS  Target status: 'In Progress' or 'Resolved' (default: Resolved)
    --wait-timeout SECS     Max seconds to wait for task creation (default: 30)
    --poll-interval SECS    Seconds between polls (default: 2)
    --verbose               Enable verbose output
    --skip-health-check     Skip service health check
    --dry-run               Show what would happen without making changes

Examples:
    # Run full integration test
    python test_hdts_tts_integration.py

    # Run with custom URLs
    python test_hdts_tts_integration.py --auth-url http://localhost:8003

    # Dry run to see the flow
    python test_hdts_tts_integration.py --dry-run --verbose
"""

import argparse
import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import uuid

try:
    import requests
except ImportError:
    print("Error: 'requests' package not installed.")
    print("Install with: pip install requests")
    sys.exit(1)


# ============================================================================
# Configuration
# ============================================================================

# Get project root (two levels up from Scripts/testing/)
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent

# Service directories
HDTS_DIR = PROJECT_ROOT / "hdts" / "helpdesk"
WORKFLOW_API_DIR = PROJECT_ROOT / "tts" / "workflow_api"

# Python executable from venv
VENV_PYTHON = PROJECT_ROOT / "venv" / "Scripts" / "python.exe"
if not VENV_PYTHON.exists():
    # Fallback to system python
    VENV_PYTHON = "python"


class TestStatus(Enum):
    PASSED = "PASS"
    FAILED = "FAIL"
    SKIPPED = "SKIP"
    PENDING = "PENDING"


@dataclass
class TestResult:
    name: str
    status: TestStatus
    message: str = ""
    duration: float = 0.0
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TestSuite:
    results: List[TestResult] = field(default_factory=list)
    
    def add(self, result: TestResult):
        self.results.append(result)
    
    @property
    def passed(self) -> int:
        return sum(1 for r in self.results if r.status == TestStatus.PASSED)
    
    @property
    def failed(self) -> int:
        return sum(1 for r in self.results if r.status == TestStatus.FAILED)
    
    @property
    def skipped(self) -> int:
        return sum(1 for r in self.results if r.status == TestStatus.SKIPPED)
    
    @property
    def total(self) -> int:
        return len(self.results)
    
    def success_rate(self) -> float:
        if self.total == 0:
            return 0.0
        return (self.passed / self.total) * 100


# ============================================================================
# ANSI Colors
# ============================================================================

class Colors:
    HEADER = '\033[96m'
    PASS = '\033[92m'
    FAIL = '\033[91m'
    WARNING = '\033[93m'
    INFO = '\033[90m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


def print_header(title: str):
    print(f"\n{Colors.HEADER}{'=' * 70}")
    print(f" {title}")
    print(f"{'=' * 70}{Colors.ENDC}")


def print_subheader(title: str):
    print(f"\n{Colors.WARNING}--- {title} ---{Colors.ENDC}")


def print_step(message: str):
    print(f"   {Colors.INFO}→{Colors.ENDC} {message}")


def print_pass(message: str):
    print(f"   {Colors.PASS}✓{Colors.ENDC} {message}")


def print_fail(message: str):
    print(f"   {Colors.FAIL}✗{Colors.ENDC} {message}")


def print_warn(message: str):
    print(f"   {Colors.WARNING}⚠{Colors.ENDC} {message}")


def print_result(result: TestResult):
    status_colors = {
        TestStatus.PASSED: Colors.PASS,
        TestStatus.FAILED: Colors.FAIL,
        TestStatus.SKIPPED: Colors.WARNING,
        TestStatus.PENDING: Colors.INFO,
    }
    color = status_colors.get(result.status, Colors.INFO)
    status_str = f"[{result.status.value}]"
    print(f"   {color}{status_str:8}{Colors.ENDC} {result.name} ({result.duration:.2f}s)")
    if result.message:
        print(f"            {Colors.INFO}{result.message}{Colors.ENDC}")


# ============================================================================
# Helper Functions
# ============================================================================

def run_management_command(
    service_dir: Path,
    command: str,
    args: List[str] = None,
    json_output: bool = True,
    verbose: bool = False
) -> Tuple[bool, Dict[str, Any]]:
    """
    Run a Django management command and return the result.
    """
    args = args or []
    cmd = [str(VENV_PYTHON), "manage.py", command] + args
    
    if json_output:
        cmd.append("--json")
    
    if verbose:
        print_step(f"Running: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(
            cmd,
            cwd=str(service_dir),
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if verbose and result.stderr:
            print(f"      stderr: {result.stderr[:200]}")
        
        if result.returncode != 0:
            return False, {
                "error": f"Command failed with return code {result.returncode}",
                "stderr": result.stderr,
                "stdout": result.stdout,
            }
        
        if json_output:
            try:
                # Parse JSON from stdout (may have other output mixed in)
                # Try to find JSON in the output
                output = result.stdout.strip()
                if output.startswith('{'):
                    return True, json.loads(output)
                else:
                    # Try to find JSON object in output
                    for line in output.split('\n'):
                        line = line.strip()
                        if line.startswith('{'):
                            return True, json.loads(line)
                    return True, {"raw_output": output}
            except json.JSONDecodeError as e:
                return False, {"error": f"JSON decode error: {e}", "stdout": result.stdout}
        else:
            return True, {"stdout": result.stdout, "stderr": result.stderr}
    
    except subprocess.TimeoutExpired:
        return False, {"error": "Command timed out"}
    except Exception as e:
        return False, {"error": str(e)}


def check_service_health(url: str, timeout: int = 5) -> Tuple[bool, str]:
    """
    Check if a service is healthy by making a simple HTTP request.
    """
    try:
        # Try common health/status endpoints
        for endpoint in ['', '/health', '/api/', '/api/health']:
            try:
                resp = requests.get(f"{url}{endpoint}", timeout=timeout)
                if resp.status_code < 500:
                    return True, f"OK (status {resp.status_code})"
            except requests.exceptions.RequestException:
                continue
        
        # If no endpoints work, try a basic connection
        resp = requests.get(url, timeout=timeout)
        return resp.status_code < 500, f"HTTP {resp.status_code}"
    
    except requests.exceptions.ConnectionError:
        return False, "Connection refused"
    except requests.exceptions.Timeout:
        return False, "Timeout"
    except Exception as e:
        return False, str(e)


def setup_test_infrastructure(verbose: bool = False, dry_run: bool = False) -> Dict[str, Any]:
    """
    Set up test infrastructure (role, user, workflow) for controlled integration testing.
    
    This creates:
    - Test Role (ID: 9999)
    - Test User (ID: 9999) assigned to the test role
    - Test Workflow (ID: 9999) with category "Integration Test"
    
    The workflow matches:
    - Category: "Integration Test"
    - Sub-category: "Test Flow"
    - Department: "Test Department"
    """
    if dry_run:
        return {'status': 'skipped', 'message': 'Dry run - skipping infrastructure setup'}
    
    if verbose:
        print_step("Setting up test infrastructure...")
    
    success, result = run_management_command(
        WORKFLOW_API_DIR,
        "setup_test_infrastructure",
        args=["--force"],
        json_output=True,
        verbose=verbose
    )
    
    if success and result.get('success', False):
        if verbose:
            print_pass(f"Role: {result.get('role', {}).get('status', 'unknown')}")
            print_pass(f"User: {result.get('user', {}).get('status', 'unknown')}")
            print_pass(f"Workflow: {result.get('workflow', {}).get('status', 'unknown')}")
        return {'status': 'success', 'result': result}
    else:
        errors = result.get('errors', [])
        error_msg = ', '.join([e.get('error', str(e)) for e in errors]) if errors else str(result)
        return {'status': 'error', 'error': error_msg}


# ============================================================================
# Test Functions
# ============================================================================

def test_service_health(
    services: Dict[str, str],
    verbose: bool = False
) -> TestResult:
    """
    Test 1: Check if all required services are running.
    """
    start_time = time.time()
    all_healthy = True
    details = {}
    failed_services = []
    
    for name, url in services.items():
        healthy, message = check_service_health(url)
        details[name] = {"url": url, "healthy": healthy, "message": message}
        
        if healthy:
            if verbose:
                print_pass(f"{name}: {url} - {message}")
        else:
            print_fail(f"{name}: {url} - {message}")
            all_healthy = False
            failed_services.append(name)
    
    duration = time.time() - start_time
    
    if all_healthy:
        return TestResult(
            name="Service Health Check",
            status=TestStatus.PASSED,
            message=f"All {len(services)} services are healthy",
            duration=duration,
            details=details
        )
    else:
        return TestResult(
            name="Service Health Check",
            status=TestStatus.FAILED,
            message=f"Failed services: {', '.join(failed_services)}",
            duration=duration,
            details=details
        )


def test_create_ticket(
    test_id: str,
    category: str = "IT Support",
    sub_category: str = "Access Request",
    department: str = "IT Department",
    priority: str = "Medium",
    verbose: bool = False,
    dry_run: bool = False
) -> TestResult:
    """
    Test 2: Create a test ticket in HDTS with "Open" status.
    """
    start_time = time.time()
    
    if dry_run:
        print_warn("DRY RUN: Would create ticket in HDTS")
        return TestResult(
            name="Create Test Ticket",
            status=TestStatus.SKIPPED,
            message="Skipped (dry run)",
            duration=time.time() - start_time,
            details={"test_id": test_id}
        )
    
    # Create ticket with Open status to trigger workflow
    success, result = run_management_command(
        HDTS_DIR,
        "create_test_ticket",
        args=[
            "--test-id", test_id,
            "--status", "Open",
            "--category", category,
            "--sub-category", sub_category,
            "--department", department,
            "--priority", priority,
        ],
        verbose=verbose
    )
    
    duration = time.time() - start_time
    
    if success and result.get("success"):
        ticket_number = result.get("ticket_number")
        print_pass(f"Created ticket: {ticket_number}")
        return TestResult(
            name="Create Test Ticket",
            status=TestStatus.PASSED,
            message=f"Ticket {ticket_number} created",
            duration=duration,
            details=result
        )
    else:
        error = result.get("error", "Unknown error")
        print_fail(f"Failed to create ticket: {error}")
        return TestResult(
            name="Create Test Ticket",
            status=TestStatus.FAILED,
            message=error,
            duration=duration,
            details=result
        )


def test_wait_for_task(
    ticket_number: str,
    timeout: int = 30,
    poll_interval: int = 2,
    verbose: bool = False,
    dry_run: bool = False
) -> TestResult:
    """
    Test 3: Wait for workflow task to be created in TTS.
    """
    start_time = time.time()
    
    if dry_run:
        print_warn("DRY RUN: Would wait for task creation")
        return TestResult(
            name="Wait for Task Creation",
            status=TestStatus.SKIPPED,
            message="Skipped (dry run)",
            duration=time.time() - start_time,
            details={"ticket_number": ticket_number}
        )
    
    print_step(f"Waiting for task (timeout: {timeout}s, poll: {poll_interval}s)")
    
    elapsed = 0
    task_data = None
    
    while elapsed < timeout:
        success, result = run_management_command(
            WORKFLOW_API_DIR,
            "get_task_status",
            args=[ticket_number],
            verbose=False  # Too noisy for polling
        )
        
        if success and result.get("success"):
            task_data = result
            break
        
        if verbose:
            print_step(f"Task not found yet ({elapsed}s elapsed)...")
        
        time.sleep(poll_interval)
        elapsed = time.time() - start_time
    
    duration = time.time() - start_time
    
    if task_data:
        task_id = task_data.get("task_id")
        task_status = task_data.get("task_status")
        print_pass(f"Task created: ID={task_id}, Status={task_status}")
        return TestResult(
            name="Wait for Task Creation",
            status=TestStatus.PASSED,
            message=f"Task {task_id} created in {duration:.1f}s",
            duration=duration,
            details=task_data
        )
    else:
        print_fail(f"Task not created within {timeout}s")
        return TestResult(
            name="Wait for Task Creation",
            status=TestStatus.FAILED,
            message=f"Timeout after {timeout}s - Task not created",
            duration=duration,
            details={"ticket_number": ticket_number, "last_result": result}
        )


def test_resolve_ticket(
    ticket_number: str,
    target_status: str = "Resolved",
    verbose: bool = False,
    dry_run: bool = False
) -> TestResult:
    """
    Test 4: Resolve the ticket via workflow_api.
    """
    start_time = time.time()
    
    if dry_run:
        print_warn(f"DRY RUN: Would resolve ticket to '{target_status}'")
        return TestResult(
            name="Resolve Ticket via Workflow",
            status=TestStatus.SKIPPED,
            message="Skipped (dry run)",
            duration=time.time() - start_time,
            details={"ticket_number": ticket_number, "target_status": target_status}
        )
    
    success, result = run_management_command(
        WORKFLOW_API_DIR,
        "resolve_ticket",
        args=[ticket_number, "--target-status", target_status],
        verbose=verbose
    )
    
    duration = time.time() - start_time
    
    if success and result.get("success"):
        task_status = result.get("task_status")
        print_pass(f"Ticket resolved: Task status = {task_status}")
        return TestResult(
            name="Resolve Ticket via Workflow",
            status=TestStatus.PASSED,
            message=f"Task status: {task_status}",
            duration=duration,
            details=result
        )
    else:
        error = result.get("error", "Unknown error")
        print_fail(f"Failed to resolve ticket: {error}")
        return TestResult(
            name="Resolve Ticket via Workflow",
            status=TestStatus.FAILED,
            message=error,
            duration=duration,
            details=result
        )


def test_verify_sync(
    ticket_number: str,
    expected_status: str,
    timeout: int = 15,
    poll_interval: int = 2,
    verbose: bool = False,
    dry_run: bool = False
) -> TestResult:
    """
    Test 5: Verify the status synced back to HDTS.
    """
    start_time = time.time()
    
    if dry_run:
        print_warn(f"DRY RUN: Would verify sync to HDTS (expected: {expected_status})")
        return TestResult(
            name="Verify Sync to HDTS",
            status=TestStatus.SKIPPED,
            message="Skipped (dry run)",
            duration=time.time() - start_time,
            details={"ticket_number": ticket_number, "expected_status": expected_status}
        )
    
    print_step(f"Waiting for sync (expected status: {expected_status})")
    
    elapsed = 0
    synced = False
    last_status = None
    ticket_data = None
    
    while elapsed < timeout:
        success, result = run_management_command(
            HDTS_DIR,
            "get_ticket_status",
            args=[ticket_number],
            verbose=False
        )
        
        if success and result.get("success"):
            last_status = result.get("status")
            ticket_data = result
            
            if last_status == expected_status:
                synced = True
                break
            
            if verbose:
                print_step(f"Current status: {last_status} (waiting for {expected_status})")
        
        time.sleep(poll_interval)
        elapsed = time.time() - start_time
    
    duration = time.time() - start_time
    
    if synced:
        print_pass(f"Status synced to HDTS: {last_status}")
        return TestResult(
            name="Verify Sync to HDTS",
            status=TestStatus.PASSED,
            message=f"Status synced: {last_status}",
            duration=duration,
            details=ticket_data
        )
    else:
        print_fail(f"Sync failed: Expected '{expected_status}', got '{last_status}'")
        return TestResult(
            name="Verify Sync to HDTS",
            status=TestStatus.FAILED,
            message=f"Expected '{expected_status}', got '{last_status}'",
            duration=duration,
            details={
                "ticket_number": ticket_number,
                "expected_status": expected_status,
                "actual_status": last_status,
                "ticket_data": ticket_data
            }
        )


# ============================================================================
# Main
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="HDTS-TTS Integration Test",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    # Service URLs
    parser.add_argument("--auth-url", default="http://localhost:8003",
                        help="Auth service URL")
    parser.add_argument("--workflow-url", default="http://localhost:8002",
                        help="Workflow API URL")
    parser.add_argument("--hdts-url", default="http://localhost:8000",
                        help="HDTS backend URL")
    parser.add_argument("--notification-url", default="http://localhost:8006",
                        help="Notification service URL")
    parser.add_argument("--messaging-url", default="http://localhost:8005",
                        help="Messaging service URL")
    
    # Test parameters
    parser.add_argument("--target-status", default="Resolved",
                        choices=["In Progress", "Resolved"],
                        help="Target status for the ticket")
    parser.add_argument("--wait-timeout", type=int, default=30,
                        help="Max seconds to wait for task creation")
    parser.add_argument("--poll-interval", type=int, default=2,
                        help="Seconds between polls")
    parser.add_argument("--category", default="IT Support",
                        help="Ticket category (or 'Integration Test' for test infra)")
    parser.add_argument("--sub-category", default=None,
                        help="Ticket sub-category (defaults based on category)")
    parser.add_argument("--department", default="IT Department",
                        help="Ticket department (or 'Test Department' for test infra)")
    
    # Test infrastructure options
    parser.add_argument("--use-test-infra", action="store_true",
                        help="Use controlled test infrastructure (Integration Test workflow)")
    parser.add_argument("--setup-test-infra", action="store_true",
                        help="Setup test infrastructure before running tests")
    
    # Flags
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Enable verbose output")
    parser.add_argument("--skip-health-check", action="store_true",
                        help="Skip service health check")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would happen without making changes")
    
    args = parser.parse_args()
    
    # Handle --use-test-infra flag - override category/department
    if args.use_test_infra:
        args.category = "Integration Test"
        args.sub_category = "Test Flow"
        args.department = "Test Department"
    
    # Default sub-category based on category if not specified
    if args.sub_category is None:
        sub_category_defaults = {
            "Integration Test": "Test Flow",
            "IT Support": "Access Request",
            "Asset Check In": "Check In",
            "Asset Check Out": "Check Out",
            "New Budget Proposal": "General",
        }
        args.sub_category = sub_category_defaults.get(args.category, "General")
    
    # Generate unique test ID
    test_id = f"INT-{uuid.uuid4().hex[:8].upper()}"
    
    # Configure services
    services = {
        "auth-service": args.auth_url,
        "workflow-api": args.workflow_url,
        "hdts-backend": args.hdts_url,
        "notification-service": args.notification_url,
        "messaging-service": args.messaging_url,
    }
    
    # Print header
    print_header("HDTS-TTS Integration Test")
    print(f"   Test ID:        {test_id}")
    print(f"   Target Status:  {args.target_status}")
    print(f"   Category:       {args.category}")
    print(f"   Sub-category:   {args.sub_category}")
    print(f"   Department:     {args.department}")
    print(f"   Use Test Infra: {args.use_test_infra}")
    print(f"   Verbose:        {args.verbose}")
    print(f"   Dry Run:        {args.dry_run}")
    
    # Setup test infrastructure if requested
    if args.setup_test_infra or args.use_test_infra:
        print_subheader("0. Setup Test Infrastructure")
        setup_result = setup_test_infrastructure(verbose=args.verbose, dry_run=args.dry_run)
        if setup_result['status'] == 'error':
            print_fail(f"Failed to setup test infrastructure: {setup_result.get('error')}")
            sys.exit(1)
        else:
            print_pass("Test infrastructure ready")
    
    # Run tests
    suite = TestSuite()
    ticket_number = None
    
    # Test 1: Service Health Check
    if not args.skip_health_check:
        print_subheader("1. Service Health Check")
        result = test_service_health(services, verbose=args.verbose)
        suite.add(result)
        
        if result.status == TestStatus.FAILED:
            print_fail("Aborting: Required services are not running")
            print_warn("Start services with: pm2 start Scripts/processes/tts-ecosystem.config.js")
            sys.exit(1)
    else:
        print_warn("Skipping health check")
    
    # Test 2: Create Test Ticket
    print_subheader("2. Create Test Ticket in HDTS")
    result = test_create_ticket(
        test_id=test_id,
        category=args.category,
        sub_category=args.sub_category,
        department=args.department,
        verbose=args.verbose,
        dry_run=args.dry_run
    )
    suite.add(result)
    
    if result.status == TestStatus.PASSED:
        ticket_number = result.details.get("ticket_number")
    elif result.status != TestStatus.SKIPPED:
        print_fail("Aborting: Could not create test ticket")
        sys.exit(1)
    
    # Use a dummy ticket number for dry run
    if args.dry_run:
        ticket_number = f"HDTS-{test_id[:8]}"
    
    # Test 3: Wait for Task Creation
    print_subheader("3. Wait for Workflow Task Creation")
    result = test_wait_for_task(
        ticket_number=ticket_number,
        timeout=args.wait_timeout,
        poll_interval=args.poll_interval,
        verbose=args.verbose,
        dry_run=args.dry_run
    )
    suite.add(result)
    
    if result.status == TestStatus.FAILED:
        print_warn("Task not created - Celery worker may not be running")
        print_warn("Check: pm2 logs workflow-worker")
    
    # Test 4: Resolve Ticket via Workflow
    print_subheader("4. Resolve Ticket via Workflow")
    if suite.results[-1].status in [TestStatus.PASSED, TestStatus.SKIPPED]:
        result = test_resolve_ticket(
            ticket_number=ticket_number,
            target_status=args.target_status,
            verbose=args.verbose,
            dry_run=args.dry_run
        )
        suite.add(result)
    else:
        print_warn("Skipping: No task to resolve")
        suite.add(TestResult(
            name="Resolve Ticket via Workflow",
            status=TestStatus.SKIPPED,
            message="Skipped: Task creation failed"
        ))
    
    # Test 5: Verify Sync to HDTS
    print_subheader("5. Verify Status Sync to HDTS")
    if suite.results[-1].status in [TestStatus.PASSED, TestStatus.SKIPPED]:
        # Map target status to expected HDTS status
        expected_hdts_status = args.target_status
        
        result = test_verify_sync(
            ticket_number=ticket_number,
            expected_status=expected_hdts_status,
            timeout=15,
            poll_interval=args.poll_interval,
            verbose=args.verbose,
            dry_run=args.dry_run
        )
        suite.add(result)
    else:
        print_warn("Skipping: Resolution failed")
        suite.add(TestResult(
            name="Verify Sync to HDTS",
            status=TestStatus.SKIPPED,
            message="Skipped: Resolution failed"
        ))
    
    # Print summary
    print_header("Test Results Summary")
    
    for result in suite.results:
        print_result(result)
    
    print(f"\n   {Colors.BOLD}Total:{Colors.ENDC} {suite.total} tests")
    print(f"   {Colors.PASS}Passed:{Colors.ENDC} {suite.passed}")
    print(f"   {Colors.FAIL}Failed:{Colors.ENDC} {suite.failed}")
    print(f"   {Colors.WARNING}Skipped:{Colors.ENDC} {suite.skipped}")
    print(f"   {Colors.INFO}Success Rate:{Colors.ENDC} {suite.success_rate():.1f}%")
    
    # Print test details
    if ticket_number and not args.dry_run:
        print(f"\n   {Colors.INFO}Test Ticket: {ticket_number}{Colors.ENDC}")
        print(f"   {Colors.INFO}Cleanup: python manage.py shell -c \"from core.models import Ticket; Ticket.objects.filter(ticket_number='{ticket_number}').delete()\"{Colors.ENDC}")
    
    # Exit with appropriate code
    if suite.failed > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
