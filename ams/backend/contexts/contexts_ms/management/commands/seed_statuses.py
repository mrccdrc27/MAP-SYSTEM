from django.core.management.base import BaseCommand
from contexts_ms.models import Status


class Command(BaseCommand):
    help = 'Seed the database with status records (10 asset statuses + 5 repair statuses)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing statuses before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing statuses...'))
            Status.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Existing statuses cleared.'))

        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding Statuses ==='))

        statuses_data = self.get_statuses_data()
        created_count = 0

        for status_data in statuses_data:
            # Use category, name, and type (if asset) for uniqueness
            lookup = {
                'name': status_data['name'],
                'category': status_data['category'],
            }
            if status_data.get('type'):
                lookup['type'] = status_data['type']

            status, created = Status.objects.get_or_create(
                **lookup,
                defaults=status_data
            )
            if created:
                created_count += 1
                category_display = status.get_category_display()
                type_display = f" ({status.get_type_display()})" if status.type else ""
                self.stdout.write(self.style.SUCCESS(f'✓ Created: {status.name} [{category_display}]{type_display}'))
            else:
                self.stdout.write(self.style.WARNING(f'- Status exists: {status.name}'))

        self.stdout.write(self.style.SUCCESS(f'\n✓ Statuses seeding complete: {created_count} created'))

    def get_statuses_data(self):
        """Generate statuses: 10 asset statuses (2 per type) + 5 repair statuses"""

        statuses = [
            # =====================
            # ASSET STATUSES (10)
            # =====================
            # Deployable statuses (2) - IDs 1-2
            {
                'category': Status.Category.ASSET,
                'name': 'Ready to Deploy',
                'type': Status.AssetStatusType.DEPLOYABLE,
                'notes': 'Asset is ready to be assigned to an employee',
            },
            {
                'category': Status.Category.ASSET,
                'name': 'Available',
                'type': Status.AssetStatusType.DEPLOYABLE,
                'notes': 'Asset is available in inventory',
            },

            # Deployed statuses (2) - IDs 3-4
            {
                'category': Status.Category.ASSET,
                'name': 'In Use',
                'type': Status.AssetStatusType.DEPLOYED,
                'notes': 'Asset is currently assigned and in use',
            },
            {
                'category': Status.Category.ASSET,
                'name': 'Checked Out',
                'type': Status.AssetStatusType.DEPLOYED,
                'notes': 'Asset has been checked out to an employee',
            },

            # Undeployable statuses (2) - IDs 5-6
            {
                'category': Status.Category.ASSET,
                'name': 'Under Repair',
                'type': Status.AssetStatusType.UNDEPLOYABLE,
                'notes': 'Asset is being repaired and cannot be deployed',
            },
            {
                'category': Status.Category.ASSET,
                'name': 'Broken',
                'type': Status.AssetStatusType.UNDEPLOYABLE,
                'notes': 'Asset is damaged and needs repair or replacement',
            },

            # Pending statuses (2) - IDs 7-8
            {
                'category': Status.Category.ASSET,
                'name': 'Pending Approval',
                'type': Status.AssetStatusType.PENDING,
                'notes': 'Asset purchase or deployment is pending approval',
            },
            {
                'category': Status.Category.ASSET,
                'name': 'In Transit',
                'type': Status.AssetStatusType.PENDING,
                'notes': 'Asset is being shipped or transferred',
            },

            # Archived statuses (2) - IDs 9-10
            {
                'category': Status.Category.ASSET,
                'name': 'Retired',
                'type': Status.AssetStatusType.ARCHIVED,
                'notes': 'Asset has been retired from service',
            },
            {
                'category': Status.Category.ASSET,
                'name': 'Lost/Stolen',
                'type': Status.AssetStatusType.ARCHIVED,
                'notes': 'Asset is lost or has been stolen',
            },

            # =====================
            # REPAIR STATUSES (5)
            # =====================
            # IDs 11-15
            {
                'category': Status.Category.REPAIR,
                'name': 'Pending',
                'type': None,
                'notes': 'Repair request is pending review',
            },
            {
                'category': Status.Category.REPAIR,
                'name': 'In Progress',
                'type': None,
                'notes': 'Repair is currently being worked on',
            },
            {
                'category': Status.Category.REPAIR,
                'name': 'Awaiting Parts',
                'type': None,
                'notes': 'Repair is waiting for replacement parts',
            },
            {
                'category': Status.Category.REPAIR,
                'name': 'Completed',
                'type': None,
                'notes': 'Repair has been completed successfully',
            },
            {
                'category': Status.Category.REPAIR,
                'name': 'Cancelled',
                'type': None,
                'notes': 'Repair request has been cancelled',
            },
        ]

        return statuses

