from django.core.management.base import BaseCommand
from django.db.models import Q
from users.models import User
from system_roles.models import UserSystemRole
from roles.models import Role
from hdts.models import Employees


class Command(BaseCommand):
    help = 'Set status to Approved for all Ticket Coordinators and System Admins'

    def handle(self, *args, **options):
        self.stdout.write('Starting approval process for Coordinators and Admins...')

        # Find Ticket Coordinator and Admin roles (case-insensitive)
        coordinator_role = Role.objects.filter(name__iexact='Ticket Coordinator').first()
        admin_role = Role.objects.filter(name__iexact='Admin').first()
        
        if not coordinator_role and not admin_role:
            self.stdout.write(self.style.WARNING('No Ticket Coordinator or Admin roles found'))
            return

        # Find all users with these roles
        user_ids = set()
        if coordinator_role:
            user_ids.update(
                UserSystemRole.objects.filter(role=coordinator_role).values_list('user_id', flat=True)
            )
        if admin_role:
            user_ids.update(
                UserSystemRole.objects.filter(role=admin_role).values_list('user_id', flat=True)
            )

        # Update User model records
        coordinators_admins = User.objects.filter(id__in=user_ids)
        updated_count = coordinators_admins.update(status='Approved')
        self.stdout.write(
            self.style.SUCCESS(
                f'Updated {updated_count} users (Ticket Coordinators and Admins) to Approved status'
            )
        )

        # Also update matching Employees records if they exist
        coordinator_admin_emails = coordinators_admins.values_list('email', flat=True)
        employees_updated = Employees.objects.filter(
            email__in=coordinator_admin_emails
        ).update(status='Approved')

        if employees_updated:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Updated {employees_updated} employee records to Approved status'
                )
            )

        self.stdout.write(self.style.SUCCESS('Approval process completed!'))
