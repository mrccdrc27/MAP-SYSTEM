from decimal import Decimal
from core.models import Account, BudgetAllocation, Department, DepartmentBudgetCap, Expense, ExpenseAttachment, ExpenseCategory, FiscalYear, Project, SubCategoryBudgetCap
from rest_framework import serializers
from django.db.models import Sum
from django.utils import timezone
from django.db import transaction
from .views_utils import get_user_bms_role


class ExpenseMessageSerializer(serializers.ModelSerializer):
    """
    Serializer for incoming expense creation requests from other services (AMS, HDS).
    Updated to support file attachments (Receipts).
    """
    ticket_id = serializers.CharField(
        write_only=True, source='transaction_id', required=True)

    order_number = serializers.CharField(
        write_only=True,
        required=True,
        help_text="The Reference ID (e.g. from TTS) of the approved Budget Proposal."
    )
    account_code = serializers.CharField(write_only=True, required=True)
    category_code = serializers.CharField(write_only=True, required=True)
    submitted_by_name = serializers.CharField(write_only=True, required=True)

    # --- ADDED: Support for Attachments ---
    attachments = serializers.ListField(
        child=serializers.FileField(allow_empty_file=False),
        write_only=True,
        required=False,
        help_text="List of file attachments (Receipts, Invoices)"
    )

    class Meta:
        model = Expense
        fields = [
            'ticket_id', 'order_number', 'account_code', 'category_code', 'submitted_by_name',
            'amount', 'date', 'description', 'vendor', 'notes', 'attachments' # Added attachments
        ]

    def create(self, validated_data):
        order_number = validated_data.pop('order_number')
        attachments_data = validated_data.pop('attachments', []) # Extract attachments

        try:
            project = Project.objects.get(
                budget_proposal__external_system_id=order_number)
            account = Account.objects.get(code=validated_data['account_code'])
            category = ExpenseCategory.objects.get(
                code=validated_data['category_code'])
        except Project.DoesNotExist:
            raise serializers.ValidationError(
                {'order_number': f'No approved project found for Order Number "{order_number}".'})
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

        # Atomic transaction to ensure expense and files are saved together
        with transaction.atomic():
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
                status='SUBMITTED' # Enforce manual approval
            )

            # --- ADDED: Save Attachments ---
            if attachments_data:
                for file in attachments_data:
                    ExpenseAttachment.objects.create(
                        expense=expense, file=file)

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
    category_name = serializers.CharField(
        source='category.parent_category.name', read_only=True, allow_null=True)
    sub_category_name = serializers.CharField(
        source='category.name', read_only=True)
    accomplished = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            'id', 'reference_no', 'date', 'department_name', 'category_name',
            'sub_category_name', 'description', 'vendor', 'amount', 'status', 'accomplished'
        ]

    def get_accomplished(self, obj):
        return "Yes" if obj.is_accomplished else "No"

# MODIFICATION START: New serializer for the expense review action


class ExpenseReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['APPROVED', 'REJECTED'])
    notes = serializers.CharField(
        required=False, allow_blank=True, help_text="Reason for approval or rejection.")

    def validate_status(self, value):
        if value not in ['APPROVED', 'REJECTED']:
            raise serializers.ValidationError(
                "Status must be either 'APPROVED' or 'REJECTED'.")
        return value


class ExpenseDetailForModalSerializer(serializers.ModelSerializer):
    proposal_id = serializers.IntegerField(
        source='project.budget_proposal.id', read_only=True)
    vendor = serializers.CharField(read_only=True)
    date = serializers.DateField(read_only=True)
    amount = serializers.DecimalField(
        max_digits=15, decimal_places=2, read_only=True)
    description = serializers.CharField(read_only=True)
    department_name = serializers.CharField(
        source='department.name', read_only=True)
    category_name = serializers.CharField(
        source='category.name', read_only=True)
    sub_category_name = serializers.CharField(
        source='category.parent_category.name', read_only=True, allow_null=True)
    project_title = serializers.CharField(
        source='project.budget_proposal.title', read_only=True)
    performance_end_date = serializers.DateField(
        source='project.budget_proposal.performance_end_date', read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id', 'proposal_id', 'vendor', 'date', 'amount', 'description',
            'department_name', 'category_name', 'sub_category_name',
            'project_title', 'performance_end_date'
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

    # --- MODIFICATION START: New Cap Validation Logic and return JSON structured ERRORS ---
    def validate_caps(self, department, category, amount, notes):
        """
        Validates Department-Level and SubCategory-Level Budget Caps.
        Raises ValidationError with specific JSON structure for external integrations.
        """
        today = timezone.now().date()
        fiscal_year = FiscalYear.objects.filter(
            start_date__lte=today, end_date__gte=today, is_active=True
        ).first()

        if not fiscal_year:
            return # Cannot validate caps without FY context

        # 1. Calculate Organization Totals (Expensive query, simplistic for MVP)
        # In a real system, these totals would be cached or pre-calculated fields on FiscalYear
        total_org_allocations = BudgetAllocation.objects.filter(
            fiscal_year=fiscal_year, is_active=True
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # 2. Check Department Cap
        try:
            dept_cap = DepartmentBudgetCap.objects.get(
                department=department, fiscal_year=fiscal_year, is_active=True
            )
            
            dept_limit = total_org_allocations * (dept_cap.percentage_of_total / 100)
            
            current_dept_spent = Expense.objects.filter(
                department=department, 
                budget_allocation__fiscal_year=fiscal_year,
                status__in=['APPROVED', 'SUBMITTED']
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            projected_dept_total = current_dept_spent + amount
            remaining_dept = max(dept_limit - current_dept_spent, Decimal('0.00'))
            
            if projected_dept_total > dept_limit:
                # Structure matches "Department-Level Cap Errors" in IntegrationV2.1
                error_payload = {
                    "error": "DEPARTMENT_BUDGET_CAP_EXCEEDED",
                    "detail": f"{department.code} Department has exceeded its annual budget cap of {dept_cap.percentage_of_total}%",
                    "cap_info": {
                        "department": department.code,
                        "cap_percentage": float(dept_cap.percentage_of_total),
                        "cap_amount": float(dept_limit),
                        "current_spent": float(current_dept_spent),
                        "remaining": float(remaining_dept)
                    }
                }
                
                if dept_cap.cap_type == 'HARD':
                    raise serializers.ValidationError(error_payload)
                elif dept_cap.cap_type == 'SOFT':
                    if not notes or len(notes) < 10:
                        error_payload['error'] = "DEPARTMENT_SOFT_CAP_EXCEEDED"
                        error_payload['detail'] += " Justification is required."
                        raise serializers.ValidationError(error_payload)

        except DepartmentBudgetCap.DoesNotExist:
            pass 

        # 3. Check Sub-Category Cap
        try:
            cat_cap = SubCategoryBudgetCap.objects.get(
                expense_category=category, department=department, fiscal_year=fiscal_year, is_active=True
            )
            
            dept_total_alloc = BudgetAllocation.objects.filter(
                department=department, fiscal_year=fiscal_year, is_active=True
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            cat_limit = dept_total_alloc * (cat_cap.percentage_of_department / 100)
            
            current_cat_spent = Expense.objects.filter(
                department=department,
                category=category,
                budget_allocation__fiscal_year=fiscal_year,
                status__in=['APPROVED', 'SUBMITTED']
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            projected_cat_total = current_cat_spent + amount
            remaining_cat = max(cat_limit - current_cat_spent, Decimal('0.00'))
            
            if projected_cat_total > cat_limit:
                # Structure matches "Hard/Soft Cap Violation" in IntegrationV2.1
                error_code = "BUDGET_HARD_CAP_EXCEEDED" if cat_cap.cap_type == 'HARD' else "BUDGET_SOFT_CAP_EXCEEDED"
                
                error_payload = {
                    "error": error_code,
                    "detail": f"This expense exceeds the {cat_cap.cap_type.lower()} cap for {category.name}.",
                    "cap_info": {
                        "category": category.code,
                        "cap_type": cat_cap.cap_type,
                        "cap_amount": float(cat_limit),
                        "current_spent": float(current_cat_spent),
                        "remaining": float(remaining_cat),
                        "requested": float(amount)
                    }
                }

                if cat_cap.cap_type == 'HARD':
                    raise serializers.ValidationError(error_payload)
                elif cat_cap.cap_type == 'SOFT':
                    if not notes or len(notes) < 10:
                        error_payload['detail'] += " Justification is required."
                        raise serializers.ValidationError(error_payload)

        except SubCategoryBudgetCap.DoesNotExist:
            pass
    # --- MODIFICATION END ---

    def validate(self, data):
        project_id = data.get('project_id')
        category_code = data.get('category_code')
        expense_amount = data.get('amount')
        notes = data.get('notes', '')

        try:
            project = Project.objects.get(id=project_id)
            department = project.department

            # --- Strict Department Check ---
            request = self.context.get('request')
            if request and hasattr(request.user, 'roles'):
                bms_role = get_user_bms_role(request.user)
                if bms_role == 'GENERAL_USER':
                    user_dept_id = getattr(request.user, 'department_id', None)
                    if user_dept_id and user_dept_id != project.department_id:
                        raise serializers.ValidationError(
                            {'project_id': "You cannot submit expenses for other departments."}
                        )

            sub_category = ExpenseCategory.objects.get(
                code=category_code, is_active=True)
        except Project.DoesNotExist:
            raise serializers.ValidationError(
                {'project_id': "Project not found."})
        except ExpenseCategory.DoesNotExist:
            raise serializers.ValidationError(
                {'category_code': 'Active expense sub-category not found.'})

        # --- Trigger Cap Validation ---
        self.validate_caps(department, sub_category, expense_amount, notes)

        # --- INTELLIGENT ALLOCATION FINDING ---
        allocations = BudgetAllocation.objects.filter(
            project=project,
            category=sub_category,
            is_active=True,
            is_locked=False # Ensure we only use unlocked allocations
        )

        if not allocations.exists():
            raise serializers.ValidationError(
                f'No active, unlocked budget found for Project "{project.name}" and Category "{sub_category.name}". Finance Manager approval required.'
            )

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
        fields = ['id','code', 'name', 'classification']
