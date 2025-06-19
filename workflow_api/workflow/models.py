# workflow/models.py
from django.db import models
from django.core.exceptions import ValidationError
import uuid

STATUS_CHOICES = [
    ("draft", "Draft"),
    ("deployed", "Deployed"),
    ("paused", "Paused"),
    ("initialized", "Initialized"),
]
END_LOGIC_CHOICES = [
    ('', 'None'),
    ('asset', 'Asset Management'),
    ('budget', 'Budget Management'),
    ('notification', 'Send Notification'),
]


class Category(models.Model):
    category_id = models.CharField(max_length=64, unique=True, null=True, blank=True)
    name = models.CharField(max_length=64, unique=True)
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        related_name='subcategories',
        on_delete=models.CASCADE,
        to_field='category_id'
    )

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.pk:
            if not self.category_id:
                self.category_id = str(uuid.uuid4())
        else:
            if 'category_id' in kwargs.get('update_fields', []):
                raise ValidationError("category_id cannot be modified after creation.")
        super().save(*args, **kwargs)


class Workflows(models.Model):
    user_id = models.IntegerField(null=False)
    name = models.CharField(max_length=64, unique=True)
    description = models.CharField(max_length=256, null=True)
    workflow_id = models.CharField(max_length=64, unique=True, null=True, blank=True)

    end_logic = models.CharField(
        max_length=32,
        choices=END_LOGIC_CHOICES,
        blank=True,
        help_text="Optional end‐condition to trigger when workflow completes."
    )

    # Now simple text fields instead of FKs
    category = models.CharField(
        max_length=64,
        help_text="Top‐level category name (previously a FK)."
    )
    sub_category = models.CharField(
        max_length=64,
        help_text="Sub‐category name (previously a FK)."
    )

    is_published = models.BooleanField(default=False)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="draft")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # if you still want uniqueness on category + sub_category per user:
        constraints = [
            models.UniqueConstraint(
                fields=['user_id', 'category', 'sub_category'],
                name='unique_category_subcategory_per_user'
            ),
        ]

    def save(self, *args, **kwargs):
        # Assign UUID on create
        if not self.pk and not self.workflow_id:
            self.workflow_id = str(uuid.uuid4())
        # Prevent updates to workflow_id
        else:
            if 'workflow_id' in (kwargs.get('update_fields') or []):
                raise ValidationError("workflow_id cannot be modified after creation.")
        super().save(*args, **kwargs)