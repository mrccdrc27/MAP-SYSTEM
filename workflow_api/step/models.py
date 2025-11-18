from django.db import models
from role.models import Roles
from django.core.exceptions import ValidationError

class Steps(models.Model):
    step_id = models.AutoField(primary_key=True, unique=True)

    # foreign keys - now reference integer fields
    workflow_id = models.ForeignKey('workflow.Workflows', on_delete=models.CASCADE, to_field='workflow_id')
    role_id = models.ForeignKey(Roles, on_delete=models.PROTECT, to_field='role_id')
    escalate_to = models.ForeignKey(
        Roles,
        on_delete=models.PROTECT,
        to_field='role_id',
        related_name='escalation_steps',
        null=True,
        blank=False,
        help_text="Role to escalate to when step times out or is escalated",
        default=None
    )

    # steps details
    name = models.CharField(max_length=64)
    description = models.CharField(max_length=256, null=True)
    instruction = models.TextField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    weight = models.DecimalField(
        max_digits=4,  # total digits including decimal places
        decimal_places=2,  # number of digits after decimal
        default=0.5
    )

    # frontend design coordinates
    design = models.JSONField(
        default=dict,
        blank=True,
        help_text='Store design coordinates {x, y} for frontend positioning'
    )

    # flags
    is_initialized = models.BooleanField(default=False)
    is_start = models.BooleanField(default=False)  # Indicates if this is the start step
    is_end = models.BooleanField(default=False)    # Indicates if this is the end step

    # timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.name} (Order: {self.order})"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def get_workflow(self):
        from workflow.models import Workflows
        return Workflows.objects.first()



class StepTransition(models.Model):
    transition_id = models.AutoField(primary_key=True, unique=True)
    workflow_id = models.ForeignKey('workflow.Workflows',  unique=False, on_delete=models.CASCADE, to_field='workflow_id', null=True)
    
    from_step_id = models.ForeignKey(
        Steps,
        related_name='outgoing_transitions',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        to_field='step_id'
    )
    to_step_id = models.ForeignKey(
        Steps,
        related_name='incoming_transitions',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        to_field='step_id'
    )
    name = models.CharField(max_length=64, null=True, blank=True)
    design = models.JSONField(
        default=dict,
        blank=True,
        help_text='Store handles for frontend connections {source_handle, target_handle}'
    )
    
    # timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        pass

    def clean(self):
        super().clean()

        # 1) No self-loop
        if self.from_step_id and self.to_step_id and self.from_step_id == self.to_step_id:
            raise ValidationError("from_step and to_step must be different")
        # 2) Same-workflow guard
        if self.from_step_id and self.to_step_id and (
            self.from_step_id.workflow_id != self.to_step_id.workflow_id
        ):
            raise ValidationError("from_step and to_step must belong to the same workflow")

    def save(self, *args, **kwargs):
        # Determine workflow_id from steps
        if self.from_step_id and self.to_step_id:
            if self.from_step_id.workflow_id != self.to_step_id.workflow_id:
                raise ValidationError("from_step and to_step must belong to the same workflow")
            self.workflow_id = self.from_step_id.workflow_id
        elif self.from_step_id:
            self.workflow_id = self.from_step_id.workflow_id
        elif self.to_step_id:
            self.workflow_id = self.to_step_id.workflow_id
        else:
            raise ValidationError("At least one of from_step or to_step must be set.")

        # ensure clean() runs on every save
        self.full_clean()
        super().save(*args, **kwargs)