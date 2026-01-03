from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from roles.models import Role
from systems.models import System
from system_roles.models import UserSystemRole
from tts.tasks import trigger_workflow_seeding

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed database with predefined roles and users for the TTS system.'

    def handle(self, *args, **options):
        self.stdout.write('Seeding roles and users for the TTS system...')
        self.create_roles()
        self.create_users()
        self.stdout.write(self.style.SUCCESS('Done seeding roles and users for the TTS system.'))
        
        # Trigger workflow seeding in workflow_api after successful TTS seeding
        self.trigger_workflow_seeding()

    def trigger_workflow_seeding(self):
        """Send a message to trigger workflow seeding in workflow_api."""
        try:
            # Call the function directly (not as a task) - it will send a message to workflow_api
            result = trigger_workflow_seeding()
            self.stdout.write(self.style.SUCCESS('Workflow seeding triggered'))
            self.stdout.write(self.style.SUCCESS(f'  Message: {result.get("message", "")}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Failed to trigger workflow seeding: {str(e)}'))

    def create_roles(self):
        """Create roles specific to the TTS system."""
        self.roles = {}
        roles_data = [
            {'name': 'Admin', 'description': 'System administrator with full access'},
            {'name': 'Asset Manager', 'description': 'Manages digital assets and metadata'},
            {'name': 'Budget Manager', 'description': 'Oversees budget allocation and approvals'},
        ]

        try:
            self.tts_system = System.objects.get(slug='tts')
            for role_data in roles_data:
                role, created = Role.objects.get_or_create(
                    system=self.tts_system,
                    name=role_data['name'],
                    defaults={
                        'description': role_data['description']
                    }
                )
                self.roles[role.name] = role
                if created:
                    self.stdout.write(f'Created role: {role.name}')
                else:
                    self.stdout.write(f'Role already exists: {role.name}')
        except System.DoesNotExist:
            self.stdout.write(self.style.ERROR('TTS system does not exist. Please create the system first.'))
            self.tts_system = None

    def create_users(self):
        """Create predefined users for the TTS system."""
        if not self.tts_system:
            return

        predefined_users = [
            {
                'first_name': 'Lawrence',
                'last_name': 'Afable',
                'middle_initial': 'A.',
                'email': 'tickettrackingsystem.mapactive+lawrenceafable@dev.mapactive.tech',
                'username': 'lawrenceafable',
                'phone_number': '+10000000001',
                'role': 'Admin',
                'is_staff': True,
                'profile_picture': 'https://i.pinimg.com/736x/63/92/24/639224f094deff2ebf9cd261fba24004.jpg',
            },
            {
                'first_name': 'Rivo',
                'last_name': 'Vebayo',
                'middle_initial': 'M.',
                'email': 'tickettrackingsystem.mapactive+rivovebayo@dev.mapactive.tech',
                'username': 'rivovebayo',
                'phone_number': '+10000000002',
                'role': 'Asset Manager',
                'is_staff': False,
                'profile_picture': 'https://i.pinimg.com/736x/d6/4f/ad/d64fad416c52bee461fc185a0118aba8.jpg',
            },
            {
                'first_name': 'Marc Cedric',
                'last_name': 'Mayuga',
                'middle_initial': 'C.',
                'email': 'tickettrackingsystem.mapactive+marccedric@dev.mapactive.tech',
                'username': 'marccedric',
                'phone_number': '+10000000003',
                'role': 'Admin',
                'is_staff': True,
                'profile_picture': 'https://i.pinimg.com/736x/63/92/24/639224f094deff2ebf9cd261fba24004.jpg',
            },
            {
                'first_name': 'Sean Axzel',
                'last_name': 'Valderama',
                'middle_initial': 'Z.',
                'email': 'tickettrackingsystem.mapactive+seanvalderama@dev.mapactive.tech',
                'username': 'seanvalderama',
                'phone_number': '+10000000004',
                'role': 'Budget Manager',
                'is_staff': False,
                'profile_picture': 'https://i.pinimg.com/736x/55/29/f1/5529f10dd54c309092226f0f4b57a15d.jpg',
            },
        ]

        for user_data in predefined_users:
            role = self.roles.get(user_data['role'])
            if not role:
                self.stdout.write(self.style.ERROR(f"Role '{user_data['role']}' does not exist. Skipping user {user_data['email']}"))
                continue

            user, created = User.objects.get_or_create(
                email=user_data['email'],
                defaults={
                    'username': user_data['username'],
                    'first_name': user_data['first_name'],
                    'last_name': user_data['last_name'],
                    'phone_number': user_data['phone_number'],
                    'is_active': True,
                    'is_staff': user_data['is_staff'],
                }
            )
            if created:
                user.set_password('Tr@ck1ng.Sys7em.2025!Secure')  # NIST-compliant secure password
                user.save()
                self.stdout.write(f'Created user: {user.email} ({role.name})')
            else:
                self.stdout.write(f'User already exists: {user.email}')
            
            # Now create or update the UserSystemRole with simplified structure
            try:
                user_role, ur_created = UserSystemRole.objects.get_or_create(
                    user=user,
                    system=self.tts_system,
                    role=role
                )
                
                if ur_created:
                    self.stdout.write(f'Assigned role {role.name} to {user.email} in {self.tts_system.name} system')
                else:
                    self.stdout.write(f'User {user.email} already has role {role.name} in {self.tts_system.name} system')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error assigning role to user: {str(e)}'))
                # Print more debug information
                self.stdout.write(self.style.WARNING(f"Available fields in UserSystemRole: {[f.name for f in UserSystemRole._meta.get_fields()]}"))