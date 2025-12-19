"""Run simple, safe tests that exercise view-level email sends.

This script configures Django, creates a System Admin and two test
employees, and calls the `approve_employee` and `deny_employee` views via
DRF's test request helpers. The project is expected to use the console
email backend in development so email bodies will be printed to stdout.

Usage (PowerShell example):

& 'C:/.../backend/env/Scripts/python.exe' -c "import sys; sys.path.insert(0, r'C:/path/to/backend'); from scripts.run_view_email_tests import run; run()"
"""

import os
import sys
import traceback
from pathlib import Path

# Make the outer project folder importable so `import backend.settings`
# works when this script is executed from within backend/scripts or any cwd.
# The repository layout is: <outer_backend_folder>/manage.py and <outer_backend_folder>/backend (package)
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def run():
    try:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

        import django
        django.setup()

        from django.conf import settings
        from core.models import Employee
        from rest_framework.test import APIRequestFactory, force_authenticate

        print("Django EMAIL_BACKEND:", getattr(settings, 'EMAIL_BACKEND', 'unknown'))

        # Remove any pre-existing test users to make the run idempotent
        test_emails = ['test_admin@example.com', 'test_employee@example.com', 'test_employee2@example.com']
        for e in test_emails:
            Employee.objects.filter(email=e).delete()

        # Create a system admin
        admin = Employee.objects.create_superuser(
            email='test_admin@example.com',
            password='adminpass',
            last_name='Admin',
            first_name='System',
            company_id='MA9998'
        )
        admin.role = 'System Admin'
        admin.save()

        # Create a pending employee to approve
        emp = Employee.objects.create(
            email='test_employee@example.com',
            last_name='User',
            first_name='Test',
            company_id='MA9999',
            status='Pending'
        )
        emp.set_password('emppass')
        emp.save()

        factory = APIRequestFactory()

        # === Simulate public registration to test pending-email send ===
        print('\n=== Simulating public registration (CreateEmployeeView) ===')
        from core.views import CreateEmployeeView
        reg_data = {
            'email': 'test_reg@example.com',
            'first_name': 'Reg',
            'last_name': 'Tester',
            'company_id': 'MA9996',
            'department': 'IT Department',
            'password': 'regpass',
            'confirm_password': 'regpass'
        }
        # Remove any previous test registration
        Employee.objects.filter(email=reg_data['email']).delete()
        # Use multipart format so the view's MultiPartParser/FormParser accept the request
        reg_req = factory.post('/', reg_data, format='multipart')
        # Call the view and print response
        reg_view = CreateEmployeeView.as_view()
        reg_resp = reg_view(reg_req)
        print('CreateEmployeeView response:', getattr(reg_resp, 'status_code', None), getattr(reg_resp, 'data', None))

        # Approve employee
        print('\n=== Calling approve_employee view ===')
        req = factory.post('/', {})
        force_authenticate(req, user=admin)
        from core.views import approve_employee
        resp = approve_employee(req, pk=emp.pk)
        print('approve_employee response:', getattr(resp, 'status_code', None), getattr(resp, 'data', None))
        emp.refresh_from_db()
        print('Employee status after approve:', emp.status)

        # Create another pending employee to deny
        emp2 = Employee.objects.create(
            email='test_employee2@example.com',
            last_name='User2',
            first_name='Test2',
            company_id='MA9997',
            status='Pending'
        )
        emp2.set_password('emppass2')
        emp2.save()

        # Deny employee
        print('\n=== Calling deny_employee view ===')
        req2 = factory.patch('/', {})
        force_authenticate(req2, user=admin)
        from core.views import deny_employee
        resp2 = deny_employee(req2, pk=emp2.pk)
        print('deny_employee response:', getattr(resp2, 'status_code', None), getattr(resp2, 'data', None))
        emp2.refresh_from_db()
        print('Employee2 status after deny:', emp2.status)

        print("\nDone. If your Django EMAIL_BACKEND is the console backend, the email text should have been printed above this output.")

    except Exception:
        traceback.print_exc()


if __name__ == '__main__':
    run()
