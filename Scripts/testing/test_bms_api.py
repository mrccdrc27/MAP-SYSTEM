#!/usr/bin/env python
"""
BMS API Test Script

This script tests the BMS API integration with the centralized Auth service.
It authenticates via the Auth service and makes various API calls to BMS.

Usage:
    python test_bms_api.py [--auth-url URL] [--bms-url URL] [--verbose]

Default URLs:
    Auth: http://localhost:8000
    BMS:  http://localhost:8001
"""

import argparse
import json
import sys
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum

try:
    import requests
except ImportError:
    print("Error: 'requests' package not installed.")
    print("Install with: pip install requests")
    sys.exit(1)


class TestStatus(Enum):
    PASSED = "PASS"
    FAILED = "FAIL"
    SKIPPED = "SKIP"


@dataclass
class TestResult:
    name: str
    status: TestStatus
    message: str = ""
    response_code: Optional[int] = None


@dataclass
class TestSuite:
    results: list = field(default_factory=list)
    
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


# ANSI colors for terminal output
class Colors:
    HEADER = '\033[96m'
    PASS = '\033[92m'
    FAIL = '\033[91m'
    WARNING = '\033[93m'
    INFO = '\033[90m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


def print_header(title: str):
    print(f"\n{Colors.HEADER}{'=' * 60}")
    print(f" {title}")
    print(f"{'=' * 60}{Colors.ENDC}")


def print_step(message: str):
    print(f" -> {Colors.WARNING}{message}{Colors.ENDC}")


def print_pass(message: str):
    print(f" {Colors.PASS}[PASS]{Colors.ENDC} {message}")


def print_fail(message: str):
    print(f" {Colors.FAIL}[FAIL]{Colors.ENDC} {message}")


def print_info(message: str):
    print(f" {Colors.INFO}[INFO]{Colors.ENDC} {message}")


# Test credentials (matching seed_bms.py)
TEST_USERS = {
    "Admin": {
        "email": "testadmin@bms.local",
        "password": "testadmin123",
        "expected_role": "ADMIN"
    },
    "FinanceHead": {
        "email": "testfinance@bms.local",
        "password": "testfinance123",
        "expected_role": "FINANCE_HEAD"
    },
    "GeneralUser": {
        "email": "testuser@bms.local",
        "password": "testuser123",
        "expected_role": "GENERAL_USER"
    }
}


class BMSApiTester:
    def __init__(self, auth_url: str, bms_url: str, verbose: bool = False):
        self.auth_url = auth_url.rstrip('/')
        self.bms_url = bms_url.rstrip('/')
        self.verbose = verbose
        self.suite = TestSuite()
        self.tokens: Dict[str, str] = {}
    
    def check_service_health(self, url: str, name: str) -> bool:
        """Check if a service is available."""
        print_step(f"Checking {name} at {url}...")
        
        # Try /health/ endpoint first
        try:
            response = requests.get(f"{url}/health/", timeout=5)
            if response.status_code == 200:
                print_pass(f"{name} is available (health endpoint)")
                return True
        except:
            pass
        
        # Try root endpoint
        try:
            response = requests.get(url, timeout=5)
            print_pass(f"{name} is available (root endpoint)")
            return True
        except requests.exceptions.RequestException as e:
            print_fail(f"{name} is NOT available: {e}")
            return False
    
    def authenticate(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate with the Auth service and get tokens."""
        print_step(f"Authenticating: {email}...")
        
        # Try multiple login endpoints
        login_endpoints = [
            f"{self.auth_url}/token/",
            f"{self.auth_url}/api/v1/users/login/",
            f"{self.auth_url}/api/users/login/",
        ]
        
        for endpoint in login_endpoints:
            try:
                response = requests.post(
                    endpoint,
                    json={"email": email, "password": password},
                    headers={"Content-Type": "application/json"},
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    # Check for access token in response body first
                    access_token = data.get('access') or data.get('access_token')
                    
                    # If not in body, check cookies (Auth service sets tokens as cookies)
                    if not access_token:
                        access_token = response.cookies.get('access_token')
                    
                    if access_token:
                        print_pass(f"Authenticated as {email}")
                        if self.verbose and 'user' in data:
                            print_info(f"User: {json.dumps(data.get('user', {}), indent=2)}")
                        return {
                            'access_token': access_token,
                            'refresh_token': data.get('refresh') or data.get('refresh_token') or response.cookies.get('refresh_token'),
                            'user': data.get('user')
                        }
                
            except requests.exceptions.RequestException:
                continue
        
        print_fail(f"Authentication failed for {email}")
        return None
    
    def call_bms_api(
        self, 
        endpoint: str, 
        token: str, 
        method: str = "GET",
        data: Optional[Dict] = None,
        description: str = ""
    ) -> Tuple[bool, Optional[Dict], int]:
        """Make an authenticated API call to BMS."""
        print_step(f"{method} {endpoint} - {description}...")
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        url = f"{self.bms_url}{endpoint}"
        
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=10)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=10)
            elif method == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=10)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                print_fail(f"Unsupported method: {method}")
                return False, None, 0
            
            success = response.status_code in [200, 201, 204]
            
            if success:
                print_pass(f"{description} - OK")
                response_data = response.json() if response.text else {}
                if self.verbose:
                    print_info(f"Response: {json.dumps(response_data, indent=2)[:500]}")
                return True, response_data, response.status_code
            else:
                if response.status_code == 401:
                    print_fail(f"{description} - Unauthorized (401)")
                elif response.status_code == 403:
                    print_fail(f"{description} - Forbidden (403)")
                elif response.status_code == 404:
                    print_info(f"{description} - Not Found (404)")
                else:
                    print_fail(f"{description} - HTTP {response.status_code}")
                
                if self.verbose:
                    print_info(f"Response: {response.text[:300]}")
                
                return False, None, response.status_code
                
        except requests.exceptions.RequestException as e:
            print_fail(f"{description} - Request failed: {e}")
            return False, None, 0
    
    def run_all_tests(self):
        """Run the complete test suite."""
        
        # Phase 1: Service Availability
        print_header("Phase 1: Service Availability")
        
        auth_ok = self.check_service_health(self.auth_url, "Auth Service")
        self.suite.add(TestResult("Auth service available", 
                                  TestStatus.PASSED if auth_ok else TestStatus.FAILED))
        
        bms_ok = self.check_service_health(self.bms_url, "BMS Service")
        self.suite.add(TestResult("BMS service available",
                                  TestStatus.PASSED if bms_ok else TestStatus.FAILED))
        
        if not auth_ok or not bms_ok:
            print_fail("Services not available. Aborting tests.")
            print_info(f"Start Auth: cd auth && python manage.py runserver 0.0.0.0:8000")
            print_info(f"Start BMS:  cd bms/budget_service && python manage.py runserver 0.0.0.0:8001")
            return
        
        # Phase 2: Authentication Tests
        print_header("Phase 2: Authentication Tests")
        
        for user_type, user_data in TEST_USERS.items():
            auth_result = self.authenticate(user_data['email'], user_data['password'])
            if auth_result:
                self.tokens[user_type] = auth_result['access_token']
                self.suite.add(TestResult(f"Auth {user_type}", TestStatus.PASSED))
            else:
                self.suite.add(TestResult(f"Auth {user_type}", TestStatus.FAILED))
        
        # Phase 3: BMS API Tests (Admin)
        print_header("Phase 3: BMS API Tests (Admin User)")
        
        if 'Admin' in self.tokens:
            admin_token = self.tokens['Admin']
            
            api_tests = [
                ("/api/dashboard/budget-summary/", "Dashboard budget summary"),
                ("/api/dashboard/department-status/", "Dashboard department status"),
                ("/api/dashboard/category-budget-status/", "Dashboard category status"),
                ("/api/dropdowns/fiscal-years/", "Dropdown fiscal years"),
                ("/api/dropdowns/departments/", "Dropdown departments"),
                ("/api/dropdowns/accounts/", "Dropdown accounts"),
                ("/api/dropdowns/expense-categories/", "Dropdown expense categories"),
                ("/api/budget-proposals/", "Budget proposals list"),
                ("/api/budget-proposals/summary/", "Budget proposals summary"),
                ("/api/expenses/", "Expenses list"),
                ("/api/expenses/history/", "Expense history"),
                ("/api/journal-entries/", "Journal entries"),
                ("/api/ledger/", "Ledger view"),
                ("/api/projects/all/", "All projects"),
                # Note: Budget variance requires query params, so may return 400
            ]
            
            for endpoint, description in api_tests:
                success, _, status = self.call_bms_api(endpoint, admin_token, description=description)
                self.suite.add(TestResult(description, 
                                         TestStatus.PASSED if success else TestStatus.FAILED,
                                         response_code=status))
        else:
            print_fail("Skipping Admin API tests - no token available")
        
        # Phase 4: Role-Based Access Tests
        print_header("Phase 4: Role-Based Access Tests")
        
        if 'FinanceHead' in self.tokens:
            finance_token = self.tokens['FinanceHead']
            
            success, _, _ = self.call_bms_api("/api/budget-proposals/", finance_token,
                                              description="Finance Head: Budget proposals")
            self.suite.add(TestResult("Finance Head access", 
                                     TestStatus.PASSED if success else TestStatus.FAILED))
        else:
            print_fail("Skipping Finance Head tests - no token")
        
        if 'GeneralUser' in self.tokens:
            user_token = self.tokens['GeneralUser']
            
            success, _, _ = self.call_bms_api("/api/dashboard/budget-summary/", user_token,
                                              description="General User: Dashboard")
            self.suite.add(TestResult("General User dashboard", 
                                     TestStatus.PASSED if success else TestStatus.FAILED))
        else:
            print_fail("Skipping General User tests - no token")
        
        # Phase 5: Unauthenticated Access Tests
        print_header("Phase 5: Unauthenticated Access Tests (Should Fail)")
        
        success, _, status = self.call_bms_api("/api/dashboard/budget-summary/", 
                                                "invalid_token_12345",
                                                description="Invalid token test")
        expected_fail = status in [401, 403]
        if expected_fail:
            print_pass("Invalid token correctly rejected")
        self.suite.add(TestResult("Invalid token rejected",
                                 TestStatus.PASSED if expected_fail else TestStatus.FAILED))
        
        # Print Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test results summary."""
        print_header("Test Results Summary")
        
        rate = self.suite.success_rate()
        
        print(f"\n Total Tests:  {self.suite.total}")
        print(f" {Colors.PASS}Passed:{Colors.ENDC}       {self.suite.passed}")
        
        if self.suite.failed > 0:
            print(f" {Colors.FAIL}Failed:{Colors.ENDC}       {self.suite.failed}")
        else:
            print(f" {Colors.PASS}Failed:{Colors.ENDC}       {self.suite.failed}")
        
        if rate >= 80:
            color = Colors.PASS
        elif rate >= 50:
            color = Colors.WARNING
        else:
            color = Colors.FAIL
        
        print(f" Success Rate: {color}{rate:.1f}%{Colors.ENDC}")
        print()
        
        if self.suite.failed == 0:
            print(f" {Colors.PASS}All tests passed! BMS API integration is working correctly.{Colors.ENDC}")
        else:
            print(f" {Colors.WARNING}Some tests failed. Review the output above for details.{Colors.ENDC}")
        
        print_header("Test Complete")


def main():
    parser = argparse.ArgumentParser(description="BMS API Integration Test Script")
    parser.add_argument('--auth-url', default='http://localhost:8000',
                       help='Auth service URL (default: http://localhost:8000)')
    parser.add_argument('--bms-url', default='http://localhost:8001',
                       help='BMS service URL (default: http://localhost:8001)')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Show detailed output')
    
    args = parser.parse_args()
    
    print_header("BMS API Integration Test Suite")
    print(f" Auth URL: {args.auth_url}")
    print(f" BMS URL:  {args.bms_url}")
    
    tester = BMSApiTester(args.auth_url, args.bms_url, args.verbose)
    tester.run_all_tests()
    
    # Exit with failure count
    sys.exit(tester.suite.failed)


if __name__ == '__main__':
    main()
