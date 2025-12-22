"""
Gmail OAuth Token Storage

Stores Gmail OAuth tokens in database for production deployment.
This allows tokens to persist across container restarts in Railway.
"""

import json
import logging
from django.db import models
from django.core.cache import cache
from cryptography.fernet import Fernet
from django.conf import settings
import base64

logger = logging.getLogger(__name__)


class GmailToken(models.Model):
    """Store Gmail OAuth tokens in database"""
    
    service_email = models.EmailField(unique=True, help_text="Email address of the Gmail account")
    token_data = models.TextField(help_text="Encrypted OAuth token data")
    refresh_token = models.TextField(blank=True, null=True, help_text="Encrypted refresh token")
    expires_at = models.DateTimeField(null=True, blank=True, help_text="Token expiration time")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_valid = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'gmail_tokens'
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"Gmail token for {self.service_email}"
    
    def _get_cipher(self):
        """Get Fernet cipher for encryption/decryption"""
        # Use Django SECRET_KEY as encryption key (must be 32 bytes)
        key = settings.SECRET_KEY.encode()[:32]
        # Pad or truncate to 32 bytes
        key = key.ljust(32, b'0')
        # Base64 encode for Fernet
        key = base64.urlsafe_b64encode(key)
        return Fernet(key)
    
    def set_token_data(self, token_dict):
        """Encrypt and store token data"""
        try:
            cipher = self._get_cipher()
            token_json = json.dumps(token_dict)
            encrypted = cipher.encrypt(token_json.encode())
            self.token_data = base64.b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"Failed to encrypt token data: {e}")
            raise
    
    def get_token_data(self):
        """Decrypt and return token data"""
        try:
            cipher = self._get_cipher()
            encrypted = base64.b64decode(self.token_data.encode())
            decrypted = cipher.decrypt(encrypted)
            return json.loads(decrypted.decode())
        except Exception as e:
            logger.error(f"Failed to decrypt token data: {e}")
            return None
    
    def set_refresh_token(self, refresh_token):
        """Encrypt and store refresh token"""
        if not refresh_token:
            self.refresh_token = None
            return
        
        try:
            cipher = self._get_cipher()
            encrypted = cipher.encrypt(refresh_token.encode())
            self.refresh_token = base64.b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"Failed to encrypt refresh token: {e}")
            raise
    
    def get_refresh_token(self):
        """Decrypt and return refresh token"""
        if not self.refresh_token:
            return None
        
        try:
            cipher = self._get_cipher()
            encrypted = base64.b64decode(self.refresh_token.encode())
            return cipher.decrypt(encrypted).decode()
        except Exception as e:
            logger.error(f"Failed to decrypt refresh token: {e}")
            return None
    
    @classmethod
    def get_cached_token(cls, service_email):
        """Get token from cache or database"""
        cache_key = f"gmail_token_{service_email}"
        token_data = cache.get(cache_key)
        
        if token_data:
            return token_data
        
        # Load from database
        try:
            token_obj = cls.objects.get(service_email=service_email, is_valid=True)
            token_data = token_obj.get_token_data()
            if token_data:
                # Cache for 1 hour
                cache.set(cache_key, token_data, 3600)
            return token_data
        except cls.DoesNotExist:
            return None
    
    @classmethod
    def save_token(cls, service_email, token_dict, refresh_token=None, expires_at=None):
        """Save or update token in database"""
        try:
            token_obj, created = cls.objects.get_or_create(
                service_email=service_email,
                defaults={'is_valid': True}
            )
            
            token_obj.set_token_data(token_dict)
            if refresh_token:
                token_obj.set_refresh_token(refresh_token)
            if expires_at:
                token_obj.expires_at = expires_at
            token_obj.is_valid = True
            token_obj.save()
            
            # Update cache
            cache_key = f"gmail_token_{service_email}"
            cache.set(cache_key, token_dict, 3600)
            
            logger.info(f"Token saved for {service_email}")
            return token_obj
        except Exception as e:
            logger.error(f"Failed to save token: {e}")
            raise
    
    @classmethod
    def invalidate_token(cls, service_email):
        """Mark token as invalid"""
        try:
            token_obj = cls.objects.get(service_email=service_email)
            token_obj.is_valid = False
            token_obj.save()
            
            # Clear cache
            cache_key = f"gmail_token_{service_email}"
            cache.delete(cache_key)
            
            logger.info(f"Token invalidated for {service_email}")
        except cls.DoesNotExist:
            pass
