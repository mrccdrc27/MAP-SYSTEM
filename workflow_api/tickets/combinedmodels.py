from django.db import models
from django.core.exceptions import ValidationError

STATUS_CHOICES = [
    ("draft", "Draft"),
    ("deployed", "Deployed"),
    ("paused", "Paused"),
    ("initialized", "Initialized"),
]

class Category(models.Model):
    name = models.CharField(max_length=64, unique=True)
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        related_name='subcategories',
        on_delete=models.CASCADE
    )

    def __str__(self):
        return self.name


class Workflows(models.Model):
    user_id        = models.IntegerField(null=False)
    name  = models.CharField(max_length=64, unique=True)
    description   = models.CharField(max_length=256, null=True)
    workflow_id = models.CharField(max_length=64, unique=True, null=True, blank=True)

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='main_workflows',
        limit_choices_to={'parent__isnull': True},   # <-- only root cats
    )
    sub_category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='sub_workflows',
        limit_choices_to={'parent__isnull': False},  # <-- only subcats
    )

    # timestamp fields
    status        = models.CharField(max_length=16, choices=STATUS_CHOICES, default="draft")
    createdAt     = models.DateTimeField(auto_now_add=True)
    updatedAt     = models.DateTimeField(auto_now=True)

    # is_initialized = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['category', 'sub_category'],
                name='unique_main_sub_per_workflow'
            ),
        ]

    def clean(self):
        # Enforce category.parent is None
        if self.category and self.category.parent is not None:
            raise ValidationError({
                'category': 'Must be a top-level category (parent is null).'
            })

        # Enforce sub_category.parent is not None
        if self.sub_category and self.sub_category.parent is None:
            raise ValidationError({
                'sub_category': 'Must be aa sub-category (parent is not null).'
            })

    def save(self, *args, **kwargs):
        if not self.workflow_id:
            self.workflow_id = str(uuid.uuid4())
        else:
            raise ValidationError("workflow_id cannot be modified after creation.")
        self.full_clean()
        super().save(*args, **kwargs)
class Task(models.Model):
    ticket_id = models.ForeignKey(
        'tickets.WorkflowTicket',  # Assuming Ticket model is in tickets app
        on_delete=models.CASCADE,
    )
    workflow_id = models.ForeignKey('workflow.Workflows', on_delete=models.CASCADE)

    def get_workflow(self):
        # Optional: only if you need to reference it somewhere dynamically
        from workflow.models import Workflows
        return Workflows.objects.first()
    
    
    def get_ticket(self):
        # Optional: only if you need to reference it somewhere dynamically
        from tickets.models import WorkflowTicket
        return WorkflowTicket.objects.first()

    fetched_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'Task {self.id} for Ticket ID: {self.ticket_id}'

from django.db import models
from role.models import Roles
from action.models import Actions
from django.core.exceptions import ValidationError

class Steps(models.Model):
    # foreign keys
    workflow_id = models.ForeignKey('workflow.Workflows', on_delete=models.CASCADE)
    role_id = models.ForeignKey(Roles, on_delete=models.PROTECT)

    # steps details
    name = models.CharField(max_length=64, unique=True)
    description = models.CharField(max_length=256, null=True)
    order = models.PositiveIntegerField(default=0)

    # flags
    is_initialized = models.BooleanField(default=False)

    # timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.stepName} (Order: {self.order})"

    def get_workflow(self):
        # Optional: only if you need to reference it somewhere dynamically
        from workflow.models import Workflows
        return Workflows.objects.first()
class StepTransition(models.Model):
    from_step_id = models.ForeignKey(
        Steps,
        related_name='outgoing_transitions',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    to_step_id = models.ForeignKey(
        Steps,
        related_name='incoming_transitions',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    action_id = models.ForeignKey(
        Actions,
        on_delete=models.CASCADE,
        null=True,
        unique=True,  # enforce one-to-one between Action and StepTransition
    )

    class Meta:
        constraints = [
            # this is redundant if you use unique=True above, but shown here
            models.UniqueConstraint(
                fields=['action_id'],
                name='unique_action_per_transition'
            )
        ]

    def clean(self):
        super().clean()

        # 1) No self-loop
        if self.from_step_id and self.to_step_id and self.from_step_id == self.to_step_id:
            raise ValidationError("from_step and to_step must be different")
        # 2) Same-workflow guard - Fixed attribute names
        if self.from_step_id and self.to_step_id and (
            self.from_step_id.workflow_id != self.to_step_id.workflow_id
        ):
            raise ValidationError("from_step and to_step must belong to the same workflow")

    def save(self, *args, **kwargs):
        # ensure clean() runs on every save
        self.full_clean()
        super().save(*args, **kwargs)

from django.db import models

class Roles(models.Model):
    # used to who creates the model
    user_id = models.IntegerField(null=False)
    # Must be unique
    name = models.CharField(max_length=64, unique=True)
    description = models.CharField(max_length=256, null=True)

    # timestamps
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

from django.db import models

class Actions(models.Model):
    
    # revise not to be unique, as actions with similar name can be reused across workflows
    name = models.CharField(max_length=64, unique=True)
    description = models.CharField(max_length=256, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

# Create your models here.
