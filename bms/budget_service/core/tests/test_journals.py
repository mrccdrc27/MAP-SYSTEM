from django.test import TestCase
from rest_framework.exceptions import ValidationError
from ..serializers_budget import JournalEntryCreateSerializer

class JournalSerializerTestCase(TestCase):
    def test_unbalanced_journal_entry_fails_validation(self):
        """
        Ensures the JournalEntryCreateSerializer raises a ValidationError
        if debits do not equal credits.
        """
        unbalanced_data = {
            "date": "2025-08-01",
            "category": "EXPENSES",
            "description": "Test unbalanced entry",
            "lines": [
                {"account_id": 1, "transaction_type": "DEBIT", "amount": 100.00, "journal_transaction_type": "OPERATIONAL_EXPENDITURE"},
                {"account_id": 2, "transaction_type": "CREDIT", "amount": 99.99, "journal_transaction_type": "OPERATIONAL_EXPENDITURE"}
            ]
        }
        
        serializer = JournalEntryCreateSerializer(data=unbalanced_data)
        
        # Assert that calling is_valid() raises the specific error
        with self.assertRaises(ValidationError) as context:
            serializer.is_valid(raise_exception=True)
            
        self.assertIn("The journal entry is not balanced", str(context.exception))

    def test_balanced_journal_entry_passes_validation(self):
        """
        Ensures a balanced journal entry passes validation.
        """
        balanced_data = {
            "date": "2025-08-01",
            "category": "EXPENSES",
            "description": "Test balanced entry",
            "lines": [
                {"account_id": 1, "transaction_type": "DEBIT", "amount": 100.00, "journal_transaction_type": "OPERATIONAL_EXPENDITURE"},
                {"account_id": 2, "transaction_type": "CREDIT", "amount": 100.00, "journal_transaction_type": "OPERATIONAL_EXPENDITURE"}
            ]
        }
        
        serializer = JournalEntryCreateSerializer(data=balanced_data)
        

        self.assertTrue(serializer.is_valid(raise_exception=True))
        
        # TODO: Add test to check if ledger updates automatically.  Calls serializer.save and checks JournalEntry and its lines are created in the database