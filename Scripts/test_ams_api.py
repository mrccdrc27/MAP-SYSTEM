#!/usr/bin/env python
"""
AMS API Test Script

This script tests the AMS API integration with the centralized Auth service.
It authenticates via the Auth service and makes various API calls to AMS Assets and Contexts services.

Usage:
    python test_ams_api.py [--auth-url URL] [--assets-url URL] [--contexts-url URL] [--verbose]

Default URLs:
    Auth:     http://localhost:8000
    Assets:   http://localhost:8002
    Contexts: http://localhost:8003
"""

import argparse
import json
import sys
from typing import Optional, Dict, Any, Tuple, List
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


def print_subheader(title: str):
    print(f"\n{Colors.WARNING}--- {title} ---{Colors.ENDC}")


def print_step(message: str):
    print(f" -> {Colors.WARNING}{message}{Colors.ENDC}")


def print_pass(message: str):
    print(f" {Colors.PASS}[PASS]{Colors.ENDC} {message}")


def print_fail(message: str):
    print(f" {Colors.FAIL}[FAIL]{Colors.ENDC} {message}")


def print_info(message: str):
    print(f" {Colors.INFO}[INFO]{Colors.ENDC} {message}")


def print_skip(message: str):
    print(f" {Colors.WARNING}[SKIP]{Colors.ENDC} {message}")


# Test credentials - users with AMS system access
# These should be seeded in the centralized auth service with AMS roles
TEST_USERS = {
    "Admin": {
        "email": "amsadmin@test.local",
        "password": "amsadmin123",
        "expected_role": "Admin"
    },
    "Operator": {
        "email": "amsoperator@test.local",
        "password": "amsoperator123",
        "expected_role": "Operator"
    }
}

# Fallback to existing users if AMS-specific users don't exist
FALLBACK_USERS = {
    "SuperAdmin": {
        "email": "admin@example.com",
        "password": "admin123",
    },
    "TestUser": {
        "email": "testuser@example.com",
        "password": "testuser123",
    }
}


class AMSApiTester:
    def __init__(self, auth_url: str, assets_url: str, contexts_url: str, verbose: bool = False):
        self.auth_url = auth_url.rstrip('/')
        self.assets_url = assets_url.rstrip('/')
        self.contexts_url = contexts_url.rstrip('/')
        self.verbose = verbose
        self.suite = TestSuite()
        self.tokens: Dict[str, str] = {}
        self.authenticated_user: Optional[Dict] = None
    
    def check_service_health(self, url: str, name: str) -> bool:
        """Check if a service is available."""
        print_step(f"Checking {name} at {url}...")
        
        # Try common health endpoints
        health_endpoints = [
            "/health/",
            "/api/health/",
            "/",
        ]
        
        for endpoint in health_endpoints:
            try:
                response = requests.get(f"{url}{endpoint}", timeout=5)
                if response.status_code in [200, 301, 302, 404]:  # Service is responding
                    print_pass(f"{name} is available")
                    return True
            except requests.exceptions.RequestException:
                continue
        
        print_fail(f"{name} is NOT available at {url}")
        return False
    
    def authenticate(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate with the Auth service and get tokens."""
        print_step(f"Authenticating: {email}...")
        
        # Try multiple login endpoints (centralized auth service patterns)
        login_endpoints = [
            f"{self.auth_url}/api/v1/users/login/",
            f"{self.auth_url}/api/users/login/",
            f"{self.auth_url}/token/",
            f"{self.auth_url}/api/token/",
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
                    # Check for access token in response body
                    access_token = data.get('access') or data.get('access_token')
                    
                    # If not in body, check cookies
                    if not access_token:
                        access_token = response.cookies.get('access_token')
                    
                    if access_token:
                        print_pass(f"Authenticated as {email}")
                        user_data = data.get('user', {})
                        if self.verbose and user_data:
                            print_info(f"User: {json.dumps(user_data, indent=2)}")
                        
                        # Check for AMS system access in roles
                        roles = user_data.get('roles', []) or data.get('roles', [])
                        has_ams = any(
                            (r.get('system') == 'ams' if isinstance(r, dict) else 'ams' in str(r))
                            for r in roles
                        )
                        if has_ams:
                            print_info(f"User has AMS system access")
                        else:
                            print_info(f"Warning: User may not have AMS system access")
                        
                        return {
                            'access_token': access_token,
                            'refresh_token': data.get('refresh') or data.get('refresh_token'),
                            'user': user_data
                        }
                
                if self.verbose:
                    print_info(f"Endpoint {endpoint}: {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                if self.verbose:
                    print_info(f"Endpoint {endpoint}: {e}")
                continue
        
        print_fail(f"Authentication failed for {email}")
        return None
    
    def call_api(
        self, 
        base_url: str,
        endpoint: str, 
        token: str, 
        method: str = "GET",
        data: Optional[Dict] = None,
        description: str = ""
    ) -> Tuple[bool, Optional[Dict], int]:
        """Make an authenticated API call."""
        print_step(f"{method} {endpoint} - {description}...")
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        url = f"{base_url}{endpoint}"
        
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=10)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=10)
            elif method == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=10)
            elif method == "PATCH":
                response = requests.patch(url, headers=headers, json=data, timeout=10)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                print_fail(f"Unsupported method: {method}")
                return False, None, 0
            
            success = response.status_code in [200, 201, 204]
            
            if success:
                print_pass(f"{description} - OK ({response.status_code})")
                try:
                    response_data = response.json() if response.text else {}
                except:
                    response_data = {}
                if self.verbose:
                    print_info(f"Response: {json.dumps(response_data, indent=2)[:500]}")
                return True, response_data, response.status_code
            else:
                status_msg = {
                    401: "Unauthorized (401)",
                    403: "Forbidden (403) - Check AMS system role",
                    404: "Not Found (404)",
                    405: "Method Not Allowed (405)",
                    500: "Server Error (500)",
                }.get(response.status_code, f"HTTP {response.status_code}")
                
                print_fail(f"{description} - {status_msg}")
                
                if self.verbose:
                    print_info(f"Response: {response.text[:300]}")
                
                return False, None, response.status_code
                
        except requests.exceptions.RequestException as e:
            print_fail(f"{description} - Request failed: {e}")
            return False, None, 0
    
    def call_assets_api(self, endpoint: str, token: str, method: str = "GET", 
                        data: Optional[Dict] = None, description: str = "") -> Tuple[bool, Optional[Dict], int]:
        """Call Assets service API."""
        return self.call_api(self.assets_url, endpoint, token, method, data, description)
    
    def call_contexts_api(self, endpoint: str, token: str, method: str = "GET",
                          data: Optional[Dict] = None, description: str = "") -> Tuple[bool, Optional[Dict], int]:
        """Call Contexts service API."""
        return self.call_api(self.contexts_url, endpoint, token, method, data, description)
    
    def run_all_tests(self):
        """Run the complete test suite."""
        
        # Phase 1: Service Availability
        print_header("Phase 1: Service Availability")
        
        auth_ok = self.check_service_health(self.auth_url, "Auth Service")
        self.suite.add(TestResult("Auth service available", 
                                  TestStatus.PASSED if auth_ok else TestStatus.FAILED))
        
        assets_ok = self.check_service_health(self.assets_url, "Assets Service")
        self.suite.add(TestResult("Assets service available",
                                  TestStatus.PASSED if assets_ok else TestStatus.FAILED))
        
        contexts_ok = self.check_service_health(self.contexts_url, "Contexts Service")
        self.suite.add(TestResult("Contexts service available",
                                  TestStatus.PASSED if contexts_ok else TestStatus.FAILED))
        
        if not auth_ok:
            print_fail("Auth service not available. Aborting tests.")
            print_info("Start Auth: cd auth && python manage.py runserver 0.0.0.0:8000")
            return
        
        if not assets_ok and not contexts_ok:
            print_fail("Neither Assets nor Contexts services available. Aborting tests.")
            print_info("Start Assets:   cd ams/backend/assets && python manage.py runserver 0.0.0.0:8002")
            print_info("Start Contexts: cd ams/backend/contexts && python manage.py runserver 0.0.0.0:8003")
            return
        
        # Phase 2: Authentication Tests
        print_header("Phase 2: Authentication Tests")
        
        # Try AMS-specific users first
        for user_type, user_data in TEST_USERS.items():
            auth_result = self.authenticate(user_data['email'], user_data['password'])
            if auth_result:
                self.tokens[user_type] = auth_result['access_token']
                self.authenticated_user = auth_result.get('user')
                self.suite.add(TestResult(f"Auth {user_type}", TestStatus.PASSED))
            else:
                self.suite.add(TestResult(f"Auth {user_type}", TestStatus.FAILED,
                                         message="User may need to be seeded"))
        
        # If no AMS users authenticated, try fallback users
        if not self.tokens:
            print_info("AMS-specific users not found. Trying fallback users...")
            for user_type, user_data in FALLBACK_USERS.items():
                auth_result = self.authenticate(user_data['email'], user_data['password'])
                if auth_result:
                    self.tokens[user_type] = auth_result['access_token']
                    self.authenticated_user = auth_result.get('user')
                    self.suite.add(TestResult(f"Auth Fallback {user_type}", TestStatus.PASSED))
                    break
        
        if not self.tokens:
            print_fail("No authentication succeeded. Cannot proceed with API tests.")
            print_info("Ensure users with AMS system access are seeded in the auth service.")
            self.print_summary()
            return
        
        # Get the first available token for testing
        test_token = list(self.tokens.values())[0]
        test_user_type = list(self.tokens.keys())[0]
        print_info(f"Using {test_user_type} token for API tests")
        
        # Phase 3: Contexts Service Tests
        if contexts_ok:
            print_header("Phase 3: Contexts Service API Tests")
            
            contexts_endpoints = [
                ("/categories/", "List categories"),
                ("/categories/names/", "Category names"),
                ("/suppliers/", "List suppliers"),
                ("/suppliers/names/", "Supplier names"),
                ("/manufacturers/", "List manufacturers"),
                ("/manufacturers/names/", "Manufacturer names"),
                ("/statuses/", "List statuses"),
                ("/statuses/names/", "Status names"),
                ("/depreciations/", "List depreciations"),
                ("/depreciations/names/", "Depreciation names"),
                ("/locations/", "List locations"),
                ("/locations/names/", "Location names"),
                ("/employees/", "List employees"),
                ("/tickets/", "List tickets"),
                ("/tickets/unresolved/", "Unresolved tickets"),
                ("/tickets/resolved/", "Resolved tickets"),
            ]
            
            for endpoint, description in contexts_endpoints:
                success, data, status = self.call_contexts_api(endpoint, test_token, description=description)
                self.suite.add(TestResult(f"Contexts: {description}",
                                         TestStatus.PASSED if success else TestStatus.FAILED,
                                         response_code=status))
        else:
            print_skip("Skipping Contexts API tests - service not available")
        
        # Phase 4: Assets Service Tests
        if assets_ok:
            print_header("Phase 4: Assets Service API Tests")
            
            assets_endpoints = [
                ("/products/", "List products"),
                ("/products/names/", "Product names"),
                ("/products/asset-registration/", "Products for asset registration"),
                ("/assets/", "List assets"),
                ("/assets/names/", "Asset names"),
                ("/assets/deleted/", "Deleted assets"),
                ("/components/", "List components"),
                ("/components/deleted/", "Deleted components"),
                ("/asset-checkouts/", "Asset checkouts"),
                ("/asset-checkouts/active/", "Active checkouts"),
                ("/asset-checkins/", "Asset checkins"),
                ("/component-checkouts/", "Component checkouts"),
                ("/component-checkins/", "Component checkins"),
                ("/audit-schedules/", "Audit schedules"),
                ("/audit-schedules/scheduled/", "Scheduled audits"),
                ("/audit-schedules/due/", "Due audits"),
                ("/audit-schedules/overdue/", "Overdue audits"),
                ("/audit-schedules/completed/", "Completed audits"),
                ("/audits/", "Audits"),
                ("/repairs/", "Repairs"),
                ("/dashboard/metrics/", "Dashboard metrics"),
            ]
            
            for endpoint, description in assets_endpoints:
                success, data, status = self.call_assets_api(endpoint, test_token, description=description)
                self.suite.add(TestResult(f"Assets: {description}",
                                         TestStatus.PASSED if success else TestStatus.FAILED,
                                         response_code=status))
        else:
            print_skip("Skipping Assets API tests - service not available")
        
        # Phase 5: Cross-Service Integration Tests
        if assets_ok and contexts_ok:
            print_header("Phase 5: Cross-Service Integration Tests")
            
            # Test contexts dropdowns used by assets
            success, data, status = self.call_contexts_api(
                "/contexts-dropdowns/all/?entity=asset", 
                test_token, 
                description="Contexts dropdowns for assets"
            )
            self.suite.add(TestResult("Contexts dropdowns for assets",
                                     TestStatus.PASSED if success else TestStatus.FAILED,
                                     response_code=status))
            
            success, data, status = self.call_contexts_api(
                "/contexts-dropdowns/all/?entity=product",
                test_token,
                description="Contexts dropdowns for products"
            )
            self.suite.add(TestResult("Contexts dropdowns for products",
                                     TestStatus.PASSED if success else TestStatus.FAILED,
                                     response_code=status))
            
            success, data, status = self.call_contexts_api(
                "/contexts-dropdowns/all/?entity=component",
                test_token,
                description="Contexts dropdowns for components"
            )
            self.suite.add(TestResult("Contexts dropdowns for components",
                                     TestStatus.PASSED if success else TestStatus.FAILED,
                                     response_code=status))
        
        # Phase 6: Unauthenticated Access Tests
        print_header("Phase 6: Unauthenticated Access Tests (Should Fail)")
        
        if assets_ok:
            success, _, status = self.call_assets_api(
                "/assets/", 
                "invalid_token_12345",
                description="Invalid token on Assets"
            )
            expected_fail = status in [401, 403]
            if expected_fail:
                print_pass("Invalid token correctly rejected by Assets")
            self.suite.add(TestResult("Assets: Invalid token rejected",
                                     TestStatus.PASSED if expected_fail else TestStatus.FAILED))
        
        if contexts_ok:
            success, _, status = self.call_contexts_api(
                "/categories/",
                "invalid_token_12345",
                description="Invalid token on Contexts"
            )
            expected_fail = status in [401, 403]
            if expected_fail:
                print_pass("Invalid token correctly rejected by Contexts")
            self.suite.add(TestResult("Contexts: Invalid token rejected",
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
            print(f" {Colors.PASS}All tests passed! AMS API integration is working correctly.{Colors.ENDC}")
        elif self.suite.passed > 0:
            print(f" {Colors.WARNING}Some tests failed. Review the output above for details.{Colors.ENDC}")
            if any(r.response_code == 403 for r in self.suite.results if r.status == TestStatus.FAILED):
                print(f" {Colors.INFO}Note: 403 errors may indicate missing AMS system role for user.{Colors.ENDC}")
        else:
            print(f" {Colors.FAIL}All tests failed. Check service availability and authentication.{Colors.ENDC}")
        
        print_header("Test Complete")


def main():
    parser = argparse.ArgumentParser(description="AMS API Integration Test Script")
    parser.add_argument('--auth-url', default='http://localhost:8000',
                       help='Auth service URL (default: http://localhost:8000)')
    parser.add_argument('--assets-url', default='http://localhost:8002',
                       help='Assets service URL (default: http://localhost:8002)')
    parser.add_argument('--contexts-url', default='http://localhost:8003',
                       help='Contexts service URL (default: http://localhost:8003)')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Show detailed output')
    
    args = parser.parse_args()
    
    print_header("AMS API Integration Test Suite")
    print(f" Auth URL:     {args.auth_url}")
    print(f" Assets URL:   {args.assets_url}")
    print(f" Contexts URL: {args.contexts_url}")
    
    tester = AMSApiTester(args.auth_url, args.assets_url, args.contexts_url, args.verbose)
    tester.run_all_tests()
    
    # Exit with failure count
    sys.exit(tester.suite.failed)


if __name__ == '__main__':
    main()
