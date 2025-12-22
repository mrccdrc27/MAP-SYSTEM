from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from django.db.models import Sum, Value
from django.db.models.functions import Coalesce
from PIL import Image
import uuid
import magic


def validate_image(image):
    max_size = 5 * 1024 * 1024
    valid_formats = ['JPEG', 'JPG', 'PNG']

    # Check file size
    if image.size > max_size:
        raise ValidationError("Image size exceeds 5 MB limit.")
    
    # Check file format
    try:
        img = Image.open(image)
        if img.format.upper() not in valid_formats:
            raise ValidationError("Invalid image format. Only JPEG and PNG formats are allowed.")
    except Exception as e:
        raise ValidationError(f"Error processing image: {e}")

def validate_file(file):
    max_size = 300 * 1024 * 1024
    allowed_mime_types = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip',
        'text/plain',
        'text/csv',
        'application/json',
    ]

    # Check file size
    if file.size > max_size:
        raise ValidationError("File size exceeds 300 MB limit.")
    
    # Check file format
    try:
        file_mime = magic.from_buffer(file.read(1024), mime=True)
        file.seek(0)
        if file_mime not in allowed_mime_types:
            raise ValidationError(f"Invalid file format. Only PDF, Word, Excel, ZIP, TXT, CSV, and JSON formats are allowed.")
    except Exception as e:
        raise ValidationError(f"Error processing file: {e}")

class Product(models.Model):
    name = models.CharField(max_length=100)
    category = models.PositiveIntegerField()
    manufacturer = models.PositiveIntegerField(blank=True, null=True)
    depreciation = models.PositiveIntegerField(blank=True, null=True)
    model_number = models.CharField(max_length=50, blank=True, null=True)
    end_of_life = models.DateField(blank=True, null=True)
    default_purchase_cost = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    default_supplier = models.PositiveIntegerField(blank=True, null=True)
    minimum_quantity = models.PositiveIntegerField(default=1)
    cpu = models.CharField(max_length=100, blank=True, null=True)
    gpu = models.CharField(max_length=100, blank=True, null=True)
    os = models.CharField(max_length=100, blank=True, null=True)
    ram = models.CharField(max_length=100, blank=True, null=True)

    size = models.CharField(max_length=50, blank=True, null=True)
    storage = models.CharField(max_length=50, blank=True, null=True)
    notes = models.TextField(max_length=500, blank=True, null=True)
    image = models.ImageField(
        upload_to='product_images/',
        blank=True,
        null=True,
        validators=[validate_image]
    )
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name

class Asset(models.Model):
    asset_id = models.CharField(max_length=23, unique=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='product_assets', limit_choices_to={'is_deleted': False})
    status = models.PositiveIntegerField()
    supplier = models.PositiveIntegerField(blank=True, null=True)
    location = models.PositiveIntegerField(blank=True, null=True)
    name = models.CharField(max_length=100, blank=True, null=True)
    serial_number = models.CharField(max_length=50, blank=True, null=True)
    warranty_expiration = models.DateField(blank=True, null=True)
    order_number = models.CharField(max_length=50, blank=True, null=True)
    purchase_date = models.DateField(blank=True, null=True)
    purchase_cost = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    notes = models.TextField(max_length=500, blank=True, null=True)
    image = models.ImageField(
        upload_to='asset_images/',
        blank=True,
        null=True,
        validators=[validate_image]
    )
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.asset_id

@receiver(pre_save, sender=Asset)
def generate_asset_id(sender, instance, **kwargs):
    # If no asset_id and is an empty string, None
    if not instance.asset_id or instance.asset_id.strip() == "":
        today = timezone.now().strftime('%Y%m%d')
        prefix = f"AST-{today}-"
        last_asset = sender.objects.filter(asset_id__startswith=prefix).order_by('-asset_id').first()

        if last_asset:
            try:
                seq_num = int(last_asset.asset_id.split('-')[2])
                new_seq_num = seq_num + 1
            except (ValueError, IndexError):
                new_seq_num = 1
        else:
            new_seq_num = 1

        random_suffix = uuid.uuid4().hex[:4].upper()
        instance.asset_id = f"{prefix}{new_seq_num:05d}-{random_suffix}"

class AssetCheckout(models.Model):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='asset_checkouts', limit_choices_to={'is_deleted': False})
    ticket_id = models.PositiveIntegerField()
    checkout_to = models.PositiveIntegerField()
    location = models.PositiveIntegerField()
    checkout_date = models.DateField()
    return_date = models.DateField(blank=True, null=True)
    revenue = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)  
    condition = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    notes = models.TextField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    
    def __str__(self):
        return f"Checkout of {self.asset.asset_id} by user {self.checkout_to}"

class AssetCheckoutFile(models.Model):
    asset_checkout = models.ForeignKey(AssetCheckout, on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to='asset_checkout_files/', validators=[validate_file])
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    def __str__(self):
        return f"AssetCheckout #{self.asset_checkin.id} - {self.file.name}"

class AssetCheckin(models.Model):
    asset_checkout = models.OneToOneField(AssetCheckout, on_delete=models.CASCADE, related_name='asset_checkin')
    ticket_id = models.PositiveIntegerField(blank=True, null=True)
    checkin_date = models.DateField()
    condition = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    location = models.PositiveIntegerField()
    notes = models.TextField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    def __str__(self):
        return f"Checkin of {self.asset_checkout.asset.asset_id} by user {self.asset_checkout.checkout_to}" 

class AssetCheckinFile(models.Model):
    asset_checkin = models.ForeignKey(AssetCheckin, on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to='asset_checkin_files/', validators=[validate_file])
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    def __str__(self):
        return f"AssetCheckin #{self.asset_checkin.id} - {self.file.name}"

    
class Component(models.Model):
    name = models.CharField(max_length=100)
    category = models.PositiveIntegerField()
    manufacturer = models.IntegerField(blank=True, null=True)
    supplier = models.PositiveIntegerField(blank=True, null=True)
    location = models.PositiveIntegerField(blank=True, null=True)
    model_number = models.CharField(max_length=50, blank=True, null=True)
    order_number = models.CharField(max_length=30, blank=True, null=True)
    purchase_date = models.DateField(blank=True, null=True)
    purchase_cost = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    quantity = models.PositiveIntegerField(default=1)
    minimum_quantity = models.PositiveIntegerField(default=1)
    notes = models.TextField(blank=True, null=True)
    image = models.ImageField(
        upload_to='component_images/',
        blank=True,
        null=True,
        validators=[validate_image]
    )
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    @property
    def total_checked_out(self):
        total_out = (
            ComponentCheckout.objects.filter(
                component=self
            ).aggregate(total=Coalesce(Sum('quantity'), Value(0)))['total']
        )
        return total_out
    
    @property
    def total_checked_in(self):
        total_in = (
            ComponentCheckin.objects.filter(
                component_checkout__component=self
            ).aggregate(total=Coalesce(Sum('quantity'), Value(0)))['total']
        )
        return total_in
    
    @property
    def available_quantity(self):
        return self.quantity - (self.total_checked_out - self.total_checked_in)
    
class ComponentCheckout(models.Model):
    component = models.ForeignKey(Component, on_delete=models.CASCADE, related_name='component_checkouts')
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='checkout_to')
    quantity = models.PositiveIntegerField(default=1)
    checkout_date = models.DateField()
    notes = models.TextField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    def __str__(self):
        return f"Checkout of {self.component.name} to {self.asset.asset_id}"
    
    @property
    def total_checked_in(self):
        return sum(checkin.quantity for checkin in self.component_checkins.all())

    @property
    def remaining_quantity(self):
        return self.quantity - self.total_checked_in

    @property
    def is_fully_returned(self):
        return self.remaining_quantity <= 0

class ComponentCheckin(models.Model):
    component_checkout = models.ForeignKey(ComponentCheckout, on_delete=models.CASCADE, related_name='component_checkins')
    checkin_date = models.DateField()
    quantity = models.PositiveIntegerField(default=1)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    def __str__(self):
        return f"Checkin of {self.component_checkout.component.name} from {self.component_checkout.asset.asset_id}"
    
    def save(self, *args, **kwargs):
        # Prevent over-returning
        if self.pk is None:  # Only validate on new checkins
            if self.quantity > self.component_checkout.remaining_quantity:
                raise ValueError(
                    f"Checkin quantity ({self.quantity}) exceeds remaining quantity "
                    f"({self.component_checkout.remaining_quantity}) for this checkout."
                )
        super().save(*args, **kwargs)

class Repair(models.Model):
    REPAIR_CHOICES = [
        ('maintenance', 'Maintenance'),
        ('repair', 'Repair'),
        ('upgrade', 'Upgrade'),
        ('test', 'Test'),
        ('hardware', 'Hardware'),
        ('software', 'Software'),
    ]
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='repair_assets')
    supplier_id = models.PositiveIntegerField()  # Store the Supplier ID
    type = models.CharField(max_length=20, choices=REPAIR_CHOICES)
    name = models.CharField(max_length=100)
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField(blank=True, null=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True, null=True)
    status_id = models.PositiveIntegerField()
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Repairs on {self.asset.displayed_id} at {self.start_date}"

class RepairFile(models.Model):
    repair = models.ForeignKey(Repair, on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to='repair_files/')
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"File for repair: {self.repair.name}"
    
class AuditSchedule(models.Model):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='audit_schedules')
    date = models.DateField()
    notes = models.TextField(blank=True, null=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now(), editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Audit Schedule for {self.asset.asset_id} on {self.date}"

class Audit(models.Model):
    audit_schedule = models.OneToOneField(AuditSchedule, on_delete=models.CASCADE, related_name='audit')
    location = models.PositiveIntegerField()
    user_id = models.PositiveIntegerField()
    audit_date = models.DateField()
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    is_deleted = models.BooleanField(default=False)
    
    def __str__(self):
        return f"Audit on {self.audit_date} for {self.audit_schedule.asset.asset_id}"
    
class AuditFile(models.Model):
    audit = models.ForeignKey(Audit, on_delete=models.CASCADE, related_name='audit_files')
    file = models.FileField(
        upload_to='audit_files/',
        validators=[validate_file]
    )
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    def __str__(self):
        return f"File(s) for audit on {self.audit.created_at} for {self.audit.audit_schedule.asset.asset_id}"


class AssetReportTemplate(models.Model):
    """Model to store saved asset report templates with filters and column selections."""
    name = models.CharField(max_length=100)
    user_id = models.PositiveIntegerField(blank=True, null=True)  # User who created the template

    # Filter configuration (stored as JSON)
    filters = models.JSONField(default=dict, blank=True)
    # Example: {"status_id": 1, "category_id": 2, "supplier_id": null, "location_id": null}

    # Column selection (stored as JSON list of column IDs)
    columns = models.JSONField(default=list, blank=True)
    # Example: ["asset_id", "asset_name", "purchase_date", "status_data"]

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

class ActivityLog(models.Model):
    ACTION_CHOICE = [
        ("CREATE", "Create"),
        ("UPDATE", "Update"),
        ("DELETE", "Delete"),
        ("LOGIN", "Login"),
        ("LOGOUT", "Logout"),
        ("CHECKIN", "Check-in"),
        ("CHECKOUT", "Check-out"),
        ("SCHEDULE", "Schedule"),
        ("PERFORM", "Perform"),
    ]
    
    user_id = models.PositiveIntegerField()
    module = models.CharField(max_length=100)
    action = models.CharField(max_length=15, choices=ACTION_CHOICE)
    item_id = models.PositiveIntegerField()
    item_name = models.CharField(max_length=100)
    target_user_id = models.PositiveIntegerField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} - {self.item_name}"
