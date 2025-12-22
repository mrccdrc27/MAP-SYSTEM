from django.core.exceptions import ValidationError
import re

class CustomPasswordValidator:
    """
    Validate whether the password meets the requirements:
    - Minimum 8 characters
    - Maximum 64 characters
    """
    
    def __init__(self, min_length=8, max_length=64):
        self.min_length = min_length
        self.max_length = max_length
    
    def validate(self, password, user=None):
        if len(password) < self.min_length:
            raise ValidationError(
                f"This password is too short. It must contain at least {self.min_length} characters.",
                code='password_too_short',
            )
        if len(password) > self.max_length:
            raise ValidationError(
                f"This password is too long. It must not exceed {self.max_length} characters.",
                code='password_too_long',
            )
            
        # We don't enforce character class requirements as per NIST guidelines
    
    def get_help_text(self):
        return f"Your password must be between {self.min_length} and {self.max_length} characters."