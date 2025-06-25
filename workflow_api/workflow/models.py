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

    category = models.CharField(max_length=64)
    sub_category = models.CharField(max_length=64)
    department = models.CharField(max_length=64)

    is_published = models.BooleanField(default=False)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="draft")

    # ✅ SLA per priority
    low_sla = models.DurationField(null=True, blank=True, help_text="SLA for low priority")
    medium_sla = models.DurationField(null=True, blank=True, help_text="SLA for medium priority")
    high_sla = models.DurationField(null=True, blank=True, help_text="SLA for high priority")
    urgent_sla = models.DurationField(null=True, blank=True, help_text="SLA for urgent priority")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user_id', 'category', 'sub_category'],
                name='unique_category_subcategory_per_user'
            ),
        ]

    def clean(self):
        """
        Enforce SLA ordering: urgent < high < medium < low
        """
        sla_list = [
            ('urgent_sla', self.urgent_sla),
            ('high_sla', self.high_sla),
            ('medium_sla', self.medium_sla),
            ('low_sla', self.low_sla)
        ]

        for i in range(len(sla_list) - 1):
            current_name, current = sla_list[i]
            next_name, next_val = sla_list[i + 1]
            if current and next_val and current >= next_val:
                raise ValidationError(
                    f"{current_name} should be less than {next_name} (i.e., urgent < high < medium < low)"
                )

    def save(self, *args, **kwargs):
        if not self.pk and not self.workflow_id:
            self.workflow_id = str(uuid.uuid4())
        else:
            if 'workflow_id' in (kwargs.get('update_fields') or []):
                raise ValidationError("workflow_id cannot be modified after creation.")
        self.full_clean()  # Trigger SLA ordering validation
        super().save(*args, **kwargs)