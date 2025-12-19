import pytest
from playwright.sync_api import Page, expect
from django.contrib.auth import get_user_model

@pytest.mark.django_db
def test_employee_login_successful(page: Page, live_server, settings):
    """
    E2E test for Employee Login.
    Requires: pytest-django, pytest-playwright
    Run with: pytest testing/e2e/test_login.py
    """
    # 1. Disable ReCAPTCHA for testing environment
    settings.RECAPTCHA_ENABLED = False
    
    # 2. Setup: Create a test employee
    from hdts.models import Employees
    email = "testemployee@example.com"
    password = "StrongPassword123!"
    
    # Create Employee instance
    employee = Employees.objects.create(
        email=email,
        username="testemployee",
        first_name="Test",
        last_name="Employee",
        status='Approved'
    )
    employee.set_password(password)
    employee.save()
    
    # 3. Navigate to the login page
    # live_server.url includes the random port (e.g., http://localhost:56789)
    login_url = f"{live_server.url}/login/"
    page.goto(login_url)
    
    # Verify we are on the login page
    expect(page).to_have_title("Employee Login - HDTS")
    
    # 4. Interact with the form
    # Fill in Email
    page.fill('input[name="email"]', email)
    
    # Fill in Password
    page.fill('input[name="password"]', password)
    
    # Ensure ReCAPTCHA is not present/visible (since we disabled it)
    # Note: If it were enabled, we'd need to handle the iframe or mock the response
    
    # 5. Submit the form
    page.click('button[type="submit"]')
    
    # 6. Assertions
    # Check for success toast notification
    # The template uses a toast with class 'toast success'
    success_toast = page.locator('.toast.success')
    expect(success_toast).to_be_visible(timeout=10000)
    expect(success_toast).to_contain_text("Logged in successfully!")
    
    # The JS redirects to a dashboard or welcome page after success
    # We rely on the toast message as the redirection target (frontend server) might not be running in test env
    # page.wait_for_url(...) would raise ERR_CONNECTION_REFUSED if the target is unreachable
    pass
    # Optional: Verify user is authenticated in the backend
    # This checks if the session associated with the browser context is valid
    # But checking UI feedback is usually sufficient for E2E
    
