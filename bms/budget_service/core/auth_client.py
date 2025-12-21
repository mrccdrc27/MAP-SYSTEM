# backend/core/auth_client.py
import requests
from django.conf import settings
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)

class AuthServiceClient:
    def __init__(self):
        self.base_url = getattr(settings, 'AUTH_SERVICE_URL', 'http://localhost:8001')
        self.timeout = 5
    
    def get_user_info(self, user_id):
        """Get user info from auth service"""
        # Try cache first
        cache_key = f"user_info_{user_id}"
        cached_user = cache.get(cache_key)
        if cached_user:
            return cached_user
        
        try:
            response = requests.get(
                f"{self.base_url}/api/auth/users/{user_id}/",
                timeout=self.timeout,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                user_data = response.json()
                # Cache for 5 minutes
                cache.set(cache_key, user_data, 300)
                return user_data
            else:
                logger.error(f"Auth service returned {response.status_code}")
                return None
                
        except requests.RequestException as e:
            logger.error(f"Auth service request failed: {e}")
            return None
    
    def validate_user_exists(self, user_id):
        """Check if user exists in auth service"""
        user_info = self.get_user_info(user_id)
        return user_info is not None

# Singleton instance
auth_client = AuthServiceClient()