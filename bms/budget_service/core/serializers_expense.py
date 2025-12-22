from decimal import Decimal
from core.models import Account, BudgetAllocation, Department, Expense, ExpenseAttachment, ExpenseCategory, FiscalYear, Project
from rest_framework import serializers
from django.db.models import Sum
from django.utils import timezone
from django.db import transaction
from .views_utils import get_user_bms_role


class ExpenseMessageSerializer(serializers.ModelSerializer):
    """
    Serializer for incoming expense creation requests from other services (AMS, HDS).
    """
    ticket_id = serializers.CharField(
        write_only=True, source='transaction_id', required=True)
    project_id = serializers.IntegerField(write_only=True, required=True)
    account_code = serializers.CharField(write_only=True, required=True)
    category_code = serializers.CharField(write_only=True, required=True)
    submitted_by_name = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = Expense
        fields = [
            'ticket_id', 'project_id', 'account_code', 'category_code', 'submitted_by_name',
            'amount', 'date', 'description', 'vendor', 'notes'
        ]

    def create(self, validated_data):
        try:
            project = Project.objects.get(id=validated_data['project_id'])
            account = Account.objects.get(code=validated_data['account_code'])
            category = ExpenseCategory.objects.get(
                code=validated_data['category_code'])
        except Project.DoesNotExist:
            raise serializers.ValidationError(
                {'project_id': 'Project not found.'})
        except Account.DoesNotExist:
            raise serializers.ValidationError(
                {'account_code': 'Account not found.'})
        except ExpenseCategory.DoesNotExist:
            raise serializers.ValidationError(
                {'category_code': 'Expense category not found.'})

        allocation = BudgetAllocation.objects.filter(
            project=project, is_active=True).first()
        if not allocation:
            raise serializers.ValidationError(
                f'No active budget allocation found for project "{project.name}".')

        expense = Expense.objects.create(
            transaction_id=validated_data['transaction_id'],
            project=project,
            account=account,
            category=category,
            department=project.department,
            budget_allocation=allocation,
            amount=validated_data['amount'],
            date=validated_data['date'],
            description=validated_data['description'],
            vendor=validated_data['vendor'],
            notes=validated_data.get('notes', ''),
            submitted_by_username=validated_data['submitted_by_name'],
            status='SUBMITTED'
        )
        return expense


class ExpenseHistorySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source='category.name', read_only=True)

    class Meta:
        model = Expense
        fields = ['id', 'date', 'description', 'category_name', 'amount']


class ExpenseTrackingSerializer(serializers.ModelSerializer):
    reference_no = serializers.CharField(
        source='transaction_id', read_only=True)
    department_name = serializers.CharField(
        source='department.name', read_only=True)
    # The main category (e.g., CAPEX, OPEX) is the parent of the assigned expense category.
    category_name = serializers.CharField(
        source='category.parent_category.name', read_only=True, allow_null=True)
    sub_category_name = serializers.CharField(
        source='category.name', read_only=True)
    accomplished = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            'id',
            'reference_no',       # Corresponds to "Ticket ID"
            'date',               # Corresponds to "Date"
            'department_name',    # Corresponds to "Department"
            'category_name',      # Corresponds to "Category"
            'sub_category_name',  # Corresponds to "Sub-category"
            'description',
            'vendor',  # Added Vendor
            'amount',             # Corresponds to "Amount"
            'status',             # Corresponds to "Status"
            'accomplished'        # Corresponds to "Accomplished"
        ]

    def get_accomplished(self, obj):
        # Return "Yes" if is_accomplished is True, else "No"
        return "Yes" if obj.is_accomplished else "No"

# MODIFICATION START: New serializer for the expense review action


class ExpenseReviewSerializer(serializers.Serializer):
    """
    Serializer for validating the input for approving or rejecting an expense.
    """
    status = serializers.ChoiceField(choices=['APPROVED', 'REJECTED'])
    notes = serializers.CharField(
        required=False, allow_blank=True, help_text="Reason for approval or rejection.")

    def validate_status(self, value):
        if value not in ['APPROVED', 'REJECTED']:
            raise serializers.ValidationError(
                "Status must be either 'APPROVED' or 'REJECTED'.")
        return value
# MODIFICATION END


class ExpenseDetailForModalSerializer(serializers.ModelSerializer):
    proposal_id = serializers.IntegerField(source='project.budget_proposal.id', read_only=True)
    vendor = serializers.CharField(read_only=True)  # ADD THIS LINE
    date = serializers.DateField(read_only=True)    # ADD THIS LINE
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)  # ADD THIS LINE
    description = serializers.CharField(read_only=True)  # ADD THIS LINE
    department_name = serializers.CharField(source='department.name', read_only=True)  # ADD THIS LINE
    category_name = serializers.CharField(source='category.name', read_only=True)  # ADD THIS LINE
    sub_category_name = serializers.CharField(source='category.parent_category.name', read_only=True, allow_null=True)  # ADD THIS LINE
    project_title = serializers.CharField(source='project.budget_proposal.title', read_only=True)  # ADD THIS LINE
    performance_end_date = serializers.DateField(source='project.budget_proposal.performance_end_date', read_only=True)  # ADD THIS LINE
    class Meta:
        model = Expense
        fields = [
            'id', 
            'proposal_id',
            'vendor',           # ADDED
            'date',             # ADDED
            'amount',           # ADDED
            'description',      # ADDED
            'department_name',  # ADDED
            'category_name',    # ADDED
            'sub_category_name', # ADDED
            'project_title',    # ADDED
            'performance_end_date'  # ADDED
        ]
        
class ExpenseCreateSerializer(serializers.ModelSerializer):
    # MODIFICATION: Require Project ID instead of Department ID
    project_id = serializers.IntegerField(write_only=True)
    category_code = serializers.CharField(
        write_only=True)  # This is for the Sub-Category
    attachments = serializers.ListField(
        child=serializers.FileField(allow_empty_file=False),
        write_only=True,
        required=False
    )

    class Meta:
        model = Expense
        fields = [
            'project_id', 'category_code',
            'amount', 'date', 'description', 'vendor',
            'notes', 'attachments'
        ]
        extra_kwargs = {
            'amount': {'required': True},
            'date': {'required': True},
            'description': {'required': False, 'allow_blank': True},
            'vendor': {'required': True},
            'notes': {'required': False, 'allow_blank': True},
        }

    def validate(self, data):
        project_id = data.get('project_id')
        category_code = data.get('category_code')
        expense_amount = data.get('amount')

        try:
            # PROJECT-FIRST LOGIC:
            project = Project.objects.get(id=project_id)
            # Department is derived from Project
            department = project.department

            # --- MODIFICATION START: Strict Department Check ---
            request = self.context.get('request')
            if request and hasattr(request.user, 'roles'):
                bms_role = get_user_bms_role(request.user)
                # If user is GENERAL_USER (Operator), ensure they match the project department
                if bms_role == 'GENERAL_USER':
                    user_dept_id = getattr(request.user, 'department_id', None)
                    if user_dept_id and user_dept_id != project.department_id:
                        raise serializers.ValidationError(
                            {'project_id': "You cannot submit expenses for other departments."}
                        )
            # --- MODIFICATION END ---

            sub_category = ExpenseCategory.objects.get(
                code=category_code, is_active=True)
        except Project.DoesNotExist:
            raise serializers.ValidationError(
                {'project_id': "Project not found."})
        except ExpenseCategory.DoesNotExist:
            raise serializers.ValidationError(
                {'category_code': 'Active expense sub-category not found.'})

        # --- INTELLIGENT ALLOCATION FINDING ---
        # Find active allocation specific to THIS Project + Category
        allocations = BudgetAllocation.objects.filter(
            project=project,          # Key Change: Filter by Project
            category=sub_category,
            is_active=True,
            is_locked=False
        )

        if not allocations.exists():
            raise serializers.ValidationError(
                f'No active budget found for Project "{project.name}" and Category "{sub_category.name}".'
            )

        # Calculate funds (Logic remains same, just scoped to project allocation now)
        allocation_to_charge = allocations.first()
        total_budget = allocation_to_charge.amount
        total_spent = Expense.objects.filter(
            budget_allocation=allocation_to_charge,
            status__in=['APPROVED', 'SUBMITTED']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        remaining_budget = total_budget - total_spent

        if expense_amount > remaining_budget:
            raise serializers.ValidationError(
                {'amount': f'Insufficient funds. Remaining budget for this item is ₱{remaining_budget:,.2f}'}
            )

        data['department_obj'] = department
        data['category_obj'] = sub_category
        data['allocation_obj'] = allocation_to_charge
        data['account_obj'] = allocation_to_charge.account
        data['project_obj'] = project

        return data

    def create(self, validated_data):
        # Extract objects
        department = validated_data.pop('department_obj')
        category = validated_data.pop('category_obj')
        allocation = validated_data.pop('allocation_obj')
        account = validated_data.pop('account_obj')
        project = validated_data.pop('project_obj')
        attachments_data = validated_data.pop('attachments', [])

        # Cleanup write-only fields
        validated_data.pop('project_id', None)
        validated_data.pop('category_code', None)

        request_user = self.context['request'].user

        with transaction.atomic():
            expense = Expense.objects.create(
                project=project,
                budget_allocation=allocation,
                account=account,
                department=department,
                category=category,
                submitted_by_user_id=request_user.id,
                submitted_by_username=getattr(request_user, 'username', 'N/A'),
                status='SUBMITTED',
                is_accomplished=False,
                **validated_data
            )

            if attachments_data:
                for file in attachments_data:
                    ExpenseAttachment.objects.create(
                        expense=expense, file=file)

        return expense


class BudgetAllocationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for the 'Add Budget' modal. Creates a new BudgetAllocation.
    """
    project_id = serializers.IntegerField(write_only=True)
    category_id = serializers.IntegerField(write_only=True)
    account_id = serializers.IntegerField(write_only=True)
    description = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = BudgetAllocation
        fields = [
            'project_id', 'category_id', 'account_id', 'amount', 'description'
        ]

    def validate_project_id(self, value):
        if not Project.objects.filter(id=value).exists():
            raise serializers.ValidationError("Project not found.")
        return value

    def validate_category_id(self, value):
        if not ExpenseCategory.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError(
                "Active expense category not found.")
        return value

    def validate_account_id(self, value):
        if not Account.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Active account not found.")
        return value

    def create(self, validated_data):
        project = Project.objects.get(id=validated_data['project_id'])
        user = self.context['request'].user

        # Create the new budget allocation
        allocation = BudgetAllocation.objects.create(
            project=project,
            category_id=validated_data['category_id'],
            account_id=validated_data['account_id'],
            amount=validated_data['amount'],
            fiscal_year=project.budget_proposal.fiscal_year,
            department=project.department,
            proposal=project.budget_proposal,
            created_by_name=getattr(user, 'username', 'N/A'),
            is_active=True,
            is_locked=True  # MODIFIED: Default to Locked until Finance Manager approves
        )
        return allocation


class ExpenseTrackingSummarySerializer(serializers.Serializer):
    """
    Serializer for the summary cards on the Expense Tracking page.
    """
    budget_remaining = serializers.DecimalField(
        max_digits=15, decimal_places=2)
    total_expenses_this_month = serializers.DecimalField(
        max_digits=15, decimal_places=2)


class ExpenseDetailSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(
        source='project.name', read_only=True, default=None)
    account_details = serializers.CharField(
        source='account.__str__', read_only=True)
    category_name = serializers.CharField(
        source='category.name', read_only=True)
    department_name = serializers.CharField(
        source='department.name', read_only=True)
    receipt_url = serializers.SerializerMethodField()
    # MODIFICATION START: Add a field for multiple attachments
    attachments = serializers.SerializerMethodField()
    is_accomplished = serializers.BooleanField(read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id',
            'transaction_id',
            'date',
            'amount',
            'description',
            'vendor',
            'status',
            'notes',
            'receipt_url',
            'project_name',
            'account_details',
            'category_name',
            'department_name',
            'submitted_by_username',
            'submitted_at',
            'approved_by_username',
            'approved_at',
            'is_accomplished',
            'attachments'
        ]

    def get_receipt_url(self, obj):
        if obj.receipt:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.receipt.url)
        return None

    # MODIFICATION START: Add method to get attachment URLs
    def get_attachments(self, obj):
        request = self.context.get('request')
        attachments = obj.attachments.all()
        if not attachments:
            return []

        if request:
            return [request.build_absolute_uri(att.file.url) for att in attachments]

        return [att.file.url for att in attachments]


# ← New name
class ExpenseCategoryDropdownSerializerV2(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = ['code', 'name', 'classification']
