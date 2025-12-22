import os
import base64
from email.mime.text import MIMEText
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
import json
import os

# Prefer storing token and client secret in backend/.secrets (one level up from core)
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SECRETS_DIR = os.path.join(BASE_DIR, '.secrets')
if not os.path.isdir(SECRETS_DIR):
    SECRETS_DIR = BASE_DIR

TOKEN_PATH = os.path.join(SECRETS_DIR, 'token.json')
CLIENT_SECRET_PATH = os.path.join(SECRETS_DIR, 'client_secret_1011117020190-g3nog0sf0093lfrh745g1gu8f94bvr3b.apps.googleusercontent.com.json')

# If token or client secret are provided via environment variables, write them into backend/
if not os.path.exists(TOKEN_PATH):
    token_content = os.environ.get('GMAIL_TOKEN_JSON')
    if token_content:
        try:
            with open(TOKEN_PATH, 'w') as f:
                f.write(token_content)
            print(f"[GMAIL] token.json created from environment variable at {TOKEN_PATH}.")
        except Exception as e:
            print(f"[GMAIL] Failed to write token.json from env: {e}")
    else:
        print(f"[GMAIL] token.json not found at {TOKEN_PATH} (set GMAIL_TOKEN_JSON to auto-create).")
else:
    print(f"[GMAIL] token.json found at {TOKEN_PATH}.")

if not os.path.exists(CLIENT_SECRET_PATH):
    secret_content = os.environ.get('GMAIL_CLIENT_SECRET_JSON')
    if secret_content:
        try:
            with open(CLIENT_SECRET_PATH, 'w') as f:
                f.write(secret_content)
            print(f"[GMAIL] client_secret.json created from environment variable at {CLIENT_SECRET_PATH}.")
        except Exception as e:
            print(f"[GMAIL] Failed to write client_secret.json from env: {e}")
    else:
        print(f"[GMAIL] client_secret.json not found at {CLIENT_SECRET_PATH} (set GMAIL_CLIENT_SECRET_JSON or place client_secret_*.json in backend/).")
else:
    print(f"[GMAIL] client_secret.json found at {CLIENT_SECRET_PATH}.")

SCOPES = ['https://www.googleapis.com/auth/gmail.send']


def _load_and_refresh_credentials():
    creds = None
    if os.path.exists(TOKEN_PATH):
        try:
            creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
        except Exception as e:
            print(f"[GMAIL] Failed to load credentials from {TOKEN_PATH}: {e}")

    if creds and (not creds.valid):
        if creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                try:
                    with open(TOKEN_PATH, 'w') as f:
                        f.write(creds.to_json())
                    print('[GMAIL] Refreshed credentials and wrote updated token.json')
                except Exception as e:
                    print(f"[GMAIL] Warning: could not write refreshed token to {TOKEN_PATH}: {e}")
            except Exception as e:
                print(f"[GMAIL] Failed to refresh credentials: {e}")
        else:
            print('[GMAIL] Credentials are not valid and no refresh token is available.')

    return creds


def send_gmail_message(to, subject, body, is_html=False, from_email=None):
    """
    Wrapper for sending Gmail messages, supporting HTML and plain text.
    Adds support for credential refresh and a development 'GMAIL_DISABLE' flag.
    """
    if is_html:
        message = MIMEText(body, 'html')
    else:
        message = MIMEText(body, 'plain')
    message['to'] = to
    message['subject'] = subject
    if from_email:
        message['from'] = from_email

    # DEV: allow disabling real sends via env var
    if os.environ.get('GMAIL_DISABLE', '').lower() in ('1', 'true', 'yes'):
        print('[GMAIL] GMAIL_DISABLE is set — skipping send (dev mode).')
        return {'mock': True, 'to': to, 'subject': subject}

    creds = _load_and_refresh_credentials()

    if not creds:
        print('[GMAIL] No credentials available — cannot send email.')
        return None

    service = build('gmail', 'v1', credentials=creds)
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    message_body = {'raw': raw}
    try:
        sent_message = service.users().messages().send(userId='me', body=message_body).execute()
        return sent_message
    except Exception as e:
        print(f"Error sending email: {e}")
        return None


def send_gmail_api_email(to, subject, body, from_email=None):
    """
    Send an email using Gmail API.
    Args:
        to (str): Recipient email address
        subject (str): Email subject
        body (str): Email body (plain text)
        from_email (str, optional): Sender email address. If None, uses authenticated user.
    Returns:
        dict: API response
    """
    # DEV: allow disabling real sends via env var
    return send_gmail_message(to, subject, body, is_html=False, from_email=from_email)


def send_email(to, subject, body, is_html=False, from_email=None):
    """Unified email sender.

    - If the environment variable EMAIL_USE_GMAIL_API is set to true (default),
      the Gmail API path is used.
    - Otherwise falls back to Django's send_mail.

    Returns:
      dict-like response from Gmail API or {'sent': n} for SMTP.
    """
    use_gmail = os.environ.get('EMAIL_USE_GMAIL_API', 'true').lower() in ('1', 'true', 'yes')

    if use_gmail:
        # Prefer Gmail API
        return send_gmail_message(to, subject, body, is_html=is_html, from_email=from_email)

    # Fallback to Django send_mail
    try:
        from django.core.mail import send_mail as django_send_mail
    except Exception as e:
        print(f"[EMAIL WRAPPER] Django send_mail import failed: {e}")
        return None

    if is_html:
        # If HTML, send as plain text body and also as html_message when supported
        try:
            sent = django_send_mail(subject, '', from_email or None, [to], html_message=body)
            return {'sent': sent}
        except TypeError:
            # older Django versions may not accept html_message here; send as plain text
            sent = django_send_mail(subject, body, from_email or None, [to])
            return {'sent': sent}
    else:
        sent = django_send_mail(subject, body, from_email or None, [to])
        return {'sent': sent}
