#!/usr/bin/env python
"""
Gmail API OAuth Authentication Script

Run this script once to authenticate and generate token.json
"""

import os
import sys
import json
from pathlib import Path

# Add project to path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'notification_service.settings')
import django
django.setup()

from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly'
]

def authenticate():
    """Run OAuth flow to get credentials"""
    credentials_path = 'credentials.json'
    token_path = 'token.json'
    
    if not os.path.exists(credentials_path):
        print(f"❌ Error: {credentials_path} not found!")
        print("Please download OAuth 2.0 credentials from Google Cloud Console")
        return False
    
    print("🔐 Starting Gmail API authentication...")
    print("\nThis will open a browser window for you to authorize the application.")
    print("If the browser doesn't open, copy the URL from the console and open it manually.\n")
    
    try:
        flow = InstalledAppFlow.from_client_secrets_file(
            credentials_path, SCOPES)
        
        # Run the OAuth flow
        creds = flow.run_local_server(port=8080, open_browser=True)
        
        # Save the credentials in JSON format (not pickle)
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
        
        print(f"\n✅ Authentication successful!")
        print(f"✅ Token saved to {token_path} (JSON format)")
        
        # Test the connection
        print("\n🧪 Testing Gmail API connection...")
        service = build('gmail', 'v1', credentials=creds)
        profile = service.users().getProfile(userId='me').execute()
        print(f"✅ Connected as: {profile.get('emailAddress')}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Authentication failed: {str(e)}")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("Gmail API OAuth Authentication")
    print("=" * 60)
    print()
    
    success = authenticate()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ Setup Complete!")
        print("=" * 60)
        print("\nYou can now:")
        print("1. Restart your Celery worker")
        print("2. Send emails via Gmail API")
        print("\nThe token.json will be used automatically for future requests.")
    else:
        print("\n" + "=" * 60)
        print("❌ Setup Failed")
        print("=" * 60)
        print("\nPlease check:")
        print("1. credentials.json exists in notification_service/")
        print("2. Gmail API is enabled in Google Cloud Console")
        print("3. OAuth consent screen is configured")
