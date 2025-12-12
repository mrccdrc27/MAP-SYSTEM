def send_account_approved_email(employee):
    logo_url = "https://smartsupport-hdts-frontend.up.railway.app/MapLogo.png"
    site_url = "https://smartsupport-hdts-frontend.up.railway.app/"
    html_content = f"""
    <html>
        <body style="background:#f6f8fa;padding:32px 0;">
            <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;box-shadow:0 2px 8px #0001;overflow:hidden;border:1px solid #e0e0e0;">
                <div style="padding:40px 32px 32px 32px;text-align:center;">
                    <img src="{logo_url}" alt="SmartSupport Logo" style="width:90px;margin-bottom:24px;display:block;margin-left:auto;margin-right:auto;" />
                    <div style="font-size:1.6rem;margin-bottom:28px;margin-top:8px;font-family:Verdana, Geneva, sans-serif;">
                        Account Approved!
                    </div>
                    <div style="text-align:left;margin:0 auto 24px auto;">
                        <p style="font-size:16px;color:#222;margin:0 0 14px 0;font-family:Verdana, Geneva, sans-serif;">
                            Hi {employee.first_name},
                        </p>
                        <p style="font-size:16px;color:#222;margin:0 0 14px 0;font-family:Verdana, Geneva, sans-serif;">
                            Your account has been approved! You can now log in using the credentials you signed up with.
                        </p>
                        <p style="font-size:15px;color:#444;margin-bottom:14px;font-family:Verdana, Geneva, sans-serif;">
                            If you need help, contact us at:<br>
                            <a href="mailto:mapactivephsmartsupport@gmail.com" style="color:#2563eb;text-decoration:none;font-family:Verdana, Geneva, sans-serif;">mapactivephsmartsupport@gmail.com</a>
                        </p>
                        <p style="font-size:15px;color:#444;margin-bottom:18px;font-family:Verdana, Geneva, sans-serif;">
                            Best regards,<br>
                            MAP Active PH SmartSupport
                        </p>
                    </div>
                    <a href="{site_url}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;font-size:16px;font-family:Verdana, Geneva, sans-serif;margin-bottom:24px;">
                        Visit site
                    </a>
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
    return html_content


def send_account_rejected_email(employee):
    logo_url = "https://smartsupport-hdts-frontend.up.railway.app/MapLogo.png"
    site_url = "https://smartsupport-hdts-frontend.up.railway.app/"
    html_content = f"""
    <html>
        <body style="background:#f6f8fa;padding:32px 0;">
            <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;box-shadow:0 2px 8px #0001;overflow:hidden;border:1px solid #e0e0e0;">
                <div style="padding:40px 32px 32px 32px;text-align:center;">
                    <img src="{logo_url}" alt="SmartSupport Logo" style="width:90px;margin-bottom:24px;display:block;margin-left:auto;margin-right:auto;" />
                    <div style="font-size:1.6rem;margin-bottom:28px;margin-top:8px;font-family:Verdana, Geneva, sans-serif;">
                        Account Rejected
                    </div>
                    <div style="text-align:left;margin:0 auto 24px auto;">
                        <p style="font-size:16px;color:#222;margin:0 0 14px 0;font-family:Verdana, Geneva, sans-serif;">
                            Hi {employee.first_name},
                        </p>
                        <p style="font-size:16px;color:#222;margin:0 0 14px 0;font-family:Verdana, Geneva, sans-serif;">
                            We couldn't create your account. Please double-check the information you've entered to ensure everything is correct. If you'd like, feel free to try creating your account again.
                        </p>
                        <p style="font-size:15px;color:#444;margin-bottom:14px;font-family:Verdana, Geneva, sans-serif;">
                            If you need help, contact us at:<br>
                            <a href="mailto:mapactivephsmartsupport@gmail.com" style="color:#2563eb;text-decoration:none;font-family:Verdana, Geneva, sans-serif;">mapactivephsmartsupport@gmail.com</a>
                        </p>
                        <p style="font-size:15px;color:#444;margin-bottom:18px;font-family:Verdana, Geneva, sans-serif;">
                            Best regards,<br>
                            MAP Active PH SmartSupport
                        </p>
                    </div>
                    <a href="{site_url}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;font-size:16px;font-family:Verdana, Geneva, sans-serif;margin-bottom:24px;">
                        Visit site
                    </a>
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
    return html_content


def send_account_pending_email(employee):
    logo_url = "https://smartsupport-hdts-frontend.up.railway.app/MapLogo.png"
    site_url = "https://smartsupport-hdts-frontend.up.railway.app/"
    html_content = f"""
    <html>
        <body style="background:#f6f8fa;padding:32px 0;">
            <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;box-shadow:0 2px 8px #0001;overflow:hidden;border:1px solid #e0e0e0;">
                <div style="padding:40px 32px 32px 32px;text-align:center;">
                    <img src="{logo_url}" alt="SmartSupport Logo" style="width:90px;margin-bottom:24px;display:block;margin-left:auto;margin-right:auto;" />
                    <div style="font-size:1.6rem;margin-bottom:28px;margin-top:8px;font-family:Verdana, Geneva, sans-serif;">
                        Account Creation Pending Approval
                    </div>
                    <div style="text-align:left;margin:0 auto 24px auto;">
                        <p style="font-size:16px;color:#222;margin:0 0 14px 0;font-family:Verdana, Geneva, sans-serif;">
                            Hi {employee.first_name},
                        </p>
                        <p style="font-size:16px;color:#222;margin:0 0 14px 0;font-family:Verdana, Geneva, sans-serif;">
                            Thank you for signing up with MAP Active PH! Your account has been successfully created, but it is currently awaiting approval. You'll receive a confirmation email once your account has been approved.
                        </p>
                        <p style="font-size:15px;color:#444;margin-bottom:14px;font-family:Verdana, Geneva, sans-serif;">
                            If you have any questions, don't hesitate to reach out to us.
                        </p>
                        <p style="font-size:15px;color:#444;margin-bottom:14px;font-family:Verdana, Geneva, sans-serif;">
                            If you did not create this account, please contact us immediately at: <a href="mailto:mapactivephsmartsupport@gmail.com" style="color:#2563eb;text-decoration:none;">mapactivephsmartsupport@gmail.com</a>
                        </p>
                        <p style="font-size:15px;color:#444;margin-bottom:18px;font-family:Verdana, Geneva, sans-serif;">
                            Best regards,<br>
                            MAP Active PH SmartSupport
                        </p>
                    </div>
                    <a href="{site_url}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;font-size:16px;font-family:Verdana, Geneva, sans-serif;margin-bottom:24px;">
                        Visit site
                    </a>
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
    return html_content
