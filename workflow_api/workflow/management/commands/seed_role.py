from django.core.management.base import BaseCommand
from role.models import Roles

class Command(BaseCommand):
    help = 'Seed default roles into the database'

    def handle(self, *args, **kwargs):
        roles = [
            {
                "name": "Admin",
                "description": "System administrator with full permissions.",
                "user_id": 1
            },
            {
                "name": "Asset Manager",
                "description": "Manages asset lifecycle, tracking, and documentation.",
                "user_id": 2
            },
            {
                "name": "Budget Manager",
                "description": "Approves financial expenditures and tracks budgets.",
                "user_id": 3
            }
        ]

        for role in roles:
            obj, created = Roles.objects.get_or_create(
                name=role["name"],
                defaults={
                    "description": role["description"],
                    "user_id": role["user_id"],
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"✅ Created role: {obj.name}"))
            else:
                self.stdout.write(self.style.WARNING(f"ℹ️ Role already exists: {obj.name}"))
