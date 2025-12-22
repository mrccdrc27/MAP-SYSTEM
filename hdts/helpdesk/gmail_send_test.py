import os
import glob
import base64
import json
from email.mime.text import MIMEText
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

SCOPES = ['https://www.googleapis.com/auth/gmail.send']


def find_client_secret(base_dir):
    # Environment override
    env_path = os.environ.get('GMAIL_CLIENT_SECRET_PATH')
    if env_path and os.path.exists(env_path):
        print(f"Using client secret from GMAIL_CLIENT_SECRET_PATH: {env_path}")
        return env_path

    # Prefer secrets stored in backend/.secrets/
    secrets_dir = os.path.join(base_dir, '.secrets')
    if os.path.isdir(secrets_dir):
        candidates = glob.glob(os.path.join(secrets_dir, 'client_secret_*.json'))
        if candidates:
            print(f"Found client secret in {secrets_dir}: {candidates[0]}")
            return candidates[0]

    # Look for client_secret_*.json in the backend directory
    candidates = glob.glob(os.path.join(base_dir, 'client_secret_*.json'))
    if candidates:
        print(f"Found client secret: {candidates[0]}")
        return candidates[0]

    # Fallback to example file if present
    example = os.path.join(base_dir, 'client_secret_example.json')
    if os.path.exists(example):
        print(f"Found example client secret: {example} (placeholder). Will not use this for OAuth.")
        return example

    return None


def get_gmail_service():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    # Prefer the .secrets directory
    secrets_dir = os.path.join(base_dir, '.secrets')
    if os.path.isdir(secrets_dir):
        token_path = os.path.join(secrets_dir, 'token.json')
    else:
        token_path = os.path.join(base_dir, 'token.json')
    client_secret = find_client_secret(base_dir)

    creds = None
    # Load existing token if present
    if os.path.exists(token_path):
        try:
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
            print(f"Loaded credentials from {token_path}")
        except Exception as e:
            print(f"Failed to load credentials from {token_path}: {e}")

    # Refresh if expired and refresh_token is available
    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            with open(token_path, 'w') as token:
                token.write(creds.to_json())
            print("Refreshed expired credentials and wrote updated token.json")
        except Exception as e:
            print(f"Failed to refresh credentials: {e}")

    # If no valid creds, run InstalledAppFlow
    if not creds or not creds.valid:
        if not client_secret:
            raise FileNotFoundError(
                "No client secret found. Place a file named client_secret_*.json in the backend/ directory or set GMAIL_CLIENT_SECRET_PATH.")

        # If the client_secret points to the example placeholder, abort with a clear message
        if os.path.basename(client_secret).startswith('client_secret_example'):
            raise RuntimeError(
                "Detected placeholder client_secret_example.json. Please place your real client_secret_*.json in backend/ or set GMAIL_CLIENT_SECRET_PATH to the real file. See backend/README_GMAIL.md for instructions.")

        flow = InstalledAppFlow.from_client_secrets_file(client_secret, SCOPES)
        creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
        print(f"Saved new token to {token_path}")

    return build('gmail', 'v1', credentials=creds)


def send_gmail(to, subject, body):
    service = get_gmail_service()
    message = MIMEText(body)
    message['to'] = to
    message['subject'] = subject
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    message = {'raw': raw}
    resp = service.users().messages().send(userId='me', body=message).execute()
    print('Send response:', json.dumps(resp, indent=2))


# Usage example (modify the recipient before running):
if __name__ == '__main__':
    # Change the recipient if needed
    recipient = os.environ.get('GMAIL_TEST_RECIPIENT', 'seyxhel2023@gmail.com')
    try:
        send_gmail(recipient, 'Test Subject', 'Hello from Gmail API!')
    except Exception as e:
        print('Error sending test email:', e)