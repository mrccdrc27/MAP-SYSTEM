"""
Pytest configuration for Playwright end-to-end tests.

This file configures pytest-playwright with custom settings.
"""

import pytest
from playwright.sync_api import Page, Browser, BrowserContext


# Configure pytest-playwright
def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "login: marks tests that require login"
    )
    config.addinivalue_line(
        "markers", "logout: marks tests for logout functionality"
    )
    config.addinivalue_line(
        "markers", "profile: marks tests for profile functionality"
    )
    config.addinivalue_line(
        "markers", "staff: marks tests specific to staff accounts"
    )
    config.addinivalue_line(
        "markers", "employee: marks tests specific to employee (HDTS) accounts"
    )
    config.addinivalue_line(
        "markers", "admin: marks tests requiring admin privileges"
    )
    config.addinivalue_line(
        "markers", "superuser: marks tests requiring superuser privileges"
    )


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    """Configure browser context with custom settings"""
    return {
        **browser_context_args,
        "viewport": {"width": 1280, "height": 720},
        "ignore_https_errors": True,
    }


@pytest.fixture(scope="function")
def page(context: BrowserContext) -> Page:
    """Create a new page for each test with custom settings"""
    page = context.new_page()
    
    # Set default timeout for all operations
    page.set_default_timeout(30000)  # 30 seconds
    page.set_default_navigation_timeout(30000)
    
    yield page
    
    # Cleanup after test
    page.close()


@pytest.fixture
def authenticated_page(page: Page) -> Page:
    """Fixture that provides an authenticated page (logged in user)"""
    import os
    
    base_url = os.environ.get("AUTH_BASE_URL", "http://localhost:8000")
    test_email = os.environ.get("TEST_USER_EMAIL", "admin@test.com")
    test_password = os.environ.get("TEST_USER_PASSWORD", "admin123")
    
    # Navigate to login
    page.goto(f"{base_url}/login/")
    
    # Fill credentials
    page.fill("#email", test_email)
    page.fill("#password", test_password)
    
    # Submit
    page.locator("#loginButton").click()
    
    # Wait for login to complete
    page.wait_for_timeout(3000)
    
    yield page


@pytest.fixture
def staff_authenticated_page(page: Page) -> Page:
    """Fixture that provides an authenticated staff page"""
    import os
    
    base_url = os.environ.get("AUTH_BASE_URL", "http://localhost:8000")
    test_email = os.environ.get("TEST_USER_EMAIL", "admin@test.com")
    test_password = os.environ.get("TEST_USER_PASSWORD", "admin123")
    
    # Navigate to staff login
    page.goto(f"{base_url}/staff/login/")
    
    # Fill credentials (staff login uses #email, #password)
    page.fill("#email", test_email)
    page.fill("#password", test_password)
    
    # Submit
    page.locator("#loginButton").click()
    
    # Wait for login to complete
    page.wait_for_timeout(3000)
    
    yield page


@pytest.fixture
def hdts_authenticated_page(page: Page) -> Page:
    """Fixture that provides an authenticated HDTS employee page"""
    import os
    
    base_url = os.environ.get("AUTH_BASE_URL", "http://localhost:8000")
    test_email = os.environ.get("HDTS_TEST_EMAIL", "employee@test.com")
    test_password = os.environ.get("HDTS_TEST_PASSWORD", "employee123")
    
    # Navigate to HDTS login
    page.goto(f"{base_url}/login/")
    
    # Fill credentials (HDTS uses #id_email, #id_password)
    page.fill("#id_email", test_email)
    page.fill("#id_password", test_password)
    
    # Submit
    page.locator("#loginButton").click()
    
    # Wait for login to complete
    page.wait_for_timeout(3000)
    
    yield page


@pytest.fixture
def staff_admin_page(page: Page) -> Page:
    """Fixture that provides an authenticated staff admin page (is_staff=True)"""
    import os
    
    base_url = os.environ.get("AUTH_BASE_URL", "http://localhost:8000")
    test_email = os.environ.get("STAFF_ADMIN_EMAIL", "staff_admin@test.com")
    test_password = os.environ.get("STAFF_ADMIN_PASSWORD", "staff123")
    
    # Navigate to staff login
    page.goto(f"{base_url}/staff/login/")
    
    # Fill credentials
    page.fill("#email", test_email)
    page.fill("#password", test_password)
    
    # Submit
    page.locator("#loginButton").click()
    
    # Wait for login to complete
    page.wait_for_timeout(3000)
    
    yield page


@pytest.fixture
def superuser_page(page: Page) -> Page:
    """Fixture that provides an authenticated superuser page (is_superuser=True)"""
    import os
    
    base_url = os.environ.get("AUTH_BASE_URL", "http://localhost:8000")
    test_email = os.environ.get("SUPERUSER_EMAIL", "superuser@test.com")
    test_password = os.environ.get("SUPERUSER_PASSWORD", "super123")
    
    # Navigate to staff login
    page.goto(f"{base_url}/staff/login/")
    
    # Fill credentials
    page.fill("#email", test_email)
    page.fill("#password", test_password)
    
    # Submit
    page.locator("#loginButton").click()
    
    # Wait for login to complete
    page.wait_for_timeout(3000)
    
    yield page


@pytest.fixture
def staff_profile_page(staff_authenticated_page: Page) -> Page:
    """Fixture that provides a staff page already on the profile settings page"""
    import os
    
    base_url = os.environ.get("AUTH_BASE_URL", "http://localhost:8000")
    staff_authenticated_page.goto(f"{base_url}/staff/settings/profile/")
    staff_authenticated_page.wait_for_timeout(2000)
    
    yield staff_authenticated_page


@pytest.fixture
def employee_profile_page(hdts_authenticated_page: Page) -> Page:
    """Fixture that provides an employee page already on the profile settings page"""
    import os
    
    base_url = os.environ.get("AUTH_BASE_URL", "http://localhost:8000")
    hdts_authenticated_page.goto(f"{base_url}/profile-settings/")
    hdts_authenticated_page.wait_for_timeout(2000)
    
    yield hdts_authenticated_page
