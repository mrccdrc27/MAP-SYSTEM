from decimal import Decimal
from .models import (
    Account, AccountType, BudgetAllocation, BudgetProposal, BudgetProposalItem, Department, Expense, ExpenseCategory,
    FiscalYear, JournalEntry, JournalEntryLine, Project, ProposalComment, ProposalHistory, BudgetTransfer
)
from rest_framework import serializers
from django.db.models import Sum
from django.utils import timezone
from django.core.validators import MinValueValidator


class BudgetProposalSummarySerializer(serializers.Serializer):
    total_proposals = serializers.IntegerField()
    pending_approvals = serializers.IntegerField()
    total_budget = serializers.DecimalField(max_digits=15, decimal_places=2)


class BudgetProposalListSerializer(serializers.ModelSerializer):
    submitted_by = serializers.CharField(
        source='submitted_by_name', read_only=True)
    amount = serializers.SerializerMethodField()
    reference = serializers.CharField(
        source='external_system_id', read_only=True)
    subject = serializers.CharField(source='title', read_only=True)
    # MODIFIED: Added department fields for UI filtering
    department_code = serializers.CharField(
        source='department.code', read_only=True)
    department_name = serializers.CharField(
        source='department.name', read_only=True)

    # MODIFIED: Split into Category and Sub-category
    category = serializers.SerializerMethodField()
    sub_category = serializers.SerializerMethodField()

    class Meta:
        model = BudgetProposal
        fields = [
            'id', 'reference', 'subject', 'category', 'sub_category', 'submitted_by',
            'amount', 'status', 'department_code', 'department_name'
        ]

    def get_amount(self, obj):
        return obj.items.aggregate(total=Sum('estimated_cost'))['total'] or 0

     # MODIFIED: Updated to fetch category name from the new relationship
    def get_category(self, obj):
        # Returns the Main Classification (CapEx/OpEx)
        first_item = obj.items.first()
        if first_item and first_item.category:
            return first_item.category.classification  # e.g., 'OPEX'
        return "Uncategorized"

    def get_sub_category(self, obj):
        # Returns the Specific Sub-category Name
        first_item = obj.items.first()
        if first_item and first_item.category:
            return first_item.category.name  # e.g., 'Server Hosting'
        return "General"


class BudgetProposalItemSerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source='account.code', read_only=True)

    class Meta:
        model = BudgetProposalItem
        fields = ['cost_element', 'description',
                  'estimated_cost', 'account_code']


# For creating a comment
class ProposalCommentCreateSerializer(serializers.Serializer):
    comment = serializers.CharField(max_length=1000)


class ProposalCommentSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(read_only=True)

    class Meta:
        model = ProposalComment
        fields = ['id', 'user_id', 'user_username', 'comment', 'created_at']


class BudgetProposalDetailSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(
        source='department.name', read_only=True)
    items = BudgetProposalItemSerializer(many=True, read_only=True)
    total_cost = serializers.SerializerMethodField()
    comments = ProposalCommentSerializer(many=True, read_only=True)
    last_reviewed_at = serializers.SerializerMethodField()
    latest_review_comment = serializers.SerializerMethodField()
    # MODIFIED: category field remains, sub_category added
    category = serializers.SerializerMethodField()
    sub_category = serializers.SerializerMethodField()

    class Meta:
        model = BudgetProposal
        fields = [
            'id', 'external_system_id', 'title', 'project_summary', 'project_description',
            'performance_notes', 'submitted_by_name', 'status', 'department_name',
            # Added sub_category
            'fiscal_year', 'category', 'sub_category', 'performance_start_date', 'performance_end_date',
            'items', 'total_cost', 'document', 'comments', 'last_reviewed_at',
            'approved_by_name', 'approval_date', 'rejected_by_name', 'rejection_date',
            'latest_review_comment', 'submitted_at',
            'finance_manager_name', 'signature'
        ]

    def get_total_cost(self, obj): return obj.items.aggregate(
        total=Sum('estimated_cost'))['total'] or 0

    def get_category(self, obj):
        # MODIFIED: Return Classification (CapEx/OpEx) instead of Name
        first_item = obj.items.first()
        if first_item and first_item.category:
            return first_item.category.classification
        return "General"

    def get_sub_category(self, obj):
        # MODIFIED: Return specific Category Name (e.g. Server Hosting)
        first_item = obj.items.first()
        if first_item and first_item.category:
            return first_item.category.name
        return "N/A"

    def get_last_reviewed_at(self, obj):
        if obj.status == 'APPROVED':
            return obj.approval_date
        elif obj.status == 'REJECTED':
            return obj.rejection_date
        return None

    def get_latest_review_comment(self, obj):
        review_history = obj.history.filter(
            action__in=['APPROVED', 'REJECTED']).order_by('-action_at').first()
        if not review_history:
            return None
        comment = obj.comments.filter(user_username=review_history.action_by_name,
                                      created_at__gte=review_history.action_at).order_by('created_at').first()
        return ProposalCommentSerializer(comment, context=self.context).data if comment else None


class ProposalHistorySerializer(serializers.ModelSerializer):
    # MODIFICATION START: Added proposal_pk for frontend navigation/details
    proposal_pk = serializers.IntegerField(
        source='proposal.id', read_only=True)
    # MODIFICATION END
    proposal_id = serializers.CharField(
        source='proposal.external_system_id', read_only=True)
    proposal = serializers.CharField(
        source='proposal.title', read_only=True)
    last_modified_by = serializers.CharField(
        source='action_by_name', read_only=True)
    last_modified = serializers.DateTimeField(
        source='action_at', read_only=True)
    status = serializers.CharField(source='new_status', read_only=True)
    category = serializers.SerializerMethodField()
    subcategory = serializers.SerializerMethodField()
    department = serializers.CharField(
        source='proposal.department.name', read_only=True)

    class Meta:
        model = ProposalHistory
        fields = ['id', 'proposal_pk', 'proposal_id', 'proposal', 'category', 'subcategory', 'department',
                  'last_modified', 'last_modified_by', 'status']

    def get_category(self, obj):
        """Get the Main Classification (CapEx/OpEx)"""
        try:
            first_item = obj.proposal.items.first()
            if first_item and first_item.category:
                return first_item.category.classification
            # Fallback to old AccountType logic if category is missing (migration safety)
            if first_item and first_item.account and first_item.account.account_type:
                return first_item.account.account_type.name
            return "N/A"
        except Exception:
            return "N/A"

    def get_subcategory(self, obj):
        """Get the Specific Category Name (e.g., Server Hosting)"""
        try:
            first_item = obj.proposal.items.first()
            if first_item and first_item.category:
                return first_item.category.name
            # Fallback
            if first_item and first_item.cost_element:
                return first_item.cost_element
            return "N/A"
        except Exception:
            return "N/A"


class AccountSetupSerializer(serializers.ModelSerializer):
    account_type = serializers.CharField(source='account_type.name')
    accomplished = serializers.SerializerMethodField()
    accomplishment_date = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = [
            'code',
            'name',
            'account_type',
            'is_active',
            'accomplished',
            'accomplishment_date'
        ]

    def get_fiscal_year(self):
        return self.context.get('fiscal_year')

    def get_accomplished(self, obj):
        fiscal_year = self.get_fiscal_year()
        if not fiscal_year:
            return False
        return obj.allocations.filter(
            is_active=True,
            fiscal_year=fiscal_year
        ).exists()

    def get_accomplishment_date(self, obj):
        fiscal_year = self.get_fiscal_year()
        if not fiscal_year:
            return None
        alloc = obj.allocations.filter(
            is_active=True,
            fiscal_year=fiscal_year
        ).order_by('created_at').first()
        return alloc.created_at if alloc else None


class LedgerViewSerializer(serializers.ModelSerializer):
    reference_id = serializers.CharField(
        source='journal_entry.entry_id', read_only=True)
    date = serializers.DateField(source='journal_entry.date', read_only=True)

    category = serializers.SerializerMethodField()
    sub_category = serializers.SerializerMethodField()

    account = serializers.CharField(source='account.name', read_only=True)
    department = serializers.CharField(
        source='journal_entry.department.name', read_only=True, default="N/A"
    )
    description = serializers.CharField(read_only=True)

    class Meta:
        model = JournalEntryLine
        fields = ['reference_id', 'date', 'department', 'category', 'sub_category',
                  'description', 'account', 'amount']

    def get_category(self, obj):
        """
        Returns the main classification: CapEx or OpEx
        """
        # 1. Check this line's expense_category
        if obj.expense_category:
            return obj.expense_category.classification  # 'CAPEX' or 'OPEX'

        # 2. Check sibling lines (e.g., if this is the Credit side, find the Debit side)
        sibling_lines = obj.journal_entry.lines.all()
        for line in sibling_lines:
            if line.expense_category:
                return line.expense_category.classification

        # 3. Fallback: Use Journal Entry category as a hint
        je_cat = obj.journal_entry.category
        if je_cat == 'EXPENSES':
            return 'OPEX'  # Expenses are typically OpEx
        if je_cat == 'ASSETS':
            return 'CAPEX'  # Assets are typically CapEx

        # 4. Default for unknown
        return 'N/A'

    def get_sub_category(self, obj):
        """
        Returns the specific category name (e.g., 'Hardware', 'Travel', 'Utilities')
        """
        # 1. Check this line's expense_category
        if obj.expense_category:
            return obj.expense_category.name

        # 2. Check sibling lines
        sibling_lines = obj.journal_entry.lines.all()
        for line in sibling_lines:
            if line.expense_category:
                return line.expense_category.name

        # 3. Default
        return "General"

# MODIFICATION START: Updated to split Debit/Credit accounts for the Table


class JournalEntryListSerializer(serializers.ModelSerializer):
    """
    Serializer for Journal Entry Page listing view. NOW USED FOR BUDGET ADJUSTMENT PAGE.
    """
    category = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(read_only=True)
    ticket_id = serializers.CharField(source='entry_id', read_only=True)
    amount = serializers.DecimalField(
        source='total_amount', max_digits=15, decimal_places=2, read_only=True)

    debit_account = serializers.SerializerMethodField()
    credit_account = serializers.SerializerMethodField()

    department_name = serializers.CharField(
        source='department.name', read_only=True, default="N/A")

    class Meta:
        model = JournalEntry
        fields = ['id', 'ticket_id', 'date', 'category', 'department_name',
                  'debit_account', 'credit_account', 'description',
                  'amount', 'created_by_username']

    def get_debit_account(self, obj):
        """
        Find the account name associated with the DEBIT line.
        If an expense category is linked, append it for clarity.
        """
        debit_line = obj.lines.filter(transaction_type='DEBIT').first()
        if debit_line:
            account_name = debit_line.account.name
            # If there's a specific sub-category (expense_category), show that instead of generic GL account
            if debit_line.expense_category:
                return debit_line.expense_category.name
            return account_name
        return "N/A"

    def get_credit_account(self, obj):
        """
        Find the account name associated with the CREDIT line.
        """
        credit_line = obj.lines.filter(transaction_type='CREDIT').first()
        if credit_line:
            account_name = credit_line.account.name
            if credit_line.expense_category:
                return credit_line.expense_category.name
            return account_name
        return "N/A"

    def get_category(self, obj):
        # 1. Try to get classification from lines (CapEx/OpEx)
        line = obj.lines.filter(expense_category__isnull=False).first()
        if line and line.expense_category:
            classification = line.expense_category.classification
            if classification == 'CAPEX':
                return 'CapEx'
            if classification == 'OPEX':
                return 'OpEx'

        # 2. Fallback to the JE category field, formatted nicely
        if obj.category:
            return obj.category.replace('_', ' ').title()

        return "General"


class JournalEntryLineInputSerializer(serializers.Serializer):
    account_id = serializers.IntegerField(
        help_text="ID of the account for this journal line."
    )
    transaction_type = serializers.ChoiceField(
        choices=['DEBIT', 'CREDIT'],
        help_text="Specify 'DEBIT' or 'CREDIT' for this line."
    )
    journal_transaction_type = serializers.ChoiceField(
        choices=['CAPITAL_EXPENDITURE', 'OPERATIONAL_EXPENDITURE', 'TRANSFER'],
        help_text="Type of transaction: Capital, Operational, or Transfer."
    )
    amount = serializers.DecimalField(
        max_digits=15, decimal_places=2,
        help_text="Amount for this journal line (PHP)."
    )


class JournalEntryCreateSerializer(serializers.Serializer):
    date = serializers.DateField(
        help_text="Date of the journal entry (YYYY-MM-DD)."
    )
    category = serializers.ChoiceField(
        choices=[c[0]
                 for c in JournalEntry._meta.get_field('category').choices],
        help_text="Category of the journal entry (e.g., EXPENSES, ASSETS)."
    )
    description = serializers.CharField(
        help_text="Description of the journal entry."
    )
    lines = JournalEntryLineInputSerializer(
        many=True,
        help_text="List of journal entry lines. Must include at least one DEBIT and one CREDIT."
    )

    def validate_lines(self, value):
        if len(value) < 2:
            raise serializers.ValidationError(
                "At least 2 journal lines are required (e.g., 1 debit and 1 credit)."
            )
        return value

    def validate(self, data):
        """
        Check that total debits equal total credits.
        """
        lines = data.get('lines', [])
        total_debits = sum(line['amount']
                           for line in lines if line['transaction_type'] == 'DEBIT')
        total_credits = sum(
            line['amount'] for line in lines if line['transaction_type'] == 'CREDIT')

        if total_debits != total_credits:
            raise serializers.ValidationError(
                f"The journal entry is not balanced. Debits ({total_debits}) do not equal Credits ({total_credits})."
            )

        return data

    def create(self, validated_data):
        request_user = self.context['request'].user

        lines_data = validated_data.pop('lines')
        total_amount = sum(line['amount'] if line['transaction_type']
                           == 'DEBIT' else -line['amount'] for line in lines_data)

        entry = JournalEntry.objects.create(
            created_by_user_id=request_user.id,
            created_by_username=getattr(request_user, 'username', 'N/A'),
            total_amount=abs(total_amount),
            **validated_data
        )
        for line_data in lines_data:
            account = Account.objects.get(id=line_data['account_id'])
            JournalEntryLine.objects.create(
                journal_entry=entry, account=account,
                transaction_type=line_data['transaction_type'],
                journal_transaction_type=line_data['journal_transaction_type'],
                amount=line_data['amount'],
                description=validated_data['description']
            )
        return entry


class AccountDropdownSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ['id', 'code', 'name', 'account_type']


class DepartmentDropdownSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'code']


class AccountTypeDropdownSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountType
        fields = ['id', 'name', 'description']


class BudgetProposalItemCreateSerializer(serializers.ModelSerializer):
    account = serializers.PrimaryKeyRelatedField(
        queryset=Account.objects.filter(is_active=True))

    class Meta:
        model = BudgetProposalItem
        fields = ['id', 'cost_element', 'description',
                  'estimated_cost', 'account', 'notes']
        read_only_fields = ['id']


class BudgetProposalMessageSerializer(serializers.ModelSerializer):
    department_input = serializers.CharField(
        write_only=True,
        required=True,
        source='department',
        help_text="Department ID (integer) or Department Code (string, e.g., 'FIN'). Required."
    )
    department_details = DepartmentDropdownSerializer(
        source='department', read_only=True)

    fiscal_year = serializers.PrimaryKeyRelatedField(
        queryset=FiscalYear.objects.filter(is_active=True, is_locked=False),
        required=True
    )
    items = BudgetProposalItemCreateSerializer(many=True, allow_empty=False)

    ticket_id = serializers.CharField(
        max_length=100,
        write_only=True,
        required=True,
        help_text="The unique ticket ID from the originating external system."
    )
    external_system_id = serializers.CharField(read_only=True)

    is_draft = serializers.BooleanField(
        write_only=True, required=False, default=False)

    class Meta:
        model = BudgetProposal
        fields = [
            'id', 'title', 'project_summary', 'project_description', 'performance_notes',
            'department_details',
            'department_input',
            'fiscal_year', 'submitted_by_name', 'status',
            'performance_start_date', 'performance_end_date',
            'external_system_id',
            'ticket_id',
            'document', 'items',
            'submitted_at', 'last_modified', 'sync_status', 'last_sync_timestamp',
            'approved_by_name', 'approval_date', 'rejected_by_name', 'rejection_date',
            'is_draft'
        ]
        read_only_fields = [
            'id', 'department_details', 'external_system_id',
            'submitted_at', 'last_modified', 'sync_status',
            'last_sync_timestamp', 'approved_by_name', 'approval_date',
            'rejected_by_name', 'rejection_date'
        ]

    def validate_department_input(self, value):
        try:
            if isinstance(value, int) or (isinstance(value, str) and value.isdigit()):
                department_obj = Department.objects.get(
                    pk=int(value), is_active=True)
            elif isinstance(value, str):
                department_obj = Department.objects.get(
                    code__iexact=value, is_active=True)
            else:
                raise serializers.ValidationError(
                    "Department input must be an integer ID or a string code.")
        except Department.DoesNotExist:
            raise serializers.ValidationError(
                f"Active department with identifier '{value}' not found.")
        except ValueError:
            raise serializers.ValidationError(
                "Invalid department ID format if sending an integer ID.")
        return department_obj

    # MODIFIED: Added Budget Validation Logic (Hard Cap)
    def validate(self, data):
        # 1. Calculate Total Cost of this new proposal
        items = data.get('items', [])
        total_proposed_cost = sum(item['estimated_cost'] for item in items)

        # 2. Get Department and Fiscal Year
        # Note: department is already resolved by validate_department_input and put into 'department' key
        department = data.get('department')
        fiscal_year = data.get('fiscal_year')

        # 3. Calculate Currently Available Funds
        # (Sum of Allocations) - (Sum of Approved Expenses)
        # Note: This checks the Department's TOTAL budget availability.

        total_allocation = BudgetAllocation.objects.filter(
            department=department,
            fiscal_year=fiscal_year,
            is_active=True
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # Calculate total spent (Expenses)
        total_spent = Expense.objects.filter(
            department=department,
            budget_allocation__fiscal_year=fiscal_year,
            status='APPROVED'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        available_funds = total_allocation - total_spent

        # 4. The Check
        if available_funds < total_proposed_cost:
            # We raise a validation error to reject the proposal if funds are insufficient.
            # This fulfills the "Real-time budget availability check" requirement.
            raise serializers.ValidationError(
                f"Insufficient funds. Department has {available_funds:,.2f} remaining, proposal cost is {total_proposed_cost:,.2f}."
            )

        return data

    def create(self, validated_data):
        is_draft = validated_data.pop('is_draft', False)
        department_obj = validated_data.pop('department')
        items_data = validated_data.pop('items')
        ticket_id_value = validated_data.pop('ticket_id')
        validated_data['external_system_id'] = ticket_id_value

        validated_data['department'] = department_obj
        validated_data['status'] = 'DRAFT' if is_draft else 'SUBMITTED'
        validated_data.setdefault('submitted_at', timezone.now())
        validated_data['sync_status'] = 'SYNCED'
        validated_data['last_sync_timestamp'] = timezone.now()

        validated_data.pop('approved_by_name', None)
        validated_data.pop('approval_date', None)
        validated_data.pop('rejected_by_name', None)
        validated_data.pop('rejection_date', None)

        proposal = BudgetProposal.objects.create(**validated_data)
        for item_data in items_data:
            BudgetProposalItem.objects.create(proposal=proposal, **item_data)

        ProposalHistory.objects.create(
            proposal=proposal,
            action='SUBMITTED',
            action_by_name=proposal.submitted_by_name or "System (External Message)",
            new_status=proposal.status,
            comments=f"Proposal received from external system (ID={proposal.external_system_id}) for department {department_obj.name}."
        )
        return proposal

    def update(self, instance, validated_data):
        department_obj = validated_data.pop('department', None)
        if department_obj:
            instance.department = department_obj

        items_data = validated_data.pop('items', None)

        ticket_id_value = validated_data.pop('ticket_id', None)
        if ticket_id_value:
            instance.external_system_id = ticket_id_value

        for attr, val in validated_data.items():
            setattr(instance, attr, val)

        instance.last_modified = timezone.now()
        instance.sync_status = 'SYNCED'
        instance.last_sync_timestamp = timezone.now()
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_dict in items_data:
                BudgetProposalItem.objects.create(
                    proposal=instance, **item_dict)
            ProposalHistory.objects.create(
                proposal=instance, action='UPDATED',
                action_by_name=instance.submitted_by_name or "System (External Message)",
                new_status=instance.status,
                comments=f"Proposal items updated via external system (ID={instance.external_system_id})."
            )
        return instance


# For the review action in BudgetProposalViewSet
class ProposalReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['APPROVED', 'REJECTED'])
    comment = serializers.CharField(
        required=False, allow_blank=True, max_length=1000)

    finance_manager_name = serializers.CharField(
        required=False, allow_blank=True)
    signature = serializers.FileField(required=False, allow_null=True)

    def validate_status(self, value):
        if value not in ['APPROVED', 'REJECTED']:
            raise serializers.ValidationError("Invalid status for review.")
        return value

    def validate(self, data):
        if data.get('status') == 'APPROVED' and not data.get('signature'):
            raise serializers.ValidationError(
                {'signature': "Signature attachment is required for approval."}
            )
        return data


class ProposalReviewBudgetOverviewSerializer(serializers.Serializer):
    """
    Serializer for the budget overview section in the proposal review modal.
    """
    total_department_budget = serializers.DecimalField(
        max_digits=15, decimal_places=2)
    currently_allocated = serializers.DecimalField(
        max_digits=15, decimal_places=2)
    available_budget = serializers.DecimalField(
        max_digits=15, decimal_places=2)
    budget_after_proposal = serializers.DecimalField(
        max_digits=15, decimal_places=2)


# MODIFICATION START: Update BudgetAdjustmentSerializer to handle UI inputs (names)
class BudgetAdjustmentSerializer(serializers.Serializer):
    date = serializers.DateField()
    description = serializers.CharField(
        max_length=255, required=False, allow_blank=True)
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, validators=[
                                      MinValueValidator(Decimal('0.01'))])

    # UI inputs (Strings)
    department_name = serializers.CharField()
    # category_name = serializers.CharField() # Not strictly used for allocation lookup logic if using accounts, but kept if UI sends it

    transfer_type = serializers.ChoiceField(
        choices=['TRANSFER', 'SUPPLEMENTAL'],
        default='TRANSFER'
    )

    # Where money comes FROM (Optional for Supplemental)
    source_account_name = serializers.CharField(
        required=False, allow_blank=True)
    destination_account_name = serializers.CharField()  # Where money goes TO

    def validate(self, data):
        try:
            transfer_type = data.get('transfer_type', 'TRANSFER')

            # 1. Resolve Department
            try:
                department = Department.objects.get(
                    name__iexact=data['department_name'])
            except Department.DoesNotExist:
                department = Department.objects.get(
                    code__iexact=data['department_name'])

            # 2. Find Destination Account object (Always required)
            destination_account = Account.objects.filter(
                name__iexact=data['destination_account_name']).first()

            if not destination_account:
                raise serializers.ValidationError(
                    {'destination_account_name': "Invalid destination account selected."})

            dest_alloc = BudgetAllocation.objects.filter(
                department=department,
                account=destination_account,
                is_active=True
            ).first()

            # Initialize source variables
            source_account = None
            source_alloc = None

            # 3. Handle TRANSFER Logic
            if transfer_type == 'TRANSFER':
                source_account_name = data.get('source_account_name')
                if not source_account_name:
                    raise serializers.ValidationError(
                        {'source_account_name': "Source account is required for Transfers."})

                source_account = Account.objects.filter(
                    name__iexact=source_account_name).first()
                if not source_account:
                    raise serializers.ValidationError(
                        {'source_account_name': "Invalid source account selected."})

                source_alloc = BudgetAllocation.objects.filter(
                    department=department,
                    account=source_account,
                    is_active=True
                ).first()

                # Validate source funds
                if source_alloc:
                    total_expenses = Expense.objects.filter(
                        budget_allocation=source_alloc,
                        status='APPROVED'
                    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

                    available_funds = source_alloc.amount - total_expenses

                    if data['amount'] > available_funds:
                        raise serializers.ValidationError(
                            f"Insufficient funds in source account. Available: {available_funds:,.2f}, Requested: {data['amount']:,.2f}"
                        )
                else:
                    # If no allocation exists for source, they have 0 funds
                    raise serializers.ValidationError(
                        f"No active allocation found for source account {source_account.name}.")

            # Store resolved objects
            data['department'] = department
            data['source_account_obj'] = source_account
            data['destination_account_obj'] = destination_account
            data['source_alloc'] = source_alloc
            data['dest_alloc'] = dest_alloc

        except Department.DoesNotExist:
            raise serializers.ValidationError("Invalid Department")

        return data

# MODIFICATION START: Serializer for Operators to REQUEST supplemental budget


# MODIFICATION START: Serializer for Operators to REQUEST supplemental budget
class SupplementalBudgetRequestSerializer(serializers.Serializer):
    department_input = serializers.CharField(
        help_text="Department Code (e.g., 'IT') or ID"
    )
    project_id = serializers.IntegerField(
        help_text="ID of the Project this budget is for",
        required=True
    )
    category_id = serializers.IntegerField(
        help_text="ID of the Expense Category to increase"
    )
    amount = serializers.DecimalField(
        max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))]
    )
    reason = serializers.CharField(
        max_length=1000, 
        help_text="Justification for the additional budget"
    )
    fiscal_year_id = serializers.IntegerField(required=False)

    def validate(self, data):
        # 1. Resolve Department
        dept_input = data.get('department_input')
        dept = None
        
        if str(dept_input).isdigit():
            dept = Department.objects.filter(id=int(dept_input)).first()
        else:
            # Try Code first, then Name
            dept = Department.objects.filter(code__iexact=dept_input).first()
            if not dept:
                 dept = Department.objects.filter(name__iexact=dept_input).first()
        
        if not dept:
            raise serializers.ValidationError({"department_input": f"Invalid Department: '{dept_input}' not found."})
        
        # 2. Resolve Project
        project_id = data.get('project_id')
        project = Project.objects.filter(id=project_id, department=dept).first()
        if not project:
            raise serializers.ValidationError({"project_id": "Project not found or does not belong to this department."})

        # 3. Resolve Fiscal Year (Default to active)
        fy_id = data.get('fiscal_year_id')
        if fy_id:
            fy = FiscalYear.objects.filter(id=fy_id).first()
        else:
            today = timezone.now().date()
            fy = FiscalYear.objects.filter(start_date__lte=today, end_date__gte=today, is_active=True).first()
        
        if not fy:
            raise serializers.ValidationError({"fiscal_year_id": "No active fiscal year found."})

        # 4. Resolve Category
        cat_id = data.get('category_id')
        category = ExpenseCategory.objects.filter(id=cat_id).first()
        if not category:
             raise serializers.ValidationError({"category_id": "Invalid Category."})

        # 5. Find OR Prepare Creation of Allocation
        allocation = BudgetAllocation.objects.filter(
            project=project,
            category=category,
            is_active=True
        ).first()

        # We don't error if allocation is missing. We pass components to View to create it.

        data['department_obj'] = dept
        data['project_obj'] = project
        data['fiscal_year_obj'] = fy
        data['category_obj'] = category
        data['allocation_obj'] = allocation # Can be None
        
        return data
# MODIFICATION END

# MODIFICATION START: Serializer for Listing/Approving Transfers


class BudgetTransferSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='destination_allocation.department.name', read_only=True)
    category_name = serializers.CharField(source='destination_allocation.category.name', read_only=True)
    
    # OLD: request_id = serializers.CharField(source='id', read_only=True)
    # NEW: Formatted ID
    request_id = serializers.SerializerMethodField()
    
    date_submitted = serializers.DateTimeField(source='transferred_at', format="%Y-%m-%d %H:%M", read_only=True)
    requester_name = serializers.CharField(source='transferred_by_username', read_only=True)
    
    approval_date = serializers.DateTimeField(format="%Y-%m-%d %H:%M", read_only=True)
    rejection_date = serializers.DateTimeField(format="%Y-%m-%d %H:%M", read_only=True)
    approver_name = serializers.CharField(source='approved_by_username', read_only=True)
    rejector_name = serializers.CharField(source='rejected_by_username', read_only=True)

    class Meta:
        model = BudgetTransfer  
        fields = [
            'id', 'request_id', 'department_name', 'category_name', 
            'amount', 'reason', 'status', 'date_submitted', 'requester_name', 'transfer_type',
            'approval_date', 'rejection_date', 'approver_name', 'rejector_name'
        ]

    def get_request_id(self, obj):
        # Format: TYPE-YEAR-ID (e.g., SUP-2026-001)
        prefix = "SUP" if obj.transfer_type == 'SUPPLEMENTAL' else "TRF"
        year = obj.transferred_at.year if obj.transferred_at else timezone.now().year
        return f"{prefix}-{year}-{obj.id:03d}"

    def to_representation(self, instance):
        # Clean up Status presentation
        data = super().to_representation(instance)
        if data.get('status'):
            data['status'] = data['status'].title() # "PENDING" -> "Pending"
        return data


class ExpenseCategoryVarianceSerializer(serializers.Serializer):
    category = serializers.CharField()
    code = serializers.CharField()
    level = serializers.IntegerField()
    # MODIFIED: Added classification to the report serializer
    classification = serializers.CharField()
    budget = serializers.DecimalField(max_digits=15, decimal_places=2)
    actual = serializers.DecimalField(max_digits=15, decimal_places=2)
    available = serializers.DecimalField(max_digits=15, decimal_places=2)
    children = serializers.ListField(child=serializers.DictField())
