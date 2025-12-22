"""
Gmail API Service Module

This module provides functions to send emails using the Gmail API instead of SMTP.
It supports both OAuth 2.0 (for regular Gmail) and service accounts (for G Suite).

Setup for OAuth 2.0 (Regular Gmail):
1. Create OAuth 2.0 credentials in Google Cloud Console
2. Enable Gmail API
3. Download credentials.json and place it in the project root
4. Run authentication flow once to generate token.json
5. Set GMAIL_CREDENTIALS_PATH in environment variables

Setup for Service Account (G Suite only):
1. Create a service account in Google Cloud Console
2. Enable Gmail API
3. Configure domain-wide delegation
4. Download credentials.json and place it in the project root
"""

import os
import base64
import logging
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


class GmailAPIService:
    """Service class for interacting with Gmail API"""
    
    # Gmail API scopes required for sending emails and reading profile
    SCOPES = [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly'
    ]
    
    def __init__(self):
        """Initialize Gmail API service with credentials"""
        self.service = None
        self._initialize_service()
    
    def _initialize_service(self):
        """Initialize the Gmail API service with credentials from database or env"""
        try:
            # Get sender email from settings
            sender_email = getattr(settings, 'GMAIL_SENDER_EMAIL', 'default@gmail.com')
            
            # Try to load credentials
            creds = self._get_credentials(sender_email)
            
            if not creds:
                logger.error("Failed to obtain valid Gmail credentials")
                self.service = None
                return
            
            # Build the Gmail API service
            self.service = build('gmail', 'v1', credentials=creds)
            logger.info(f"Gmail API service initialized successfully for {sender_email}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Gmail API service: {str(e)}", exc_info=True)
            self.service = None
    
    def _get_credentials(self, sender_email):
        """Get credentials with automatic refresh from database, environment, or file"""
        try:
            # Try to load from database first
            from .token_storage import GmailToken
            
            token_data = GmailToken.get_cached_token(sender_email)
            
            if token_data:
                creds = Credentials(
                    token=token_data.get('token'),
                    refresh_token=token_data.get('refresh_token'),
                    token_uri=token_data.get('token_uri'),
                    client_id=token_data.get('client_id'),
                    client_secret=token_data.get('client_secret'),
                    scopes=self.SCOPES
                )
                
                # Check if token needs refresh
                if creds.expired and creds.refresh_token:
                    logger.info(f"Token expired, refreshing for {sender_email}")
                    try:
                        creds.refresh(Request())
                        
                        # Save refreshed token to database
                        new_token_data = {
                            'token': creds.token,
                            'refresh_token': creds.refresh_token,
                            'token_uri': creds.token_uri,
                            'client_id': creds.client_id,
                            'client_secret': creds.client_secret,
                        }
                        
                        expires_at = timezone.now() + timedelta(seconds=3600)
                        GmailToken.save_token(sender_email, new_token_data, creds.refresh_token, expires_at)
                        logger.info(f"Token refreshed and saved for {sender_email}")
                        
                    except Exception as e:
                        logger.error(f"Token refresh failed: {e}")
                        GmailToken.invalidate_token(sender_email)
                        return None
                
                return creds
            
            # Try loading from environment variables (production fallback)
            if os.getenv('GOOGLE_REFRESH_TOKEN'):
                logger.info("Loading credentials from environment variables")
                creds = Credentials(
                    token=None,
                    refresh_token=os.getenv('GOOGLE_REFRESH_TOKEN'),
                    token_uri='https://oauth2.googleapis.com/token',
                    client_id=os.getenv('GOOGLE_CLIENT_ID'),
                    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
                    scopes=self.SCOPES
                )
                
                # Refresh if expired
                if creds.expired and creds.refresh_token:
                    try:
                        creds.refresh(Request())
                        logger.info("Token refreshed from environment variables")
                    except Exception as e:
                        logger.error(f"Token refresh failed: {e}")
                        return None
                
                return creds
            
            # Try to load from environment variable (for initial setup)
            gmail_credentials_json = os.getenv('GMAIL_OAUTH_CREDENTIALS')
            if gmail_credentials_json:
                logger.info("Loading credentials from environment variable")
                credentials_info = json.loads(gmail_credentials_json)
                
                # Check if this is OAuth credentials with installed key
                if 'installed' in credentials_info:
                    credentials_info = credentials_info['installed']
                
                # For production, token must be in database
                # This path is for initial token setup only
                logger.warning("No token found in database. Please run authentication flow.")
                return None
            
            # Fallback: try to load from file (development only)
            credentials_path = getattr(settings, 'GMAIL_CREDENTIALS_PATH', 'credentials.json')
            token_path = getattr(settings, 'GMAIL_TOKEN_PATH', 'token.json')
            
            if os.path.exists(token_path):
                logger.info("Loading token from file (development mode)")
                creds = Credentials.from_authorized_user_file(token_path, self.SCOPES)
                
                if creds and creds.expired and creds.refresh_token:
                    try:
                        creds.refresh(Request())
                        # Save refreshed token back to file
                        with open(token_path, 'w') as token:
                            token.write(creds.to_json())
                        logger.info("Token refreshed from file")
                    except Exception as e:
                        logger.error(f"Token refresh failed: {e}")
                        return None
                
                return creds
            
            logger.error("No Gmail credentials found in database, environment, or file")
            return None
            
        except Exception as e:
            logger.error(f"Failed to get credentials: {e}", exc_info=True)
            return None
    
    def send_email(self, to_email, subject, body_text, body_html=None):
        """
        Send an email using Gmail API
        
        Args:
            to_email (str): Recipient email address
            subject (str): Email subject
            body_text (str): Plain text email body
            body_html (str, optional): HTML email body
        
        Returns:
            tuple: (success: bool, message_id: str or None, error: str or None)
        """
        if not self.service:
            return False, None, "Gmail API service not initialized"
        
        try:
            # Get sender email from settings
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com')
            
            # Create message container
            if body_html:
                message = MIMEMultipart('alternative')
                message.attach(MIMEText(body_text, 'plain'))
                message.attach(MIMEText(body_html, 'html'))
            else:
                message = MIMEText(body_text, 'plain')
            
            # Set email headers
            message['To'] = to_email
            message['From'] = from_email
            message['Subject'] = subject
            
            # Encode the message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
            
            # Send the message
            send_result = self.service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()
            
            message_id = send_result.get('id')
            logger.info(f"Email sent successfully to {to_email}. Message ID: {message_id}")
            
            return True, message_id, None
            
        except Exception as e:
            error_msg = f"Failed to send email to {to_email}: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return False, None, error_msg
    
    def send_email_with_headers(self, to_email, subject, headers, body_html=None):
        """
        Send an email using Gmail API with custom headers (no template)
        
        Args:
            to_email (str): Recipient email address
            subject (str): Email subject
            headers (dict): Dictionary of email headers/metadata
            body_html (str, optional): HTML email body
        
        Returns:
            tuple: (success: bool, message_id: str or None, error: str or None)
        """
        if not self.service:
            return False, None, "Gmail API service not initialized"
        
        try:
            # Get sender email from settings
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com')
            
            # Build body text from headers
            body_text = self._build_body_from_headers(headers)
            
            # Create message container
            if body_html:
                message = MIMEMultipart('alternative')
                message.attach(MIMEText(body_text, 'plain'))
                message.attach(MIMEText(body_html, 'html'))
            else:
                message = MIMEText(body_text, 'plain')
            
            # Set standard email headers
            message['To'] = to_email
            message['From'] = from_email
            message['Subject'] = subject
            
            # Add custom headers (prefixed with X- for custom headers)
            for key, value in headers.items():
                if key not in ['To', 'From', 'Subject']:  # Skip standard headers
                    header_key = f"X-{key}" if not key.startswith('X-') else key
                    message[header_key] = str(value)
            
            # Encode the message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
            
            # Send the message
            send_result = self.service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()
            
            message_id = send_result.get('id')
            logger.info(f"Email with headers sent successfully to {to_email}. Message ID: {message_id}")
            
            return True, message_id, None
            
        except Exception as e:
            error_msg = f"Failed to send email with headers to {to_email}: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return False, None, error_msg
    
    def _build_body_from_headers(self, headers):
        """
        Build email body text from headers dictionary
        
        Args:
            headers (dict): Dictionary of headers
        
        Returns:
            str: Formatted body text
        """
        lines = []
        for key, value in headers.items():
            # Format key to be more readable (convert snake_case to Title Case)
            formatted_key = key.replace('_', ' ').title()
            lines.append(f"{formatted_key}: {value}")
        
        return '\n'.join(lines)


# Singleton instance
_gmail_service = None


def get_gmail_service():
    """
    Get or create singleton Gmail API service instance
    
    Returns:
        GmailAPIService: Initialized Gmail API service
    """
    global _gmail_service
    if _gmail_service is None:
        _gmail_service = GmailAPIService()
    return _gmail_service
