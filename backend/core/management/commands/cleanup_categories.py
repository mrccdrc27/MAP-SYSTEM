from django.core.management.base import BaseCommand
from core.models import ExpenseCategory

class Command(BaseCommand):
    help = 'Deletes legacy categories that have NULL classification.'

    def handle(self, *args, **options):
        self.stdout.write("Scanning for legacy categories...")
        
        # 1. Find categories with NULL classification (Legacy data)
        legacy_cats = ExpenseCategory.objects.filter(classification__isnull=True)
        count = legacy_cats.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS("No legacy categories found. Database is clean."))
            return

        self.stdout.write(self.style.WARNING(f"Found {count} legacy categories. Deleting..."))
        
        # 2. Delete them
        # Note: This might fail if Expenses/Allocations are linked to them.
        # But since we want to enforce the new structure, we should force this.
        # If it fails due to ProtectedError, we need to cascade delete or re-assign.
        # For a dev environment reset, we usually want to wipe them.
        
        # However, to be safe, let's try deleting.
        try:
            legacy_cats.delete()
            self.stdout.write(self.style.SUCCESS(f"Successfully deleted {count} legacy categories."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Could not delete some categories due to existing links: {e}"))
            self.stdout.write(self.style.WARNING("Recommendation: Wipe the DB volume completely to start fresh."))