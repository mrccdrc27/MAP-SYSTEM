# from django.db.models.signals import post_save
# from django.dispatch import receiver
# from core.models import Expense, JournalEntry, JournalEntryLine
# from decimal import Decimal

# @receiver(post_save, sender=Expense)
# def create_journal_entry_for_expense(sender, instance, created, **kwargs):
#     if created and instance.status == 'SUBMITTED':
#         # Create draft journal entry
#         journal = JournalEntry.objects.create(
#             category='EXPENSES',
#             description=f"Expense: {instance.description}",
#             date=instance.date,
#             total_amount=instance.amount,
#             status='DRAFT',
#             created_by=instance.submitted_by
#         )

#         # Add debit and credit lines (example logic)
#         JournalEntryLine.objects.create(
#             journal_entry=journal,
#             account=instance.account,
#             description=instance.description,
#             transaction_type='DEBIT',
#             journal_transaction_type='OPERATIONAL_EXPENDITURE',
#             amount=instance.amount
#         )

#         # TODO: Use a proper credit account (e.g., Cash or Bank)
#         JournalEntryLine.objects.create(
#             journal_entry=journal,
#             account=instance.account,  # You may assign a default credit account
#             description="Auto-credit",
#             transaction_type='CREDIT',
#             journal_transaction_type='OPERATIONAL_EXPENDITURE',
#             amount=instance.amount
#         )
