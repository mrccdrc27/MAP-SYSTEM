from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from core.models import Expense, TransactionAudit, JournalEntry, JournalEntryLine, Account

@receiver(post_save, sender=Expense)
def expense_audit_log(sender, instance: Expense, created: bool, **kwargs):
    """Create audit entry when an Expense is created or updated."""
    action = 'CREATED' if created else 'UPDATED'
    
    # User Context Logic
    audit_user_id = instance.submitted_by_user_id
    audit_user_username = instance.submitted_by_username

    if instance.status == 'APPROVED' and instance.approved_by_user_id:
        audit_user_id = instance.approved_by_user_id
        audit_user_username = instance.approved_by_username
    
    # Handle External System (user_id=0)
    if audit_user_id == 0:
        audit_user_username = f"{audit_user_username} (System)"

    TransactionAudit.objects.create(
        transaction_type='EXPENSE',
        transaction_id_ref=instance.id,
        user_id=audit_user_id or 0,
        user_username=audit_user_username or 'Unknown',
        action=action,
        details={
            'amount': str(instance.amount),
            'description': instance.description,
            'status': instance.status,
            'vendor': instance.vendor,
        }
    )
    

@receiver(post_save, sender=Expense)
def create_journal_entry_for_expense(sender, instance: Expense, created: bool, **kwargs):
    """
    Automatically create a Journal Entry when an Expense is APPROVED.
    """
    # Only create JE if status is APPROVED and it hasn't been posted yet
    if instance.status == 'APPROVED' and not instance.posting_date:
        
        # Idempotency: Check if JE already exists for this transaction ID
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
                department=instance.department, 
                created_by_user_id=instance.submitted_by_user_id,
                created_by_username=instance.submitted_by_username
            )

            # 2. Create Debit Line (The Expense)
            # Use specific category if available, otherwise Null
            JournalEntryLine.objects.create(
                journal_entry=je,
                account=instance.account,
                expense_category=instance.category, 
                description=instance.description,
                transaction_type='DEBIT',
                journal_transaction_type='OPERATIONAL_EXPENDITURE',
                amount=instance.amount
            )

            # 3. Create Credit Line (Cash/Payable)
            # Logic: If amount > 50,000, assume Accounts Payable (2010). Else Cash (1010).
            credit_account_code = '2010' if instance.amount > 50000 else '1010'
            credit_account = Account.objects.filter(code=credit_account_code).first()
            
            # Fallback for credit account
            if not credit_account:
                credit_account = Account.objects.filter(account_type__name__in=['Liability', 'Asset']).first()
            
            if credit_account:
                JournalEntryLine.objects.create(
                    journal_entry=je,
                    account=credit_account,
                    expense_category=None, 
                    description=f"Payment for {instance.transaction_id}",
                    transaction_type='CREDIT',
                    journal_transaction_type='OPERATIONAL_EXPENDITURE',
                    amount=instance.amount
                )
            else:
                print(f"⚠️ Warning: Created JE {je.entry_id} for Expense {instance.transaction_id} but could not balance it (No Credit Account).")

            # Update expense to mark it as posted
            Expense.objects.filter(pk=instance.pk).update(posting_date=instance.date)