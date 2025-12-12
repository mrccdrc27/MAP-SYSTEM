import re
import random
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.exceptions import ValidationError
from django.conf import settings
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver

SUFFIX_CHOICES = [
    ('Jr.', 'Jr.'), ('Sr.', 'Sr.'), ('III', 'III'), ('IV', 'IV'), ('V', 'V'),
    ('VI', 'VI'), ('VII', 'VII'), ('VIII', 'VIII'), ('IX', 'IX'), ('X', 'X'),
]

DEPARTMENT_CHOICES = [
    ('IT Department', 'IT Department'),
    ('Asset Department', 'Asset Department'),
    ('Budget Department', 'Budget Department'),
]

ROLE_CHOICES = [
    ('Employee', 'Employee'),
    ('Ticket Coordinator', 'Ticket Coordinator'),
    ('System Admin', 'System Admin'),
]

STATUS_CHOICES = [
    ('Pending', 'Pending'),
    ('Approved', 'Approved'),
    ('Denied', 'Denied'),
]

class EmployeeManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault("notified", True)
        return self.create_user(email, password, **extra_fields)

class Employee(AbstractBaseUser, PermissionsMixin):
    last_name = models.CharField(max_length=100)
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    suffix = models.CharField(max_length=10, blank=True, null=True, choices=SUFFIX_CHOICES)
    company_id = models.CharField(max_length=6, unique=True)
    department = models.CharField(max_length=100, choices=DEPARTMENT_CHOICES)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    image = models.ImageField(upload_to='employee_images/', default='employee_images/default-profile.png', blank=True, null=True)

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='Employee')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Pending')
    notified = models.BooleanField(default=False)

    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    date_created = models.DateTimeField(auto_now_add=True)  # <-- Add this line

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['last_name', 'first_name', 'company_id']

    objects = EmployeeManager()

    last_login = None  # Optional: Only include if you do not want login tracking

    def clean(self):
        if not re.match(r'^MA\d{4}$', self.company_id):
            raise ValidationError("Company ID must be in the format MA0001 to MA9999")
        super().clean()

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class ExternalEmployee(models.Model):
    """
    External employee model synced from HDTS auth service.
    Similar to Employee model but company_id is not required (allows NULL).
    Used to store employee data from the auth2 service via Celery task.
    """
    email = models.EmailField(unique=True, db_index=True)
    username = models.CharField(max_length=150, blank=True, null=True)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    suffix = models.CharField(max_length=10, blank=True, null=True, choices=SUFFIX_CHOICES)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    company_id = models.CharField(max_length=6, unique=True, blank=True, null=True, db_index=True)
    department = models.CharField(max_length=100, choices=DEPARTMENT_CHOICES, blank=True, null=True)
    image = models.ImageField(upload_to='external_employee_images/', blank=True, null=True)
    
    role = models.CharField(max_length=20, default='Employee')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Pending')
    notified = models.BooleanField(default=False)
    
    # Tracking fields
    external_employee_id = models.IntegerField(unique=True, db_index=True, null=True)
    external_user_id = models.IntegerField(null=True, blank=True, db_index=True)
    last_synced_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'External Employee'
        verbose_name_plural = 'External Employees'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['external_employee_id']),
            models.Index(fields=['email']),
            models.Index(fields=['company_id']),
        ]
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"


class EmployeeLog(models.Model):
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('role_updated', 'Role Updated'),
        ('other', 'Other'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='logs')
    action = models.CharField(max_length=32, choices=ACTION_CHOICES)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    details = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.employee.company_id} - {self.action} @ {self.timestamp}"


class ActivityLog(models.Model):
    """
    General-purpose activity log for recording user actions across the system.
    Designed to be flexible and queryable for the admin user-profile activity view.
    """
    ACTION_TYPES = [
        ('ticket_created', 'Ticket Created'),
        ('ticket_assigned', 'Ticket Assigned'),
        ('status_changed', 'Status Changed'),
        ('csat_submitted', 'CSAT Submitted'),
        ('account_approved', 'Account Approved'),
        ('account_rejected', 'Account Rejected'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('other', 'Other'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='activity_logs')
    action_type = models.CharField(max_length=64, choices=ACTION_TYPES)
    # optional actor (who performed the action) - could be same as user or an admin
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='performed_activities')
    # human-friendly message/details for display
    message = models.TextField(blank=True, null=True)
    # optional related ticket for quick filtering
    ticket = models.ForeignKey('Ticket', on_delete=models.SET_NULL, null=True, blank=True, related_name='activity_logs')
    # arbitrary metadata (e.g., previous_status, new_status, csat_rating, etc.)
    metadata = models.JSONField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [models.Index(fields=['user', 'action_type', 'timestamp'])]

    def __str__(self):
        return f"{self.user} - {self.action_type} @ {self.timestamp}"

PRIORITY_LEVELS = [
    ('Critical', 'Critical'),
    ('High', 'High'),
    ('Medium', 'Medium'),
    ('Low', 'Low'),
]

STATUS_CHOICES = [
    ('New', 'New'),
    ('Open', 'Open'),
    ('In Progress', 'In Progress'),
    ('On Hold', 'On Hold'),
    ('Pending', 'Pending'),
    ('Resolved', 'Resolved'),
    ('Rejected', 'Rejected'),
    ('Withdrawn', 'Withdrawn'),
    ('Closed', 'Closed'),
]

CATEGORY_CHOICES = [
    ('IT Support', 'IT Support'),
    ('Asset Check In', 'Asset Check In'),
    ('Asset Check Out', 'Asset Check Out'),
    ('New Budget Proposal', 'New Budget Proposal'),
    ('Others', 'Others'),
]

# IT support sub-categories
SUBCATEGORY_CHOICES = [
    ('Technical Assistance', 'Technical Assistance'),
    ('Software Installation/Update', 'Software Installation/Update'),
    ('Hardware Troubleshooting', 'Hardware Troubleshooting'),
    ('Email/Account Access Issue', 'Email/Account Access Issue'),
    ('Internet/Network Connectivity Issue', 'Internet/Network Connectivity Issue'),
    ('Printer/Scanner Setup or Issue', 'Printer/Scanner Setup or Issue'),
    ('System Performance Issue', 'System Performance Issue'),
    ('Virus/Malware Check', 'Virus/Malware Check'),
    ('IT Consultation Request', 'IT Consultation Request'),
    ('Data Backup/Restore', 'Data Backup/Restore'),
]
def generate_unique_ticket_number():
    from .models import Ticket  # safe import for migrations
    from datetime import datetime
    date_part = datetime.utcnow().strftime('%Y%m%d')
    # Attempt up to a few times to avoid collisions
    for _ in range(10):
        rand = f"{random.randint(0, 999999):06d}"
        candidate = f"TX{date_part}{rand}"
        if not Ticket.objects.filter(ticket_number=candidate).exists():
            return candidate
    # Fallback to uuid-like random
    while True:
        candidate = f"TX{date_part}{random.randint(0, 9999999):07d}"
        if not Ticket.objects.filter(ticket_number=candidate).exists():
            return candidate
            
class Ticket(models.Model):
    ticket_number = models.CharField(max_length=32, unique=True, blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            self.ticket_number = generate_unique_ticket_number()
        super().save(*args, **kwargs)

    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="tickets",
        null=True,          # allows NULL values in the database
        blank=True          # allows empty in forms/admin
        
        )
    employee_cookie_id = models.IntegerField(
        null=True,
        blank=True,
        db_index=True,
        help_text="User ID from external cookie-auth system"
    )
    subject = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    sub_category = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField()
    scheduled_date = models.DateField(null=True, blank=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_LEVELS, blank=True, null=True)
    department = models.CharField(max_length=50, choices=DEPARTMENT_CHOICES, blank=True, null=True)
    # Explicit fields for commonly used dynamic data (easier querying)
    asset_name = models.CharField(max_length=255, blank=True, null=True)
    serial_number = models.CharField(max_length=255, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    expected_return_date = models.DateField(blank=True, null=True)
    issue_type = models.CharField(max_length=100, blank=True, null=True)
    other_issue = models.TextField(blank=True, null=True)
    performance_start_date = models.DateField(blank=True, null=True)
    performance_end_date = models.DateField(blank=True, null=True)
    approved_by = models.CharField(max_length=255, blank=True, null=True)
    rejected_by = models.CharField(max_length=255, blank=True, null=True)
    cost_items = models.JSONField(blank=True, null=True)
    # Total requested budget (calculated or provided by frontend)
    requested_budget = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    # Budget-specific fields (set when category is "New Budget Proposal")
    fiscal_year = models.IntegerField(blank=True, null=True)
    department_input = models.IntegerField(blank=True, null=True)
    # Arbitrary dynamic form data (fallback storage for unknown fields)
    dynamic_data = models.JSONField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='New')
    submit_date = models.DateTimeField(auto_now_add=True)
    update_date = models.DateTimeField(auto_now=True)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets')
    response_time = models.DurationField(blank=True, null=True)
    resolution_time = models.DurationField(blank=True, null=True)
    time_closed = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    date_completed = models.DateTimeField(blank=True, null=True, help_text="Date when ticket was completed (Closed status)")
    csat_rating = models.IntegerField(blank=True, null=True, help_text="Customer satisfaction rating (1-5 stars)")
    feedback = models.CharField(max_length=255, blank=True, null=True, help_text="Quick feedback from CSAT modal")

    def __str__(self):
        return f"Ticket #{self.id} - {self.subject}"

from .tasks import push_ticket_to_workflow

@receiver(post_save, sender=Ticket)
def send_ticket_to_workflow(sender, instance, created, **kwargs):
    # Only trigger when status is set to "Open" (and not just created)
    if not created and instance.status == "Open":
        # Delay pushing to external workflow; do not allow broker/worker errors
        # to crash the request/DB transaction (e.g., when RabbitMQ is down).
        try:
            from .tasks import push_ticket_to_workflow  # Import here!
            from .serializers import TicketSerializer   # Import here!
            # Instead of serializing the entire ticket (which may include
            # file-related objects that are not pickle-friendly), enqueue a
            # minimal payload (ticket_number). The worker can re-fetch the
            # full ticket from the DB when processing the job. This avoids
            # errors like "cannot pickle 'BufferedRandom' instances".
            minimal_payload = {'ticket_number': instance.ticket_number}
            try:
                push_ticket_to_workflow.delay(minimal_payload)
                print(f"[send_ticket_to_workflow] enqueued workflow job for ticket {instance.ticket_number}")
            except Exception as enqueue_err:
                # Log the enqueue failure and continue — do not re-raise
                import logging, traceback
                logger = logging.getLogger(__name__)
                logger.exception("Failed to enqueue push_ticket_to_workflow: %s", enqueue_err)
        except Exception:
            # If importing or serializing fails, log and continue
            import logging
            logging.getLogger(__name__).exception("Error preparing push_ticket_to_workflow task")
        
class TicketAttachment(models.Model):
    ticket = models.ForeignKey('Ticket', on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='ticket_attachments/')
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100)
    file_size = models.IntegerField()  # Size in bytes
    upload_date = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    
    def __str__(self):
        return f"{self.file_name} - {self.ticket.id}"

class TicketComment(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    user_cookie_id = models.IntegerField(
        null=True,
        blank=True,
        db_index=True,
        help_text="User ID from external cookie-auth system"
    )
    comment = models.TextField()
    is_internal = models.BooleanField(default=False)  # For admin-only comments
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Comment on {self.ticket.ticket_number} by {self.user}"


VISIBILITY_CHOICES = [
    ('Employee', 'Employee'),
    ('Ticket Coordinator', 'Ticket Coordinator'),
    ('System Admin', 'System Admin'),
]

ARTICLE_CATEGORY_CHOICES = [
    ('IT Support', 'IT Support'),
    ('Asset Check In', 'Asset Check In'),
    ('Asset Check Out', 'Asset Check Out'),
    ('New Budget Proposal', 'New Budget Proposal'),
    ('Others', 'Others'),
]


class KnowledgeArticle(models.Model):
    subject = models.CharField(max_length=255)
    category = models.CharField(max_length=100, choices=ARTICLE_CATEGORY_CHOICES)
    visibility = models.CharField(max_length=50, choices=VISIBILITY_CHOICES)
    description = models.TextField()
    is_archived = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_articles'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.subject} ({self.category})"


class KnowledgeArticleVersion(models.Model):
    """Stores a simple edit/version history for KnowledgeArticle.

    This is intentionally lightweight: each time an article is created or
    updated we create a new KnowledgeArticleVersion entry. The frontend
    renders the `versions` related_name to present a version history.
    """
    article = models.ForeignKey(KnowledgeArticle, on_delete=models.CASCADE, related_name='versions')
    version_number = models.CharField(max_length=64, blank=True, null=True)
    editor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    changes = models.TextField(blank=True, null=True)
    metadata = models.JSONField(blank=True, null=True)
    modified_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-modified_at']

    def __str__(self):
        return f"Article {self.article_id} - v{self.version_number} @ {self.modified_at}"


class HDTSUser(models.Model):
    """
    Simplified model to store HDTS user information synced from the auth service via message broker.
    Combines user profile and role information into a single table.
    """
    # Primary identifier from auth service
    hdts_user_id = models.IntegerField(unique=True, db_index=True)
    
    # User profile information
    email = models.EmailField(unique=True, db_index=True)
    username = models.CharField(max_length=150, db_index=True, blank=True, default='')
    first_name = models.CharField(max_length=100, blank=True, default='')
    last_name = models.CharField(max_length=100, blank=True, default='')
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    suffix = models.CharField(max_length=10, blank=True, null=True)
    
    # Company/Department information
    company_id = models.CharField(max_length=6, unique=True, db_index=True, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, default='')
    
    # Role (combined from separate role model)
    role = models.CharField(max_length=20, blank=True, default='')
    
    # Status tracking
    status = models.CharField(max_length=10, default='Pending')
    notified = models.BooleanField(default=False)
    
    # Profile picture URL from auth service
    profile_picture = models.URLField(blank=True, null=True)
    
    # Sync tracking
    last_synced_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-last_synced_at']
        verbose_name = 'HDTS User'
        verbose_name_plural = 'HDTS Users'
        indexes = [
            models.Index(fields=['hdts_user_id']),
            models.Index(fields=['email']),
            models.Index(fields=['company_id']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.company_id})"