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
        # default='asset',  # default to Asset Management
        help_text="Optional end-condition to trigger when workflow completes."
    )

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='main_workflows',
        limit_choices_to={'parent__isnull': True},
        to_field='category_id'
    )
    sub_category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='sub_workflows',
        limit_choices_to={'parent__isnull': False},
        to_field='category_id'
    )

    is_published = models.BooleanField(default=False)

    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="draft")
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['category', 'sub_category'],
                name='unique_main_sub_per_workflow'
            ),
        ]

    def clean(self):
        if self.category and self.category.parent is not None:
            raise ValidationError({
                'category': 'Must be a top-level category (parent is null).'
            })
        if self.sub_category and self.sub_category.parent is None:
            raise ValidationError({
                'sub_category': 'Must be a sub-category (parent is not null).'
            })

    def save(self, *args, **kwargs):
        if not self.pk:
            if not self.workflow_id:
                self.workflow_id = str(uuid.uuid4())
        else:
            if 'workflow_id' in kwargs.get('update_fields', []):
                raise ValidationError("workflow_id cannot be modified after creation.")

        self.full_clean()
        super().save(*args, **kwargs)
