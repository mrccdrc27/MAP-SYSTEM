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
    check_out_date = models.DateField(blank=True, null=True)
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
    # Current TTS agent working on this ticket (synced from workflow service via /tasks/logs/)
    current_agent = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='agent_tickets')
    # Ticket Owner: The ticket coordinator assigned as owner when ticket is approved/opened
    # Stores the external user ID from auth service (similar to employee_cookie_id)
    ticket_owner_id = models.IntegerField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Ticket Coordinator user ID from auth service who owns this ticket"
    )
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
    # Trigger when:
    # 1. A NEW ticket is created with status "Open" (created=True and status=Open)
    # 2. An EXISTING ticket is updated to status "Open" (created=False and status=Open)
    if instance.status == "Open":
        # Delay pushing to external workflow; do not allow broker/worker errors
        # to crash the request/DB transaction (e.g., when RabbitMQ is down).
        try:
            from .tasks import push_ticket_to_workflow  # Import here!
            
            # Build ticket data dictionary manually to ensure JSON serialization
            # and avoid issues with file objects or request context
            ticket_data = {
                'id': instance.id,
                'ticket_number': instance.ticket_number,
                'subject': instance.subject,
                'category': instance.category,
                'sub_category': instance.sub_category,
                'description': instance.description,
                'ticket_owner_id': instance.ticket_owner_id,  # HDTS-assigned ticket coordinator
                'scheduled_date': str(instance.scheduled_date) if instance.scheduled_date else None,
                'priority': instance.priority,
                'department': instance.department,
                'asset_name': instance.asset_name,
                'serial_number': instance.serial_number,
                'location': instance.location,
                'expected_return_date': str(instance.expected_return_date) if instance.expected_return_date else None,
                'issue_type': instance.issue_type,
                'other_issue': instance.other_issue,
                'performance_start_date': str(instance.performance_start_date) if instance.performance_start_date else None,
                'performance_end_date': str(instance.performance_end_date) if instance.performance_end_date else None,
                'approved_by': instance.approved_by,
                'rejected_by': instance.rejected_by,
                'cost_items': instance.cost_items,
                'requested_budget': str(instance.requested_budget) if instance.requested_budget else None,
                'fiscal_year': instance.fiscal_year,
                'department_input': instance.department_input,
                'dynamic_data': instance.dynamic_data,
                'status': instance.status,
                'submit_date': instance.submit_date.isoformat() if instance.submit_date else None,
                'update_date': instance.update_date.isoformat() if instance.update_date else None,
                'rejection_reason': instance.rejection_reason,
                'date_completed': instance.date_completed.isoformat() if instance.date_completed else None,
                'csat_rating': instance.csat_rating,
                'feedback': instance.feedback,
            }
            
            # Add employee info if available (for assignment context)
            if instance.employee:
                ticket_data['employee_id'] = instance.employee.id
                ticket_data['employee_company_id'] = instance.employee.company_id
                ticket_data['employee_email'] = instance.employee.email
                ticket_data['employee'] = {
                    'first_name': instance.employee.first_name,
                    'last_name': instance.employee.last_name,
                    'email': instance.employee.email,
                    'company_id': instance.employee.company_id,
                    'department': instance.employee.department,
                }
            elif instance.employee_cookie_id:
                # Fallback to HDTSUser or ExternalEmployee when employee is null but cookie_id exists
                ticket_data['employee_cookie_id'] = instance.employee_cookie_id
                try:
                    # First try HDTSUser (synced user+role data)
                    hdts_user = HDTSUser.objects.filter(hdts_user_id=instance.employee_cookie_id).first()
                    if hdts_user:
                        ticket_data['employee'] = {
                            'first_name': hdts_user.first_name,
                            'last_name': hdts_user.last_name,
                            'email': hdts_user.email,
                            'company_id': hdts_user.company_id,
                            'department': hdts_user.department,
                        }
                        ticket_data['employee_email'] = hdts_user.email
                        ticket_data['employee_company_id'] = hdts_user.company_id
                    else:
                        # Fallback to ExternalEmployee (try both external_user_id and external_employee_id)
                        ext_emp = ExternalEmployee.objects.filter(external_user_id=instance.employee_cookie_id).first()
                        if not ext_emp:
                            ext_emp = ExternalEmployee.objects.filter(external_employee_id=instance.employee_cookie_id).first()
                        if ext_emp:
                            ticket_data['employee'] = {
                                'first_name': ext_emp.first_name,
                                'last_name': ext_emp.last_name,
                                'email': ext_emp.email,
                                'company_id': ext_emp.company_id,
                                'department': ext_emp.department,
                            }
                            ticket_data['employee_email'] = ext_emp.email
                            ticket_data['employee_company_id'] = ext_emp.company_id
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning(f"Could not fetch HDTSUser/ExternalEmployee for cookie_id {instance.employee_cookie_id}: {e}")
            
            # Add attachment info (just metadata, not file contents)
            attachments = []
            for att in instance.attachments.all():
                attachments.append({
                    'id': att.id,
                    'file_name': att.file_name,
                    'file_type': att.file_type,
                    'file_size': att.file_size,
                    'file_path': att.file.name if att.file else None,
                })
            ticket_data['attachments'] = attachments
            
            # Flatten dynamic_data fields for AMS asset tickets
            # TTS expects these at the top level for asset check-in/check-out workflows
            if instance.dynamic_data and instance.category in ('Asset Check In', 'Asset Check Out'):
                dd = instance.dynamic_data
                # AMS critical fields
                ticket_data['asset_id'] = dd.get('asset_id')
                ticket_data['asset_id_number'] = dd.get('asset_id_number')
                ticket_data['location_id'] = dd.get('location_id')
                # Checkout fields
                ticket_data['checkout_date'] = dd.get('checkout_date')
                ticket_data['return_date'] = dd.get('return_date')
                # Checkin fields
                ticket_data['checkin_date'] = dd.get('checkin_date')
                ticket_data['asset_checkout'] = dd.get('asset_checkout')  # Reference to checkout record
            
            try:
                push_ticket_to_workflow.delay(ticket_data)
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
    comment = models.TextField(blank=True, default='')
    attachment = models.FileField(upload_to='comment_attachments/', null=True, blank=True)
    attachment_name = models.CharField(max_length=255, null=True, blank=True)
    attachment_type = models.CharField(max_length=100, null=True, blank=True)
    is_internal = models.BooleanField(default=False)  # For admin-only comments
    is_auto_response = models.BooleanField(default=False)  # System-generated auto-response
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
    tags = models.JSONField(default=list, blank=True, help_text='List of tags for the article')
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


# =====================================================
# Employee Notification Model
# =====================================================

NOTIFICATION_TYPE_CHOICES = [
    ('ticket_submitted', 'Ticket Submitted'),
    ('ticket_approved', 'Ticket Approved'),
    ('ticket_rejected', 'Ticket Rejected'),
    ('ticket_in_progress', 'Ticket In Progress'),
    ('ticket_on_hold', 'Ticket On Hold'),
    ('ticket_resolved', 'Ticket Resolved'),
    ('ticket_closed', 'Ticket Closed'),
    ('ticket_withdrawn', 'Ticket Withdrawn'),
    ('new_reply', 'New Reply'),
    ('owner_reply', 'Owner Reply'),
]


class EmployeeNotification(models.Model):
    """
    Notification model for employee-side notifications in HDTS.
    Tracks notifications related to ticket actions and status changes.
    """
    # The employee who receives this notification (external user ID from auth service)
    employee_id = models.IntegerField(db_index=True, help_text="External employee ID from auth service")
    
    # Optional ticket reference
    ticket = models.ForeignKey(
        'Ticket',
        on_delete=models.CASCADE,
        related_name='employee_notifications',
        null=True,
        blank=True
    )
    
    # Notification type for categorization and icon display
    notification_type = models.CharField(
        max_length=32,
        choices=NOTIFICATION_TYPE_CHOICES,
        default='ticket_submitted'
    )
    
    # Display content
    title = models.CharField(max_length=255)
    message = models.TextField()
    
    # Read status
    is_read = models.BooleanField(default=False, db_index=True)
    
    # Optional link destination (e.g., ticket detail, messaging)
    # Can be 'ticket', 'message', or custom path
    link_type = models.CharField(max_length=32, blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Employee Notification'
        verbose_name_plural = 'Employee Notifications'
        indexes = [
            models.Index(fields=['employee_id', 'is_read']),
            models.Index(fields=['employee_id', '-created_at']),
        ]
    
    def __str__(self):
        return f"Notification for Employee {self.employee_id}: {self.title}"
    
    def mark_as_read(self):
        """Mark the notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    @classmethod
    def create_notification(cls, employee_id, notification_type, title, message, ticket=None, link_type=None):
        """
        Factory method to create a notification.
        """
        return cls.objects.create(
            employee_id=employee_id,
            notification_type=notification_type,
            title=title,
            message=message,
            ticket=ticket,
            link_type=link_type or ('ticket' if ticket else None)
        )
    
    @classmethod
    def create_ticket_submitted_notification(cls, employee_id, ticket):
        """Create notification when employee submits a ticket."""
        return cls.create_notification(
            employee_id=employee_id,
            notification_type='ticket_submitted',
            title='Ticket Submitted',
            message=f'Your ticket "{ticket.subject}" has been submitted successfully.',
            ticket=ticket,
            link_type='ticket'
        )
    
    @classmethod
    def create_ticket_status_notification(cls, employee_id, ticket, new_status, actor_name=None):
        """Create notification when ticket status changes."""
        status_messages = {
            'Open': ('Ticket Approved', f'Your ticket "{ticket.subject}" has been approved and is now open.'),
            'In Progress': ('Ticket In Progress', f'Your ticket "{ticket.subject}" is now being worked on.'),
            'On Hold': ('Ticket On Hold', f'Your ticket "{ticket.subject}" has been put on hold.'),
            'Resolved': ('Ticket Resolved', f'Your ticket "{ticket.subject}" has been resolved.'),
            'Rejected': ('Ticket Rejected', f'Your ticket "{ticket.subject}" has been rejected.'),
            'Closed': ('Ticket Closed', f'Your ticket "{ticket.subject}" has been closed.'),
            'Withdrawn': ('Ticket Withdrawn', f'Your ticket "{ticket.subject}" has been withdrawn.'),
        }
        
        notification_type_map = {
            'Open': 'ticket_approved',
            'In Progress': 'ticket_in_progress',
            'On Hold': 'ticket_on_hold',
            'Resolved': 'ticket_resolved',
            'Rejected': 'ticket_rejected',
            'Closed': 'ticket_closed',
            'Withdrawn': 'ticket_withdrawn',
        }
        
        if new_status not in status_messages:
            return None
        
        title, message = status_messages[new_status]
        notification_type = notification_type_map.get(new_status, 'ticket_submitted')
        
        return cls.create_notification(
            employee_id=employee_id,
            notification_type=notification_type,
            title=title,
            message=message,
            ticket=ticket,
            link_type='ticket'
        )
    
    @classmethod
    def create_reply_notification(cls, employee_id, ticket, replier_name=None):
        """Create notification when ticket owner replies."""
        message = f'New reply on your ticket "{ticket.subject}"'
        if replier_name:
            message = f'{replier_name} replied to your ticket "{ticket.subject}"'
        
        return cls.create_notification(
            employee_id=employee_id,
            notification_type='owner_reply',
            title='New Reply',
            message=message,
            ticket=ticket,
            link_type='message'
        )