from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from roles.models import Role
from systems.models import System
from system_roles.models import UserSystemRole
from ...models import Employees
import random

User = get_user_model()


def _user_model_has_field(field_name):
    try:
        return field_name in [f.name for f in User._meta.get_fields()]
    except Exception:
        return False


def generate_unique_company_id(max_attempts=1000):
    """Generate a unique company_id in the MA#### format.

    Returns a string like 'MA0123'. Checks the User table for uniqueness
    only if the `company_id` field exists on the User model.
    """
    has_company_field = _user_model_has_field('company_id')
    for _ in range(max_attempts):
        candidate = f"MA{random.randint(0, 9999):04d}"
        if not has_company_field:
            return candidate
        if not User.objects.filter(**{'company_id': candidate}).exists():
            return candidate
    raise RuntimeError('Unable to generate unique company_id after many attempts')


# Allowed department choices for hdts seeder
ALLOWED_DEPARTMENTS = {
    'IT Department',
    'Asset Department',
    'Budget Department',
}

class Command(BaseCommand):
    help = 'Seed database with predefined roles and users for the hdts system.'

    def handle(self, *args, **options):
        self.stdout.write('Seeding roles and users for the hdts system...')
        self.create_roles()
        self.create_users()
        self.stdout.write(self.style.SUCCESS('Done seeding roles and users for the hdts system.'))

    def create_roles(self):
        """Create roles specific to the hdts system."""
        self.roles = {}
        roles_data = [
            {'name': 'Admin', 'description': 'System administrator with full access'},
            {'name': 'Employee', 'description': 'Company Employee'},
            {'name': 'Ticket Coordinator', 'description': 'Manages Ticket Approval'},
        ]

        try:
            self.hdts_system = System.objects.get(slug='hdts')
            for role_data in roles_data:
                role, created = Role.objects.get_or_create(
                    system=self.hdts_system,
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
            self.stdout.write(self.style.ERROR('hdts system does not exist. Please create the system first.'))
            self.hdts_system = None

    def create_users(self):
        """Create predefined users for the hdts system."""
        if not self.hdts_system:
            return

        # Updated user data with different names, emails, and usernames
        predefined_users = [
            {
                'first_name': 'Alex',
                'last_name': 'Johnson',
                'email': 'alex.johnson@gmail.com',
                'username': 'alexj',
                'phone_number': '+639170000001',
                'role': 'Ticket Coordinator',
                'is_staff': True,
                'profile_picture': 'https://i.pinimg.com/736x/63/92/24/639224f094deff2ebf9cd261fba24004.jpg',
                'department': 'IT Department',
                # optional preset company_id; if omitted a unique MA#### will be generated
                'company_id': None,
            },
            {
                'first_name': 'Maria',
                'last_name': 'Garcia',
                'email': 'maria.garcia@gmail.com',
                'username': 'mariag',
                'phone_number': '+639170000002',
                'role': 'Ticket Coordinator',
                'is_staff': False,
                'profile_picture': 'https://i.pinimg.com/736x/d6/4f/ad/d64fad416c52bee461fc185a0118aba8.jpg',
                'department': 'Asset Department',
                'company_id': None,
            },
            {
                'first_name': 'David',
                'last_name': 'Lee',
                'email': 'david.lee@gmail.com',
                'username': 'davidl',
                'phone_number': '+639170000003',
                'role': 'Admin',
                'is_staff': False,
                'profile_picture': 'https://i.pinimg.com/736x/55/29/f1/5529f10dd54c309092226f0f4b57a15d.jpg',
                'department': 'Budget Department',
                'company_id': None,
            },
            {
                'first_name': 'Sarah',
                'last_name': 'Chen',
                'email': 'sarah.chen@gmail.com',
                'username': 'sarahc',
                'phone_number': '+639170000004',
                'role': 'Ticket Coordinator',
                'is_staff': False,
                'profile_picture': 'https://i.pinimg.com/736x/15/78/a3/1578a3c53f3e4d29e9e1b79bd4d3f7c4.jpg',
                'department': 'IT Department',
                'company_id': None,
            },
            {
                'first_name': 'Chris',
                'last_name': 'Wilson',
                'email': 'chris.wilson@gmail.com',
                'username': 'chrisw',
                'phone_number': '+639170000005',
                'role': 'Ticket Coordinator',
                'is_staff': False,
                'profile_picture': 'https://i.pinimg.com/736x/63/92/24/639224f094deff2ebf9cd261fba24004.jpg',
                'department': 'Asset Department',
                'company_id': None,
            },
            {
                'first_name': 'Employee',
                'last_name': 'Account',
                'email': 'employeeaccount@gmail.com',
                'username': 'employeeaccount',
                'phone_number': '+639170000006',
                'role': 'Employee',
                'is_staff': False,
                'profile_picture': 'https://i.pinimg.com/736x/63/92/24/639224f094deff2ebf9cd261fba24004.jpg',
                'department': 'IT Department',
                'company_id': None,
                'password': 'Employee*1',
            },
        ]

        for user_data in predefined_users:
            role = self.roles.get(user_data['role'])
            if not role:
                self.stdout.write(self.style.ERROR(f"Role '{user_data['role']}' does not exist in self.roles. Skipping user {user_data['email']}"))
                continue

            # Build defaults dynamically so we don't pass unknown fields to get_or_create
            defaults = {
                'username': user_data['username'],
                'first_name': user_data['first_name'],
                'last_name': user_data['last_name'],
                'phone_number': user_data['phone_number'],
                'is_active': True,
                'is_staff': user_data['is_staff'],
            }

            # Add department if User model supports it and value provided
            dept = user_data.get('department')
            if dept and _user_model_has_field('department'):
                # Only allow departments from the approved list
                if dept in ALLOWED_DEPARTMENTS:
                    defaults['department'] = dept
                else:
                    defaults['department'] = 'IT Department'

            # Generate or use provided company_id only if the field exists on the User model
            company_id_value = user_data.get('company_id')
            if _user_model_has_field('company_id'):
                if not company_id_value:
                    company_id_value = generate_unique_company_id()
                defaults['company_id'] = company_id_value

            user, created = User.objects.get_or_create(
                email=user_data['email'],
                defaults=defaults,
            )
            if created:
                # Use custom password if provided, otherwise default
                password = user_data.get('password', 'password123')
                user.set_password(password)
                # ensure company_id/department saved when created
                if _user_model_has_field('company_id') and not getattr(user, 'company_id', None):
                    # use provided or generate
                    user.company_id = company_id_value or generate_unique_company_id()
                if _user_model_has_field('department') and user_data.get('department'):
                    setattr(user, 'department', user_data['department'])
                user.save()
                self.stdout.write(f'Created user: {user.email} ({role.name})')
            else:
                self.stdout.write(f'User already exists: {user.email}')
                # ensure existing user has company_id and department if possible
                updated = False
                if _user_model_has_field('company_id') and not getattr(user, 'company_id', None):
                    user.company_id = company_id_value or generate_unique_company_id()
                    updated = True
                if _user_model_has_field('department') and not getattr(user, 'department', None) and user_data.get('department'):
                    setattr(user, 'department', user_data['department'])
                    updated = True
                if updated:
                    user.save()
            # Now create or update the UserSystemRole
            try:
                user_role, ur_created = UserSystemRole.objects.get_or_create(
                    user=user,
                    system=self.hdts_system,
                    role=role
                )
                
                if ur_created:
                    self.stdout.write(f'Assigned role {role.name} to {user.email} in {self.hdts_system.name} system')
                else:
                    self.stdout.write(f'User {user.email} already has role {role.name} in {self.hdts_system.name} system')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error assigning role to user: {str(e)}'))
                self.stdout.write(self.style.WARNING(f"Available fields in UserSystemRole: {[f.name for f in UserSystemRole._meta.get_fields()]}"))
            # If this is an Employee role, ensure there is an Employees profile
            try:
                if role.name == 'Employee':
                    emp_defaults = {
                        'user': user,
                        'username': user.username,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'phone_number': user.phone_number,
                        'status': 'Approved' if user.is_active else 'Pending',
                        'profile_picture': user_data.get('profile_picture'),
                    }
                    # include company_id/department when available on User
                    if _user_model_has_field('company_id'):
                        emp_defaults['company_id'] = getattr(user, 'company_id', None)
                    if _user_model_has_field('department'):
                        emp_defaults['department'] = getattr(user, 'department', None)

                    # Remove None values so get_or_create won't try to set them
                    emp_defaults = {k: v for k, v in emp_defaults.items() if v is not None}

                    employee_obj, emp_created = Employees.objects.get_or_create(
                        email=user.email,
                        defaults=emp_defaults
                    )

                    # Ensure it's linked to the auth User and has a password if provided
                    if not employee_obj.user:
                        employee_obj.user = user

                    provided_pw = user_data.get('password')
                    if provided_pw:
                        employee_obj.set_password(provided_pw)

                    # Save if newly created or we made changes
                    employee_obj.save()
                    if emp_created:
                        self.stdout.write(f'Created Employees profile for {user.email}')
                    else:
                        self.stdout.write(f'Ensured Employees profile for {user.email}')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error creating/updating Employees profile: {str(e)}'))