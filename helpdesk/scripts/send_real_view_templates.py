"""Send emails using the exact HTML templates defined in `core.views`.

This script imports the template functions from `core.views` and uses the
existing `send_gmail_message` helper so we send the same HTML the app would
send. It does not modify view code.

Usage:
& '.../env/Scripts/python.exe' -c "import sys; sys.path.insert(0, r'.../backend'); from scripts.send_real_view_templates import run; run()"
"""

import os
import traceback
from types import SimpleNamespace


def run(target_email='seyxhel2023@gmail.com'):
    try:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
        import django
        django.setup()

        # Import the exact template functions from core.views
        from core.views import (
            send_account_approved_email,
            send_account_pending_email,
            send_account_rejected_email,
        )
        from core.gmail_utils import send_gmail_message

        # Create a minimal object with first_name attribute to pass into templates
        dummy = SimpleNamespace(first_name='Seyxhel')

        print('[RUNNER] Generating pending email HTML using real template...')
        pending_html = send_account_pending_email(dummy)
        print('[RUNNER] Sending pending email...')
        resp_pending = send_gmail_message(target_email, 'Account Creation Pending Approval', pending_html, is_html=True)
        print('[RUNNER] Pending send response:', resp_pending)

        print('\n[RUNNER] Generating approved email HTML using real template...')
        approved_html = send_account_approved_email(dummy)
        print('[RUNNER] Sending approved email...')
        resp_approved = send_gmail_message(target_email, 'Your Account is Ready!', approved_html, is_html=True)
        print('[RUNNER] Approved send response:', resp_approved)

        print('\n[RUNNER] Generating rejected email HTML using real template...')
        rejected_html = send_account_rejected_email(dummy)
        print('[RUNNER] Sending rejected email...')
        resp_rejected = send_gmail_message(target_email, 'Account Creation Unsuccessful', rejected_html, is_html=True)
        print('[RUNNER] Rejected send response:', resp_rejected)

        # Password reset: replicate the exact HTML used in forgot_password with a sample link
        print('\n[RUNNER] Generating password reset HTML (inline template from views.py)...')
        reset_link = 'https://smartsupport-hdts-frontend.up.railway.app/reset-password/EXAMPLEUID/EXAMPLETOKEN'
        password_html = f"""
        <html>
          <body style="background:#f6f8fa;padding:32px 0;">
            <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;box-shadow:0 2px 8px #0001;overflow:hidden;border:1px solid #e0e0e0;">
              <div style="padding:40px 32px 32px 32px;text-align:center;">
                <img src="https://smartsupport-hdts-frontend.up.railway.app/MapLogo.png" alt="SmartSupport Logo" style="width:90px;margin-bottom:24px;display:block;margin-left:auto;margin-right:auto;" />
                <div style="font-size:1.6rem;margin-bottom:28px;margin-top:8px;font-family:Verdana, Geneva, sans-serif;">
                  Password Reset Request
                </div>
                <div style="text-align:left;margin:0 auto 24px auto;">
                  <p style="font-size:16px;color:#222;margin:0 0 14px 0;font-family:Verdana, Geneva, sans-serif;">
                    Hi {dummy.first_name},
                  </p>
                  <p style="font-size:16px;color:#222;margin:0 0 18px 0;font-family:Verdana, Geneva, sans-serif;">
                    We received a request to reset your password. You can create a new one using the link below:
                  </p>
                  <div style="text-align:center;margin:24px 0;">
                    <a href="{reset_link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;font-size:16px;font-family:Verdana, Geneva, sans-serif;">
                      Reset Password
                    </a>
                  </div>
                  <p style="font-size:15px;color:#444;margin-bottom:14px;font-family:Verdana, Geneva, sans-serif;">
                    If you didn’t request a password reset, please ignore this message or contact us if you have any concerns.
                  </p>
                  <p style="font-size:15px;color:#444;margin-bottom:14px;font-family:Verdana, Geneva, sans-serif;">
                    If you need further assistance, reach out to us at: <a href="mailto:mapactivephsmartsupport@gmail.com" style="color:#2563eb;text-decoration:none;">mapactivephsmartsupport@gmail.com</a>
                  </p>
                  <p style="font-size:15px;color:#444;margin-bottom:18px;font-family:Verdana, Geneva, sans-serif;">
                    Best regards,<br>
                    MAP Active PH SmartSupport
                  </p>
                </div>
                <div style="margin-top:18px;text-align:left;">
                  <span style="font-size:1.5rem;font-weight:bold;color:#3b82f6;font-family:Verdana, Geneva, sans-serif;letter-spacing:1px;">
                    SmartSupport
                  </span>
                </div>
              </div>
              <div style="height:5px;background:#2563eb;"></div>
            </div>
          </body>
        </html>
        """

        print('[RUNNER] Sending password reset email...')
        resp_password = send_gmail_message(target_email, 'Reset Your Password', password_html, is_html=True)
        print('[RUNNER] Password reset send response:', resp_password)

        print('\n[RUNNER] All sends attempted.')

    except Exception:
        traceback.print_exc()


if __name__ == '__main__':
    run()
