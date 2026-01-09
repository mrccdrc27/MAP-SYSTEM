from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _
import re

class CustomPasswordValidator:
    def __init__(self, min_length=8, max_length=64):
        self.min_length = min_length
        self.max_length = max_length

    def validate(self, password, user=None):
        if len(password) < self.min_length:
            raise ValidationError(
                _("This password is too short. It must contain at least %(min_length)d characters."),
                code='password_too_short',
                params={'min_length': self.min_length},
            )
        if len(password) > self.max_length:
            raise ValidationError(
                _("This password is too long. It must contain at most %(max_length)d characters."),
                code='password_too_long',
                params={'max_length': self.max_length},
            )
        
        # Optional: Add complexity checks if needed for ISO/NIST compliance
        # but basic length is usually enough for the seeder to pass.

    def get_help_text(self):
        return _(
            "Your password must contain at least %(min_length)d characters."
            % {'min_length': self.min_length}
        )