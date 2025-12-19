import uuid
import secrets
from datetime import timedelta
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone

# Choices for new fields
SUFFIX_CHOICES = [
    ('Jr.', 'Jr.'),
    ('Sr.', 'Sr.'),
    ('II', 'II'),
    ('III', 'III'),
    ('IV', 'IV'),
    ('V', 'V'),
]

DEPARTMENT_CHOICES = [
    ('IT Department', 'IT Department'),
    ('Asset Department', 'Asset Department'),
    ('Budget Department', 'Budget Department'),
]

STATUS_CHOICES = [
    ('Pending', 'Pending'),
    ('Approved', 'Approved'),
    ('Rejected', 'Rejected'),
]

# Custom manager for handling user creation and superuser creation
class CustomUserManager(BaseUserManager):

    def get_next_company_id(self):
        """Generate the next company ID with MA prefix and auto-increment."""
        # Find the highest existing company_id
        latest_user = self.filter(
            company_id__startswith='MA'
        ).order_by('company_id').last()
        
        if latest_user and latest_user.company_id:
            # Extract the numeric part and increment
            current_number = int(latest_user.company_id[2:])  # Remove 'MA' prefix
            next_number = current_number + 1
        else:
            # Start with 1 if no existing company_ids
            next_number = 1
        
        # Format as MA0001, MA0002, etc.
        return f"MA{next_number:04d}"

    def create_user(self, email, password=None, **extra_fields):
        """
        Creates and saves a regular User with the given email and password.
        ensures email is provided and normalizes it
        If username is not provided, uses the part before '@' in the email
        """
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        
        username = extra_fields.pop('username', None)
        if not username:
            username = email.split('@')[0]

         # Auto-generate company_id if not provided
        if 'company_id' not in extra_fields or not extra_fields.get('company_id'):
            extra_fields['company_id'] = self.get_next_company_id()
        
        # Set default status if not provided
        if 'status' not in extra_fields:
            extra_fields['status'] = 'Pending'

        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """
        Creates and saves a SuperUser with the given email and password.
        Ensures is_staff and is_superuser are set to True
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)

# Custom User model for authentication
class User(AbstractBaseUser, PermissionsMixin):
    id = models.AutoField(primary_key=True)  # Integer primary key
    email = models.EmailField(unique=True)  # Used for login
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)  # Optional username
    first_name = models.CharField(max_length=100, blank=True)  # Optional first name
    middle_name = models.CharField(max_length=100, blank=True, null=True)  # Optional middle name
    suffix = models.CharField(max_length=10, choices=SUFFIX_CHOICES, blank=True, null=True)  # Optional suffix
    last_name = models.CharField(max_length=100, blank=True)  # Optional last name
    phone_number = models.CharField(max_length=20, unique=True, null=True, blank=True)  # Optional phone number (in E.164 format)
    company_id = models.CharField(max_length=8, unique=True, null=True, blank=True)  # Auto-generated company ID
    department = models.CharField(max_length=100, choices=DEPARTMENT_CHOICES, blank=True, null=True)  # Optional department
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Pending')  # User status
    notified = models.BooleanField(default=False)  # Whether user has been notified
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)  # Optional profile image

    is_active = models.BooleanField(default=True)  # Can login
    is_staff = models.BooleanField(default=False)  # Admin site access
    is_superuser = models.BooleanField(default=False)  # All permissions

    # 2FA settings
    otp_enabled = models.BooleanField(default=False)  # Whether 2FA is enabled for this user

    # Account lockout mechanism
    failed_login_attempts = models.IntegerField(default=0)
    is_locked = models.BooleanField(default=False)
    lockout_time = models.DateTimeField(null=True, blank=True)

    last_login = models.DateTimeField(null=True, blank=True)  # Last login timestamp
    date_joined = models.DateTimeField(auto_now_add=True)  # Account creation timestamp
    
    # Consolidated audit fields for status changes
    status_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='status_changes')  # Admin who last changed status
    status_at = models.DateTimeField(null=True, blank=True)  # Timestamp of last status change

    objects = CustomUserManager()  # Use custom manager

    USERNAME_FIELD = 'email'  # Field used for authentication
    REQUIRED_FIELDS = ['username']  # Required when creating superuser

    def get_full_name(self):
        """Returns the user's full name."""
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self):
        """String representation of the user (email)."""
        return self.email


class UserOTP(models.Model):
    """Model to store OTP codes for 2FA authentication."""
    
    OTP_TYPE_CHOICES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_codes')
    otp_code = models.CharField(max_length=6)
    otp_type = models.CharField(max_length=20, choices=OTP_TYPE_CHOICES, default='email')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=3)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_used', 'expires_at']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=5)
        super().save(*args, **kwargs)
    
    def is_expired(self):
        """Check if OTP has expired."""
        return timezone.now() > self.expires_at
    
    def is_valid(self):
        """Check if OTP is valid (not used, not expired, attempts not exceeded)."""
        return (
            not self.is_used and 
            not self.is_expired() and 
            self.attempts < self.max_attempts
        )
    
    def verify(self, provided_otp):
        """Verify the provided OTP code."""
        self.attempts += 1
        self.save(update_fields=['attempts'])
        
        if not self.is_valid():
            return False
        
        if self.otp_code == provided_otp:
            self.is_used = True
            self.save(update_fields=['is_used'])
            return True
        
        return False
    
    @classmethod
    def generate_for_user(cls, user, otp_type='email'):
        """Generate a new OTP for the user and invalidate old ones."""
        # Invalidate old unused OTPs
        cls.objects.filter(
            user=user, 
            is_used=False, 
            otp_type=otp_type
        ).update(is_used=True)
        
        # Generate new OTP
        otp_code = f"{secrets.randbelow(1000000):06d}"
        otp = cls.objects.create(
            user=user,
            otp_code=otp_code,
            otp_type=otp_type
        )
        return otp
    
    @classmethod
    def get_valid_otp_for_user(cls, user, otp_type='email'):
        """Get the most recent valid OTP for a user."""
        return cls.objects.filter(
            user=user,
            otp_type=otp_type,
            is_used=False,
            expires_at__gt=timezone.now()
        ).first()
    
    def __str__(self):
        return f"OTP for {self.user.email} - {self.otp_type} - {'Used' if self.is_used else 'Active'}"


class PasswordResetToken(models.Model):
    """Model to store password reset tokens."""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token', 'is_used', 'expires_at']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            # Password reset tokens expire in 1 hour
            self.expires_at = timezone.now() + timedelta(hours=1)
        super().save(*args, **kwargs)
    
    def is_expired(self):
        """Check if token has expired."""
        return timezone.now() > self.expires_at
    
    def is_valid(self):
        """Check if token is valid (not used and not expired)."""
        return not self.is_used and not self.is_expired()
    
    @classmethod
    def generate_for_user(cls, user):
        """Generate a new password reset token for the user and invalidate old ones."""
        # Invalidate old unused tokens
        cls.objects.filter(user=user, is_used=False).update(is_used=True)
        
        # Generate new token
        token = secrets.token_urlsafe(48)
        reset_token = cls.objects.create(
            user=user,
            token=token
        )
        return reset_token
    
    @classmethod
    def get_valid_token(cls, token):
        """Get a valid token instance."""
        try:
            token_instance = cls.objects.get(
                token=token,
                is_used=False,
                expires_at__gt=timezone.now()
            )
            return token_instance
        except cls.DoesNotExist:
            return None
    
    def use_token(self):
        """Mark token as used."""
        self.is_used = True
        self.save(update_fields=['is_used'])
    
    def __str__(self):
        return f"Password reset token for {self.user.email} - {'Used' if self.is_used else 'Active'}"


# check AbstractUser documentation for more details
# class User(AbstractUser):
#     middle_name = models.CharField(max_length=50, blank=True)
#     email = models.EmailField(unique=True)
#     phone_number = models.CharField(max_length=20, blank=False)

#     USERNAME_FIELD = "email"
#     REQUIRED_FIELDS = ["username"]

#     def __str__(self) -> str:
#         return self.email


# Manager to handle user creation (e.g., 'create_user', 'create_superuser')
# auth_service/users/models.py


class IPAddressRateLimit(models.Model):
    """
    Track login attempts per IP address and user email for strict rate limiting.
    Used to block automated attacks at the network level while allowing different user accounts.
    """
    ip_address = models.GenericIPAddressField()
    user_email = models.EmailField()
    failed_attempts = models.IntegerField(default=0)
    last_attempt = models.DateTimeField(auto_now=True)
    blocked_until = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'auth_ip_rate_limit'
        verbose_name = 'IP Address Rate Limit'
        verbose_name_plural = 'IP Address Rate Limits'
        unique_together = [['ip_address', 'user_email']]
    
    def __str__(self):
        return f"IP: {self.ip_address} - Email: {self.user_email} - Attempts: {self.failed_attempts}"
    
    def increment_failed_attempts(self):
        """Increment failed attempts and update timestamp"""
        self.failed_attempts += 1
        self.last_attempt = timezone.now()
        self.save(update_fields=['failed_attempts', 'last_attempt'])
    
    def reset_attempts(self):
        """Reset failed attempts"""
        self.failed_attempts = 0
        self.blocked_until = None
        self.save(update_fields=['failed_attempts', 'blocked_until'])
    
    def is_blocked(self):
        """Check if IP is currently blocked"""
        if self.blocked_until and timezone.now() < self.blocked_until:
            return True
        return False
    
    def block_until(self, duration_minutes=30):
        """Block IP for specified duration"""
        self.blocked_until = timezone.now() + timedelta(minutes=duration_minutes)
        self.save(update_fields=['blocked_until'])


class DeviceFingerprint(models.Model):
    """
    Track device/browser fingerprints to identify repeat offenders.
    A fingerprint is created from browser/device characteristics (User-Agent, Accept-Language, etc.)
    Tracks per device and user email combination.
    """
    fingerprint_hash = models.CharField(max_length=255, db_index=True)
    user_email = models.EmailField()
    failed_attempts = models.IntegerField(default=0)
    last_attempt = models.DateTimeField(auto_now=True)
    requires_captcha = models.BooleanField(default=False)
    blocked_until = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'auth_device_fingerprint'
        verbose_name = 'Device Fingerprint'
        verbose_name_plural = 'Device Fingerprints'
        unique_together = [['fingerprint_hash', 'user_email']]
    
    def __str__(self):
        return f"Device: {self.fingerprint_hash[:16]}... - Email: {self.user_email} - Attempts: {self.failed_attempts}"
    
    def increment_failed_attempts(self):
        """Increment failed attempts and update timestamp"""
        self.failed_attempts += 1
        self.last_attempt = timezone.now()
        self.save(update_fields=['failed_attempts', 'last_attempt'])
    
    def reset_attempts(self):
        """Reset failed attempts"""
        self.failed_attempts = 0
        self.requires_captcha = False
        self.blocked_until = None
        self.save(update_fields=['failed_attempts', 'requires_captcha', 'blocked_until'])
    
    def is_blocked(self):
        """Check if device is currently blocked"""
        if self.blocked_until and timezone.now() < self.blocked_until:
            return True
        return False
    
    def block_until(self, duration_minutes=30):
        """Block device for specified duration"""
        self.blocked_until = timezone.now() + timedelta(minutes=duration_minutes)
        self.save(update_fields=['blocked_until'])


class RateLimitConfig(models.Model):
    """
    Configuration for rate limiting thresholds.
    This allows adjusting limits without code changes.
    """
    # IP-based limits
    ip_attempt_threshold = models.IntegerField(default=10, help_text="Failed attempts per IP before blocking")
    ip_block_duration_minutes = models.IntegerField(default=30, help_text="Minutes to block an IP")
    
    # Device-based limits
    device_attempt_threshold = models.IntegerField(default=5, help_text="Failed attempts per device before captcha")
    device_captcha_threshold = models.IntegerField(default=8, help_text="Failed attempts per device before blocking")
    device_block_duration_minutes = models.IntegerField(default=20, help_text="Minutes to block a device")
    
    # Time windows
    attempt_reset_hours = models.IntegerField(default=24, help_text="Hours before resetting attempt count")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'auth_rate_limit_config'
        verbose_name = 'Rate Limit Configuration'
        verbose_name_plural = 'Rate Limit Configuration'
    
    def __str__(self):
        return "Rate Limit Configuration"
    
    @classmethod
    def get_config(cls):
        """Get or create default configuration"""
        config, created = cls.objects.get_or_create(pk=1)
        return config

