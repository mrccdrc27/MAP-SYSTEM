"""Send view-like account lifecycle emails via Gmail API to a target address.

This script does not change view code; it calls the same email text used in
`core/views.py` and `core/admin.py` but uses the Gmail API helper so we can
verify real delivery to a Gmail address.

Usage (PowerShell example):
& '.../env/Scripts/python.exe' -c "import sys; sys.path.insert(0, r'.../backend'); from scripts.send_gmail_view_emails import run; run()"
"""

import os
import traceback


def run(target_email='seyxhel2023@gmail.com'):
    try:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
        import django
        django.setup()

        from core.gmail_utils import send_gmail_api_email

        # Use the exact message text and from_email used in core/views.py
        approval_subject = 'Account Approved'
        # views.py uses a personalized greeting with employee.first_name
        first_name = 'Seyxhel'  # personalize the message as views.py would
        approval_body = (
            f"Dear {first_name},\n\n"
            "We are pleased to inform you that your SmartSupport account has been successfully created.\n\n"
            "http://localhost:3000/login/employee\n\n"
            "If you have any questions or need further assistance, feel free to contact our support team.\n\n"
            "Respectfully,\n"
            "SmartSupport Help Desk Team"
        )
        approval_from = 'sethpelagio20@gmail.com'

        # Use the exact admin template in core/admin.py (non-personalized)
        deny_subject = 'Account Approved'  # admin template actually sends 'Account Approved' when approving
        deny_body = (
            "Dear Employee,\n\n"
            "We are pleased to inform you that your SmartSupport account has been successfully created.\n\n"
            "http://localhost:3000/login/employee\n\n"
            "If you have any questions or need further assistance, feel free to contact our support team.\n\n"
            "Respectfully,\n"
            "SmartSupport Help Desk Team"
        )
        deny_from = 'sethpelagio20@gmail.com'

        print('[GMAIL TEST] Sending approval email (views.py exact text) to', target_email)
        resp1 = send_gmail_api_email(target_email, approval_subject, approval_body, from_email=approval_from)
        print('[GMAIL TEST] Approval send response:', resp1)

        print('[GMAIL TEST] Sending admin approval email (admin.py exact text) to', target_email)
        resp2 = send_gmail_api_email(target_email, deny_subject, deny_body, from_email=deny_from)
        print('[GMAIL TEST] Admin approval send response:', resp2)

    except Exception:
        traceback.print_exc()


if __name__ == '__main__':
    run()
