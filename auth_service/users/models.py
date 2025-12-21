from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone

# Copied CustomUserManager from core/models.py
class CustomUserManager(BaseUserManager):
    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        if not username:
            raise ValueError('Username is required')

        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        # Ensure superuser has a role if logic depends on it
        extra_fields.setdefault('role', 'ADMIN') # Example adjust if needed
        return self.create_user(email, username, password, **extra_fields)

# Copied User model from core/models.py and adjusted department
class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('ADMIN', 'Administrator'),
        ('FINANCE_HEAD', 'Finance Head'),
        ('GENERAL_USER', 'General User'),                                    # MODIFIED: Added a general role to accommodate your seeder data.
    ]

    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    department_id = models.IntegerField(null=True, blank=True)
    department_name = models.CharField(max_length=100, null=True, blank=True)

    phone_number = models.CharField(max_length=20, unique=True, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(null=True, blank=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.username

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()


# Copied LoginAttempt model from core/models.py
class LoginAttempt(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    # Storing username string for cases where user does not exist or login is by username
    username_input = models.CharField(max_length=255, blank=True, null=True, help_text="Email or phone used for login attempt")
    ip_address = models.GenericIPAddressField()
    user_agent = models.CharField(max_length=255, blank=True) # User agent can be long
    success = models.BooleanField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        status = "Successful" if self.success else "Failed"
        user_str = self.user.username if self.user else self.username_input or "Unknown"
        return f"{status} login attempt by {user_str} at {self.timestamp}"


# Copied UserActivityLog model from core/models.py
class UserActivityLog(models.Model):
    LOG_TYPE_CHOICES = [
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('PASSWORD_RESET_REQUEST', 'Password Reset Request'),
        ('PASSWORD_RESET_CONFIRM', 'Password Reset Confirm'),
        ('PASSWORD_CHANGE', 'Password Change'),
        ('TOKEN_REFRESH', 'Token Refresh'),
        ('PROFILE_VIEW', 'Profile View'),
        ('PROFILE_UPDATE', 'Profile Update'),
        ('USER_MANAGEMENT', 'User Management'),                              # MODIFIED: Added a more generic type for admin actions like user creation.
        ('REGISTER', 'User Registration'),
        ('ERROR', 'Error'),
    ]
    STATUS_CHOICES = [
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
        ('ATTEMPTED', 'Attempted'),                                          # MODIFIED: Added status to match seeder data for password resets.
    ]
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    log_type = models.CharField(max_length=30, choices=LOG_TYPE_CHOICES)
    action = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    details = models.JSONField(null=True, blank=True)

    def __str__(self):
        user_str = self.user.username if self.user else "System/Unknown"
        return f"{user_str} - {self.log_type} - {self.action} - {self.status} at {self.timestamp}"

    class Meta:
        ordering = ['-timestamp']