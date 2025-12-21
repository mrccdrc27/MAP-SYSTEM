from django.db.models.signals import post_save
from django.dispatch import receiver
from core.models import Expense, TransactionAudit, JournalEntry, JournalEntryLine, Account


@receiver(post_save, sender=Expense)
def expense_audit_log(sender, instance: Expense, created: bool, **kwargs): # Added type hints for clarity
    """Create audit entry when an Expense is created or updated."""
    
    action = 'CREATED' if created else 'UPDATED'
    
    # Determine the relevant user for this audit event based on the Expense instance
    audit_user_id = None
    audit_user_username = None

    # Logic to determine which user context is most relevant for the audit:
    # - If the expense was just approved, the approver is key.
    # If it was just created/submitted, the submitter is key.
    # For other updates, it might be the submitter or a system action.

    if instance.status == 'APPROVED' and instance.approved_by_user_id:
        # If the action leading to this save was an approval, use the approver's details.
        # This assumes that when an expense is approved, approved_by_user_id/username are set.
        audit_user_id = instance.approved_by_user_id
        audit_user_username = instance.approved_by_username
    elif instance.submitted_by_user_id:
        # For creation or general updates where an approver isn't yet involved or isn't the primary actor.
        audit_user_id = instance.submitted_by_user_id
        audit_user_username = instance.submitted_by_username
    else:
        # Fallback: If no user context can be clearly determined from the Expense instance.
        # This might happen if an expense is updated by a system process without a user context.
        # Log this with a special system user ID or skip the audit.
        print(f"Warning: Could not determine user context for auditing Expense ID {instance.id}. Action: {action}.")
        # To avoid creating an audit entry without a user, return here:
        # return
        # Or, assign a system/placeholder if that's the rule:
        # audit_user_id = 0 # Example placeholder for system
        # audit_user_username = "System"
        if not (audit_user_id or audit_user_username): # If still no user, skip
             print(f"Skipping audit for Expense ID {instance.id} due to missing user context for action: {action}.")
             return


    # Create transaction audit record
    TransactionAudit.objects.create(
        transaction_type='EXPENSE',
        transaction_id_ref=instance.id,  # Correct: Uses the PK of the Expense instance
        user_id=audit_user_id,
        user_username=audit_user_username,
        action=action,
        details={
            'amount': str(instance.amount),
            'description': instance.description,
            'status': instance.status,
            'department_id': instance.department_id, # Assumes department is a local FK
            'budget_allocation_id': instance.budget_allocation_id, # Assumes budget_allocation is local FK
            'project_id': instance.project_id if instance.project else None,
            'vendor': instance.vendor,
        }
    )
    # print(f"Audit log created for Expense ID {instance.id}, Action: {action}, User: {audit_user_username or audit_user_id}")
    
    
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from core.models import Expense, TransactionAudit, JournalEntry, JournalEntryLine, Account

@receiver(post_save, sender=Expense)
def create_journal_entry_for_expense(sender, instance: Expense, created: bool, **kwargs):
    """
    Automatically create a Journal Entry when an Expense is APPROVED.
    This ensures the Ledger View is populated.
    """
    # Only create JE if status is APPROVED and it hasn't been posted yet
    if instance.status == 'APPROVED' and not instance.posting_date:
        
        # Prevent duplicate JEs for the same expense (idempotency check)
        if JournalEntry.objects.filter(description__contains=instance.transaction_id).exists():
            return

        with transaction.atomic():
            # 1. Create the Parent Journal Entry
            je = JournalEntry.objects.create(
                date=instance.date,
                category='EXPENSES', 
                description=f"Expense Recorded: {instance.description} (Ref: {instance.transaction_id})",
                total_amount=instance.amount,
                status='POSTED',
                department=instance.department, # Populate the new Department field
                created_by_user_id=instance.submitted_by_user_id,
                created_by_username=instance.submitted_by_username
            )

            # 2. Create Debit Line (The Expense)
            JournalEntryLine.objects.create(
                journal_entry=je,
                account=instance.account,
                expense_category=instance.category, # Populate the new Category field
                description=instance.description,
                transaction_type='DEBIT',
                journal_transaction_type='OPERATIONAL_EXPENDITURE',
                amount=instance.amount
            )

            # 3. Create Credit Line (Cash/Payable)
            # Logic: If amount > 50,000, assume Accounts Payable (2010). Else Cash (1010).
            credit_account_code = '2010' if instance.amount > 50000 else '1010'
            credit_account = Account.objects.filter(code=credit_account_code).first()
            
            if not credit_account:
                # Fallback: Find ANY Asset or Liability account to balance the ledger
                credit_account = Account.objects.filter(account_type__name__in=['Asset', 'Liability']).first()
            
            if not credit_account:
                 # Last resort: Do not create the JE to avoid error, log warning
                 print("Error: Could not find credit account for Expense Journal Entry.")
                 return 

            JournalEntryLine.objects.create(
                journal_entry=je,
                account=credit_account,
                expense_category=None, # Credit side usually doesn't have the expense category
                description=f"Payment for {instance.transaction_id}",
                transaction_type='CREDIT',
                journal_transaction_type='OPERATIONAL_EXPENDITURE',
                amount=instance.amount
            )

            # Update expense to mark it as posted
            Expense.objects.filter(pk=instance.pk).update(posting_date=instance.date)
            # print(f"Journal Entry created for Expense {instance.transaction_id}")