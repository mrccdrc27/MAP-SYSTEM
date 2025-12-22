# using SendGrid's Python Library
# https://github.com/sendgrid/sendgrid-python
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

message = Mail(
    from_email='notification@noreply.mapactive.tech',  # sender
    to_emails='rivovebayo@gmail.com',  # recipient
    subject='Reset Your MapActive Password',
    html_content="""
    <p>Hello,</p>
    <p>We received a request to reset your password for your MapActive account.</p>
    <p>Click the link below to reset your password:</p>
    <p><a href="https://yourapp.com/reset-password?token=UNIQUE_TOKEN">Reset Password</a></p>
    <p>If you did not request a password reset, please ignore this email.</p>
    <br>
    <p>Thanks,<br>The MapActive Team</p>
    """
)
try:
    sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
    # sg.set_sendgrid_data_residency("eu")
    # uncomment the above line if you are sending mail using a regional EU subuser
    response = sg.send(message)
    print(response.status_code)
    print(response.body)
    print(response.headers)
except Exception as e:
    print(f"Error: {str(e)}")
    print(f"Exception type: {type(e).__name__}")