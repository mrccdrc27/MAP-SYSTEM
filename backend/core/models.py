from datetime import timezone
from decimal import Decimal
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.forms import ValidationError
from django.utils import timezone


class Department(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=80, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def get_budget_summary(self, fiscal_year):
        """Get budget vs actual summary for this department"""
        allocations = BudgetAllocation.objects.filter(
            department=self,
            fiscal_year=fiscal_year,
            is_active=True
        )

        total_budget = allocations.aggregate(
            total=models.Sum('amount'))['total'] or 0

        # Get all approved expenses for these allocations
        expenses = Expense.objects.filter(
            budget_allocation__in=allocations,
            status='APPROVED'
        )

        total_spent = expenses.aggregate(
            total=models.Sum('amount'))['total'] or 0

        return {
            'total_budget': total_budget,
            'total_spent': total_spent,
            'remaining': total_budget - total_spent,
            'percentage_used': (total_spent / total_budget * 100) if total_budget > 0 else 0
        }

    def __str__(self):
        return self.name


class AccountType(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class FiscalYear(models.Model):
    name = models.CharField(max_length=50)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    is_locked = models.BooleanField(default=False)

    def __str__(self):
        return self.name

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(end_date__gt=models.F('start_date')),
                name='check_end_date_after_start_date'
            )
        ]


class ProjectFiscalYear(models.Model):
    project = models.ForeignKey('Project', on_delete=models.CASCADE)
    fiscal_year = models.ForeignKey('FiscalYear', on_delete=models.PROTECT)

    class Meta:
        unique_together = ('project', 'fiscal_year')


class DashboardMetric(models.Model):
    metric_type = models.CharField(max_length=100)
    value = models.DecimalField(max_digits=15, decimal_places=2)
    percentage = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=50)
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE)
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    warning_threshold = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True)
    critical_threshold = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True)

    def __str__(self):
        dept_str = f" - {self.department.name}" if self.department else ""
        return f"{self.metric_type}{dept_str} - {self.fiscal_year.name}"


class BudgetProposal(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        # ('UNDER_REVIEW', 'Under Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    SYNC_STATUS_CHOICES = [
        ('SYNCED', 'Synced'),
        ('FAILED', 'Failed'),
        ('PENDING', 'Pending'),
        ('RETRYING', 'Retrying'),
    ]

    title = models.CharField(max_length=200)
    project_summary = models.TextField()
    project_description = models.TextField()
    performance_notes = models.TextField(
        blank=True, help_text="Narrative description of the period of performance.")
    department = models.ForeignKey(Department, on_delete=models.PROTECT)
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.PROTECT)
    submitted_by_name = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='SUBMITTED'
    )
    performance_start_date = models.DateField()
    performance_end_date = models.DateField()
    submitted_at = models.DateTimeField(null=True, blank=True)
    last_modified = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    approved_by_name = models.CharField(max_length=255, null=True, blank=True)
    approval_date = models.DateTimeField(null=True, blank=True)
    rejected_by_name = models.CharField(max_length=255, null=True, blank=True)
    rejection_date = models.DateTimeField(null=True, blank=True)

    # --- UPDATED: New fields for Finance Operator Review ---
    finance_operator_name = models.CharField(
        max_length=255, null=True, blank=True,
        help_text="Name of the finance operator who reviewed this proposal."
    )
    signature = models.FileField(
        upload_to='budget_proposals/signatures/',
        null=True, blank=True,
        help_text="Digital signature or attached approval document."
    )
    # -----------------------------------------------------
    
    external_system_id = models.CharField(
        max_length=100, unique=True, help_text="ID reference from the external help desk system")
    last_sync_timestamp = models.DateTimeField(
        null=True, blank=True, help_text="When this proposal was last synced with the external system")
    sync_status = models.CharField(
        max_length=50,
        choices=SYNC_STATUS_CHOICES,
        default='PENDING',  # Default to "Pending" until first sync
    )
    document = models.FileField(
        upload_to='budget_proposals/documents/',
        null=True,
        blank=True,
        help_text='Optional file attached with the proposal, such as an Excel budget sheet.'
    )

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.title

    class Meta:
        default_permissions = ('change', 'view')
        constraints = [
            models.CheckConstraint(
                check=models.Q(performance_end_date__gt=models.F(
                    'performance_start_date')),
                name='check_performance_end_date_after_start_date'
            )
        ]


class Project(models.Model):
    STATUS_CHOICES = [
        ('PLANNING', 'Planning'),
        ('IN_PROGRESS', 'In Progress'),
        ('ON_HOLD', 'On Hold'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    fiscal_years = models.ManyToManyField(
        'FiscalYear',
        through='ProjectFiscalYear',
        related_name='projects'
    )  # Allow to query project.fiscal_years.all()
    name = models.CharField(max_length=200)
    description = models.TextField()
    start_date = models.DateField()
    end_date = models.DateField()
    department = models.ForeignKey(Department, on_delete=models.PROTECT)
    budget_proposal = models.OneToOneField(
        BudgetProposal, on_delete=models.PROTECT,
        related_name='project',
        help_text='The approved proposal that spawned this project'
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='PLANNING')
    completion_percentage = models.IntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(end_date__gt=models.F('start_date')),
                name='check_project_end_date_after_start_date'
            )
        ]

    def save(self, *args, **kwargs):
        today = timezone.now().date()
        if self.status != 'CANCELLED':
            if today > self.end_date:
                self.status = 'COMPLETED'
            elif today < self.start_date:
                self.status = 'PLANNING'
            else:
                if self.status not in ['IN_PROGRESS', 'ON_HOLD']:
                    self.status = 'IN_PROGRESS'
        super().save(*args, **kwargs)

    # @property
    # def completion_percentage(self):
    #     """Calculate overall project completion based on milestones"""
    #     milestones = self.milestones.all()
    #     if not milestones.exists():
    #         return 0

    #     total_milestones = milestones.count()
    #     completed_weight = sum(m.completion_percentage for m in milestones)
    #     return completed_weight / total_milestones


class RiskMetric(models.Model):
    RISK_TYPE_CHOICES = [
        ('BUDGET', 'Budget'),
        ('TIMELINE', 'Timeline'),
        ('RESOURCES', 'Resources'),
        ('QUALITY', 'Quality'),
    ]

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name='risk_metrics')
    risk_type = models.CharField(max_length=20, choices=RISK_TYPE_CHOICES)
    risk_level = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)])
    description = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    # updated_by = models.ForeignKey(User, on_delete=models.PROTECT)
    updated_by_user_id = models.IntegerField(
        help_text="ID of user from Auth Service") 
    updated_by_username = models.CharField(
        max_length=150, null=True, blank=True)

    class Meta:
        unique_together = ('project', 'risk_type')


class UserActivityLog(models.Model):
    LOG_TYPE_CHOICES = [
        ('LOGIN', 'Login'),
        ('EXPORT', 'Export'),
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('PROCESS', 'Process'),
        ('ERROR', 'Error'),
    ]

    STATUS_CHOICES = [
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
        ('IN_PROGRESS', 'In Progress'),
    ]

    # user = models.ForeignKey(User, on_delete=models.PROTECT)
    user_id = models.IntegerField(
        help_text="ID of user from Auth Service who performed action")  # NEW
    user_username = models.CharField(
        max_length=150, help_text="Username of user (denormalized)")  # NEW
    timestamp = models.DateTimeField(auto_now_add=True)
    log_type = models.CharField(max_length=30, choices=LOG_TYPE_CHOICES)
    action = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    details = models.JSONField(null=True, blank=True)
    def __str__(
        self): return f"{self.user_username} - {self.action} - {self.timestamp}"


class Account(models.Model):
    code = models.CharField(max_length=80, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    account_type = models.ForeignKey(AccountType, on_delete=models.PROTECT)
    parent_account = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='child_accounts')


    created_by_user_id = models.IntegerField(
        help_text="ID of the user from Auth Service who created this account") 
    created_by_username = models.CharField(
        max_length=150, null=True, blank=True, help_text="Username of the creator (denormalized)")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    accomplished = models.BooleanField(default=False)
    accomplishment_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.code} - {self.name}"

class BudgetProposalItem(models.Model):
    proposal = models.ForeignKey(
        BudgetProposal, on_delete=models.CASCADE, related_name='items')
    # MODIFICATION START: Added explicit Category link
    category = models.ForeignKey(
        'ExpenseCategory',
        on_delete=models.PROTECT,
        null=True, # Allow null temporarily for migration compatibility
        help_text="The budget category this item belongs to (e.g., IT-HARDWARE)."
    )
    # MODIFICATION END
    cost_element = models.CharField(max_length=100)
    description = models.TextField()
    estimated_cost = models.DecimalField(
        max_digits=15, decimal_places=2, validators=[MinValueValidator(0)])
    account = models.ForeignKey(Account, on_delete=models.PROTECT)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.cost_element} - {self.estimated_cost}"


class ExpenseCategory(models.Model):
    # --- UPDATED: Added Classification Choices ---
    CLASSIFICATION_CHOICES = [
        ('CAPEX', 'Capital Expenditure'),
        ('OPEX', 'Operational Expenditure'),
        ('MIXED', 'Mixed/Both'),
    ]

    code = models.CharField(max_length=80, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    parent_category = models.ForeignKey('self', on_delete=models.SET_NULL,
                                        null=True, blank=True, related_name='subcategories')
    level = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(3)])
    
    # --- UPDATED: Added Classification Field ---
    classification = models.CharField(
        max_length=10, 
        choices=CLASSIFICATION_CHOICES, 
        null=True, 
        blank=True,
        help_text="Determines if this category is primarily CapEx, OpEx, or Mixed."
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @classmethod
    def get_top_category_with_percentage(cls, fiscal_year=None, department=None):
        """
        Get the top expense category with amount and percentage of total expenses.

        Parameters:
        - fiscal_year: Optional FiscalYear to filter expenses by fiscal year
        - department: Optional Department to filter expenses by department

        Returns:
        {
            'category': ExpenseCategory instance,
            'amount': Decimal value of expenses in this category,
            'percentage': Float percentage of total expenses (0-100)
        }
        """
        from django.db.models import Sum

        # Start with approved expenses only
        expenses_query = Expense.objects.filter(status='APPROVED')

        # Use correct relationships: Expense → BudgetAllocation → Project → BudgetProposal
        if fiscal_year:
            expenses_query = expenses_query.filter(
                budget_allocation__project__budget_proposal__fiscal_year=fiscal_year
            )

        if department:
            expenses_query = expenses_query.filter(
                budget_allocation__project__budget_proposal__department=department
            )

        # Total approved expenses
        total_expenses = expenses_query.aggregate(
            total=Sum('amount')
        )['total'] or 0

        if total_expenses == 0:
            return None

        # Aggregate by category
        categories = expenses_query.values(
            'category', 'category__name'
        ).annotate(
            total_amount=Sum('amount')
        ).order_by('-total_amount')

        if not categories:
            return None

        top_category = categories[0]
        category_obj = cls.objects.get(pk=top_category['category'])

        return {
            'category': category_obj,
            'amount': top_category['total_amount'],
            'percentage': (top_category['total_amount'] / total_expenses) * 100
        }


class BudgetAllocation(models.Model):

    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.PROTECT)
    department = models.ForeignKey(
        'Department',
        on_delete=models.PROTECT,
        related_name='allocations',
        help_text='The department receiving this budget allocation.'
    )
    category = models.ForeignKey(
        ExpenseCategory,
        on_delete=models.PROTECT,
        related_name='budget_allocations',
        help_text='The expense category this allocation is intended for'
    )
    account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name='allocations',
        help_text='The account this allocation funds.'
    )
    proposal = models.ForeignKey(
        BudgetProposal,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='allocations',
        help_text=(
            'Optional link back to the originating proposal '
            '(if this allocation was approved from one).'
        )
    )
    project = models.ForeignKey(
        'Project',
        on_delete=models.CASCADE,
        related_name='allocations',
        help_text='The project this budget allocation belongs to.'
    )
    

    created_by_name = models.CharField(max_length=255, null=True, blank=True)
    amount = models.DecimalField(
        max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    is_active = models.BooleanField(default=True)
    
    # --- UPDATED: Added Lock Status ---
    is_locked = models.BooleanField(
        default=True,
        help_text="If True, this allocation requires Finance Manager approval before use."
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    

    def __str__(self):
        return f"{self.department.name} - {self.account.name} - {self.amount}"

    class Meta:
        ordering = ['department', 'account']

    def get_total_expenses(self):
        """Calculate total approved expenses for this allocation"""
        return self.expense_set.filter(status='APPROVED').aggregate(
            total=models.Sum('amount'))['total'] or 0

    def get_remaining_budget(self):
        """Calculate remaining available budget"""
        return self.amount - self.get_total_expenses()

    def get_usage_percentage(self):
        """Calculate percentage of budget used"""
        if self.amount == 0:
            return 0
        return (self.get_total_expenses() / self.amount) * 100

    def get_monthly_expenses(self, year, month):
        """Get expenses for a specific month"""
        return self.expense_set.filter(
            status='APPROVED',
            date__year=year,
            date__month=month
        ).aggregate(total=models.Sum('amount'))['total'] or 0


class BudgetTransfer(models.Model):
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.PROTECT)
    source_allocation = models.ForeignKey(
        BudgetAllocation, on_delete=models.PROTECT, related_name='transfers_from')
    destination_allocation = models.ForeignKey(
        BudgetAllocation, on_delete=models.PROTECT, related_name='transfers_to')

    # --- MODIFIED USER FIELDS ---
    # transferred_by = models.ForeignKey(User, on_delete=models.PROTECT)
    transferred_by_user_id = models.IntegerField(
        help_text="ID of user from Auth Service") 
    transferred_by_username = models.CharField(
        max_length=150, null=True, blank=True) 

    amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[
                                 MinValueValidator(Decimal('0'))])
    reason = models.TextField()
    transferred_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[('PENDING', 'Pending'), (
        'APPROVED', 'Approved'), ('REJECTED', 'Rejected')], default='PENDING')

    # approved_by = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True, related_name='approved_transfers') # OLD
    approved_by_user_id = models.IntegerField(
        null=True, blank=True, help_text="ID of user from Auth Service")  
    approved_by_username = models.CharField(
        max_length=150, null=True, blank=True)  
    approval_date = models.DateTimeField(null=True, blank=True)

    # rejected_by = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True, related_name='rejected_transfers') # OLD
    rejected_by_user_id = models.IntegerField(
        null=True, blank=True, help_text="ID of user from Auth Service") 
    rejected_by_username = models.CharField(
        max_length=150, null=True, blank=True)  
    rejection_date = models.DateTimeField(null=True, blank=True)
    # ... (__str__, validate_sufficient_funds methods need Expense model to be updated) ...
    def __str__(
        self): return f"Transfer of {self.amount} from {self.source_allocation.department.name} to {self.destination_allocation.department.name}"


class JournalEntry(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('POSTED', 'Posted'),
    ]

    entry_id = models.CharField(max_length=50, unique=True, editable=False)
    category = models.CharField(max_length=100, choices=[
        ('EXPENSES', 'Expenses'),
        ('ASSETS', 'Assets'),
        ('PROJECTS', 'Projects'),
        ('VENDOR_CONTRACTS', 'Vendor & Contracts'),
    ])
    description = models.TextField()
    date = models.DateField()
    total_amount = models.DecimalField(
        max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    # MODIFICATION START: Added Department for Ledger Filtering
    department = models.ForeignKey(
        'Department', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        help_text="The department associated with this journal entry."
    )
    # MODIFICATION END
    created_by_user_id = models.IntegerField(
        help_text="ID of user from Auth Service")
    created_by_username = models.CharField(
        max_length=150, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.entry_id} - {self.description}"

    def save(self, *args, **kwargs):
        if not self.entry_id:
            # Generate a unique entry ID format
            year = self.date.year
            last_entry = JournalEntry.objects.filter(
                entry_id__startswith=f'JE-{year}-').order_by('-entry_id').first()
            if last_entry:
                last_number = int(last_entry.entry_id.split('-')[-1])
                new_number = last_number + 1
            else:
                new_number = 1
            self.entry_id = f'JE-{year}-{new_number:05d}'
        super().save(*args, **kwargs)


class JournalEntryLine(models.Model):
    TRANSACTION_TYPE_CHOICES = [
        ('DEBIT', 'Debit'),
        ('CREDIT', 'Credit'),
    ]

    JOURNAL_TRANSACTION_TYPES = [
        ('CAPITAL_EXPENDITURE', 'Capital Expenditure'),
        ('OPERATIONAL_EXPENDITURE', 'Operational Expenditure'),
        ('TRANSFER', 'Transfer'),
    ]

    journal_entry = models.ForeignKey(
        JournalEntry, on_delete=models.CASCADE, related_name='lines')
    account = models.ForeignKey(Account, on_delete=models.PROTECT)
    
    # MODIFICATION START: Added ExpenseCategory for detailed Ledger reporting
    expense_category = models.ForeignKey(
        'ExpenseCategory',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Specific budget category (e.g., Hardware, Travel) for this line item."
    )
    # MODIFICATION END

    description = models.TextField()
    transaction_type = models.CharField(
        max_length=10, choices=TRANSACTION_TYPE_CHOICES)
    journal_transaction_type = models.CharField(
        max_length=30, choices=JOURNAL_TRANSACTION_TYPES)
    amount = models.DecimalField(
        max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])

    def __str__(self):
        return f"{self.transaction_type} {self.amount} to {self.account.name}"


class Expense(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    project = models.ForeignKey(
        'Project',
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name='expenses',
        help_text='If this expense is specific to a project, link it here.'
    )
    transaction_id = models.CharField(
        max_length=50, unique=True, editable=False)
    date = models.DateField()
    amount = models.DecimalField(
        max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))]) # MODIFIED: Changed 0 to Decimal('0.00')
    description = models.TextField()
    vendor = models.CharField(max_length=200)
    notes = models.TextField(blank=True)
    
    # --- MODIFIED: Receipt field kept for backward compatibility, but ExpenseAttachment preferred ---
    receipt = models.FileField(upload_to='receipts/', null=True, blank=True)
    
    account = models.ForeignKey(Account, on_delete=models.PROTECT)
    department = models.ForeignKey(Department, on_delete=models.PROTECT)
    budget_allocation = models.ForeignKey(
        BudgetAllocation, on_delete=models.PROTECT)
    
    # --- UPDATED: Added Accomplished Status ---
    is_accomplished = models.BooleanField(
        default=False, 
        help_text="True if the manual entry has been checked and verified by the Finance Manager."
    )

    submitted_by_user_id = models.IntegerField(
        help_text="ID of user from Auth Service")  # NEW
    submitted_by_username = models.CharField(
        max_length=150, null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    posting_date = models.DateField(null=True, blank=True)
    approved_by_user_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="ID of approving user from Auth Service"
    )
    approved_by_username = models.CharField(
        max_length=150,
        null=True,
        blank=True,
        help_text="Username of approving user"
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    category = models.ForeignKey(ExpenseCategory, on_delete=models.PROTECT,
                                 related_name='expenses')

    def __str__(self):
        return f"{self.description} - {self.date}"

    def clean(self):
        super().clean()
        # Skip validation for non-approved expenses
        if self.status != 'APPROVED':
            return

        # Check if this expense would exceed the budget allocation
        allocated = self.budget_allocation.amount
        spent = Expense.objects.filter(
            budget_allocation=self.budget_allocation,
            status='APPROVED'
        ).exclude(pk=self.pk).aggregate(total=models.Sum('amount'))['total'] or 0

        if spent + self.amount > allocated:
            raise ValidationError({
                'amount': f"This expense of {self.amount} would exceed the remaining budget of {allocated - spent}."
            })

    def save(self, *args, **kwargs):
        if not self.transaction_id:
            date_part = timezone.now().strftime("%Y%m%d")
            last_expense = Expense.objects.filter(
                transaction_id__startswith=f"TXN-{date_part}").order_by('transaction_id').last()
            if last_expense and last_expense.transaction_id:
                last_number = int(last_expense.transaction_id.split("-")[-1])
            else:
                last_number = 0
            self.transaction_id = f"TXN-{date_part}-{last_number + 1:04d}"
        if self.status == 'APPROVED' and not self.approved_at:
            self.approved_at = timezone.now()
        super().save(*args, **kwargs)

    @classmethod
    def get_top_category_with_percentage(cls, fiscal_year=None, department=None):
        """
        Get the top expense category with amount and percentage of total expenses.

        Parameters:
        - fiscal_year: Optional FiscalYear to filter expenses by fiscal year
        - department: Optional Department to filter expenses by department

        Returns:
        {
            'category': ExpenseCategory instance,
            'amount': Decimal value of expenses in this category,
            'percentage': Float percentage of total expenses (0-100)
        }
        """
        from django.db.models import Sum, F

        # Base query for approved expenses
        expenses_query = Expense.objects.filter(status='APPROVED')

        # Apply optional filters
        if fiscal_year:
            expenses_query = expenses_query.filter(
                budget_allocation__fiscal_year=fiscal_year
            )

        if department:
            expenses_query = expenses_query.filter(department=department)

        # Get total approved expenses
        total_expenses = expenses_query.aggregate(
            total=Sum('amount')
        )['total'] or 0

        if total_expenses == 0:
            return None

        # Group by category, sum amounts, and order by highest amount
        categories = expenses_query.values(
            'category', 'category__name'
        ).annotate(
            total_amount=Sum('amount')
        ).order_by('-total_amount')

        if not categories:
            return None

        # Get the top category
        top_category = categories[0]
        category_obj = cls.objects.get(pk=top_category['category'])

        return {
            'category': category_obj,
            'amount': top_category['total_amount'],
            'percentage': (top_category['total_amount'] / total_expenses) * 100
        }

# --- NEW MODEL: ExpenseAttachment ---
class ExpenseAttachment(models.Model):
    """
    Allows multiple files (Receipts, Invoices, etc.) to be attached to a single Expense.
    """
    expense = models.ForeignKey(
        Expense, 
        on_delete=models.CASCADE, 
        related_name='attachments'
    )
    file = models.FileField(upload_to='expense_attachments/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Attachment for {self.expense.transaction_id}"

class Document(models.Model):
    DOCUMENT_TYPES = [
        ('RECEIPT', 'Receipt'),
        ('PROPOSAL', 'Budget Proposal'),
        ('CONTRACT', 'Contract'),
        ('OTHER', 'Other'),
    ]
    project = models.ForeignKey(
        'Project',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='documents',
        help_text='Optional link for project-specific docs.'
    )
    file = models.FileField(upload_to='documents/')
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES)
    name = models.CharField(max_length=255)
    # uploaded_by = models.ForeignKey(User, on_delete=models.PROTECT)
    uploaded_by_user_id = models.IntegerField(
        help_text="ID of user from Auth Service")  # NEW
    uploaded_by_username = models.CharField(
        max_length=150, null=True, blank=True)  # NEW
    uploaded_at = models.DateTimeField(auto_now_add=True)
    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True)
    proposal = models.ForeignKey(BudgetProposal, on_delete=models.CASCADE,
                                 null=True, blank=True, related_name='documents')
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE,
                                null=True, blank=True, related_name='documents')
    metadata = models.JSONField(blank=True, null=True)

    def __str__(self):
        return self.name


class ProposalHistory(models.Model):
    ACTION_CHOICES = [
        ('CREATED', 'Created'),
        ('SUBMITTED', 'Submitted'),
        ('REVIEWED', 'Reviewed'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('UPDATED', 'Updated'),
    ]

    proposal = models.ForeignKey(
        BudgetProposal, on_delete=models.CASCADE, related_name='history')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    # If need to link to the auth_service user who performed the action:
    # action_by_user_id = models.IntegerField(null=True, blank=True)
    action_by_name = models.CharField(max_length=100, null=True, blank=True)
    action_at = models.DateTimeField(auto_now_add=True)
    previous_status = models.CharField(max_length=20, blank=True, null=True)
    new_status = models.CharField(max_length=20, blank=True, null=True)
    comments = models.TextField(blank=True)

    def __str__(self):
        return f"{self.proposal.title} {self.action} by {self.action_by_name or 'Unknown'}"

    class Meta:
        ordering = ['-action_at']
        verbose_name_plural = "Proposal histories"


class ProposalComment(models.Model):
    proposal = models.ForeignKey(
        BudgetProposal, on_delete=models.CASCADE, related_name='comments')
    # user = models.ForeignKey(User, on_delete=models.PROTECT)
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    user_id = models.IntegerField(
        help_text="ID of user from Auth Service who commented")  # NEW
    user_username = models.CharField(
        # NEW
        max_length=150, help_text="Username of commenter (denormalized)")
    def __str__(
        self): return f"Comment on {self.proposal.title} by {self.user_username}"


class TransactionAudit(models.Model):
    TRANSACTION_TYPE_CHOICES = [
        ('EXPENSE', 'Expense'),
        ('JOURNAL_ENTRY', 'Journal Entry'),
        ('TRANSFER', 'Transfer'),
    ]

    ACTION_CHOICES = [
        ('CREATED', 'Created'),
        ('UPDATED', 'Updated'),
        ('DELETED', 'Deleted'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    transaction_type = models.CharField(
        max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    transaction_id_ref = models.IntegerField()
    # user = models.ForeignKey(User, on_delete=models.PROTECT)
    user_id = models.IntegerField(
        help_text="ID of user from Auth Service related to audit")  # NEW
    user_username = models.CharField(
        max_length=150, help_text="Username of user (denormalized)")  # NEW

    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.JSONField()

    def __str__(
        self): return f"{self.transaction_type} {self.transaction_id_ref} {self.action} by {self.user_username}"

    @receiver(post_save, sender=Expense)
    def expense_audit_log(sender, instance, created, **kwargs):
        """Create audit entry when expense is created or updated"""
        action = 'CREATED' if created else 'UPDATED'

        # Get the user from the current request if available
        user = None
        if hasattr(instance, 'submitted_by'):
            user = instance.submitted_by
        elif hasattr(instance, 'approved_by') and instance.approved_by:
            user = instance.approved_by

        if not user:
            # If we can't determine the user, we can't create the audit
            return

        # Create transaction audit record
        TransactionAudit.objects.create(
            transaction_type='EXPENSE',
            transaction_id_ref=instance.id,
            user=user,
            action=action,
            details={
                'amount': str(instance.amount),
                'description': instance.description,
                'status': instance.status,
                'department_id': instance.department.id,
                'budget_allocation_id': instance.budget_allocation.id
            }
        )
        
class Forecast(models.Model):
    """
    A container for a specific forecast run. For example, "FY2025 Overall Forecast".
    """
    ALGORITHM_CHOICES = [
        ('LINEAR_PROJECTION', 'Linear Projection'),
        # You can add more complex algorithms here in the future
    ]
    
    id = models.AutoField(primary_key=True)
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='forecasts')
    generated_at = models.DateTimeField(auto_now_add=True, db_index=True) # Index for fast lookups
    algorithm_used = models.CharField(max_length=50, choices=ALGORITHM_CHOICES, default='LINEAR_PROJECTION')
    
    # You could add a department ForeignKey if you want department-specific forecasts
    # department = models.ForeignKey(Department, on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        ordering = ['-generated_at'] # The newest forecast is the most relevant

    def __str__(self):
        return f"Forecast for {self.fiscal_year.name} generated at {self.generated_at.strftime('%Y-%m-%d %H:%M')}"


class ForecastDataPoint(models.Model):
    """
    A single data point within a forecast, representing a value for a specific month.
    """
    id = models.AutoField(primary_key=True)
    forecast = models.ForeignKey(Forecast, on_delete=models.CASCADE, related_name='data_points')
    month = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(12)])
    month_name = models.CharField(max_length=10) # e.g., "January"
    forecasted_value = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        ordering = ['month']
        unique_together = ('forecast', 'month') # Ensures one data point per month per forecast

    def __str__(self):
        return f"{self.month_name}: {self.forecasted_value}"


"""
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
        return self.create_user(email, username, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('ADMIN',        'Administrator'),
        ('FINANCE_HEAD', 'Finance Head'),
    ]

    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True)
    phone_number = models.CharField(
        max_length=20, unique=True, null=True, blank=True)

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
        return f"{self.first_name} {self.last_name}"


class LoginAttempt(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.CharField(max_length=255)
    success = models.BooleanField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        status = "Successful" if self.success else "Failed"
        user_str = self.user.username if self.user else "Unknown"
        return f"{status} login attempt by {user_str} at {self.timestamp}"
"""
