import secrets
from datetime import timedelta
from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from users.models import User

# Choices for Employees model
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


class Employees(models.Model):
    """Employee model based on User model for HDTS app with authentication and 2FA support."""
    
    id = models.AutoField(primary_key=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='employee_profile', null=True, blank=True)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)
    password = models.CharField(max_length=255)  # Hashed password for employee authentication
    first_name = models.CharField(max_length=100, blank=True)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    suffix = models.CharField(max_length=10, choices=SUFFIX_CHOICES, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True)
    phone_number = models.CharField(max_length=20, unique=True, null=True, blank=True)
    company_id = models.CharField(max_length=8, unique=True, null=True, blank=True)
    department = models.CharField(max_length=100, choices=DEPARTMENT_CHOICES, blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Pending')
    notified = models.BooleanField(default=False)
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    
    # 2FA settings
    otp_enabled = models.BooleanField(default=False)  # Whether 2FA is enabled for this employee
    
    # Account lockout mechanism
    failed_login_attempts = models.IntegerField(default=0)
    is_locked = models.BooleanField(default=False)
    lockout_time = models.DateTimeField(null=True, blank=True)
    
    last_login = models.DateTimeField(null=True, blank=True)  # Last login timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Employee'
        verbose_name_plural = 'Employees'
        ordering = ['-created_at']
    
    def set_password(self, raw_password):
        """Hash and set the employee's password."""
        self.password = make_password(raw_password)
    
    def check_password(self, raw_password):
        """Check if the provided password matches the hashed password."""
        return check_password(raw_password, self.password)
    
    def get_full_name(self):
        """Returns the employee's full name."""
        return f"{self.first_name} {self.last_name}".strip()
    
    def __str__(self):
        """String representation of the employee (email)."""
        return self.email


class EmployeeOTP(models.Model):
    """Model to store OTP codes for 2FA authentication (email-based)."""
    
    employee = models.ForeignKey(Employees, on_delete=models.CASCADE, related_name='otp_codes')
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=3)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['employee', 'is_used', 'expires_at']),
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
    def generate_for_employee(cls, employee):
        """Generate a new OTP for the employee and invalidate old ones."""
        # Invalidate old unused OTPs
        cls.objects.filter(
            employee=employee,
            is_used=False
        ).update(is_used=True)
        
        # Generate new OTP
        otp_code = f"{secrets.randbelow(1000000):06d}"
        otp = cls.objects.create(
            employee=employee,
            otp_code=otp_code
        )
        return otp
    
    @classmethod
    def get_valid_otp_for_employee(cls, employee):
        """Get the most recent valid OTP for an employee."""
        return cls.objects.filter(
            employee=employee,
            is_used=False,
            expires_at__gt=timezone.now()
        ).first()
    
    def __str__(self):
        return f"OTP for {self.employee.email} - {'Used' if self.is_used else 'Active'}"


class EmployeePasswordResetToken(models.Model):
    """Model to store password reset tokens for employees."""
    
    employee = models.ForeignKey(Employees, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=255, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token', 'is_used', 'expires_at']),
        ]
    
    def is_expired(self):
        """Check if token has expired."""
        return timezone.now() > self.expires_at
    
    def is_valid(self):
        """Check if token is valid (not used and not expired)."""
        return not self.is_used and not self.is_expired()
    
    def use_token(self):
        """Mark token as used."""
        self.is_used = True
        self.save(update_fields=['is_used'])
    
    @classmethod
    def generate_for_employee(cls, employee):
        """Generate a new reset token for the employee and invalidate old ones."""
        # Invalidate old unused tokens
        cls.objects.filter(
            employee=employee,
            is_used=False
        ).update(is_used=True)
        
        # Generate new token
        token = secrets.token_urlsafe(32)
        reset_token = cls.objects.create(
            employee=employee,
            token=token,
            expires_at=timezone.now() + timedelta(hours=24)
        )
        return reset_token
    
    @classmethod
    def get_valid_token(cls, token):
        """Get a valid reset token by its string value."""
        try:
            reset_token = cls.objects.get(token=token)
            if reset_token.is_valid():
                return reset_token
            return None
        except cls.DoesNotExist:
            return None
    
    def __str__(self):
        return f"Reset token for {self.employee.email} - {'Used' if self.is_used else 'Active'}"

