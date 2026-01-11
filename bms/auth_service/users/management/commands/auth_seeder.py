# File: bms/auth_service/users/management/commands/auth_seeder.py
from django.core.management.base import BaseCommand
from django.db import transaction, IntegrityError
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import random

from users.models import UserActivityLog, LoginAttempt

User = get_user_model()

MAX_LOGIN_ATTEMPTS_TO_KEEP = 100 # Reduced for faster seeder runs if needed
MAX_ACTIVITY_LOGS_TO_KEEP = 200  # Reduced for faster seeder runs

class Command(BaseCommand):
    help = 'Seed auth_service database with initial users and related auth data.'

    TEMP_DEPARTMENTS = [
        {'id': 1, 'name': 'Finance Departmenst', 'code': 'FIN'},
        {'id': 2, 'name': 'Human Resoursces', 'code': 'HR'},
        {'id': 3, 'name': 'Informatiosn Technology', 'code': 'IsT'},
        {'id': 4, 'name': 'Operations', 'code': 'OPS'},
        {'id': 5, 'name': 'Marketing', 'code': 'MKT'},
    ]

    def get_temp_department_info(self, code):
        for dept in self.TEMP_DEPARTMENTS:
            if dept['code'] == code:
                return dept
        self.stdout.write(self.style.WARNING(f"Dept code '{code}' not found. User gets no dept info."))
        return {'id': None, 'name': None}

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting auth_service database seeding...'))
        self.create_users()
        self.prune_and_create_login_attempts()
        self.prune_and_create_user_activity_logs()
        self.stdout.write(self.style.SUCCESS('Auth_service database seeding completed successfully!'))

    def create_users(self):
        self.stdout.write('Creating/verifying users...')

        finance_dept = self.get_temp_department_info('FIN')
        it_dept = self.get_temp_department_info('IT')
        ops_dept = self.get_temp_department_info('OPS')
        mkt_dept = self.get_temp_department_info('MKT')
        hr_dept = self.get_temp_department_info('HR')

        users_data = [
            {'email': 'admin@example.com', 'username': 'admin_auth', 'password': 'Password123!', 'first_name': 'AuthAdmin', 'last_name': 'User', 'role': 'ADMIN', 'department_info': finance_dept, 'is_staff': True, 'is_superuser': True, 'phone_number': '+639000000000'},
            {'email': 'finances_head@example.com', 'username': 'finance_head_auth', 'password': 'Password123!', 'first_name': 'Finance', 'last_name': 'Head', 'role': 'FINANCE_HEAD', 'department_info': finance_dept, 'is_staff': True, 'phone_number': '+639171234567'},
            {'email': 'it_user@example.com', 'username': 'it_user_auth', 'password': 'Password123!', 'first_name': 'IT', 'last_name': 'Support', 'role': 'ADMIN', 'department_info': it_dept, 'phone_number': '+639171234568'},
            {'email': 'ops_user@example.com', 'username': 'ops_user_auth', 'password': 'password123', 'first_name': 'Operations', 'last_name': 'Staff', 'role': 'GENERAL_USER', 'department_info': ops_dept, 'phone_number': '+639171111111'}, # MODIFIED: Role changed to a valid choice
            {'email': 'adisbentulan@gmail.com', 'username': 'adi123', 'password': 'password123', 'first_name': 'Eldrin', 'last_name': 'Adi', 'role': 'ADMIN', 'department_info': it_dept, 'phone_number': '+639179876542'},
            {'email': 'mkt_user@example.com', 'username': 'mkt_user_auth', 'password': 'Password123!', 'first_name': 'Marketing', 'last_name': 'Specialist', 'role': 'GENERAL_USER', 'department_info': mkt_dept, 'phone_number': '+639172222222'}, # MODIFIED: Role changed to a valid choice
            {'email': 'hr_user@example.com', 'username': 'hr_user_auth', 'password': 'Password123!', 'first_name': 'HR', 'last_name': 'Manager', 'role': 'GENERAL_USER', 'department_info': hr_dept, 'phone_number': '+639173333333'}, # MODIFIED: Role changed to a valid choice
        ]

        created_count = 0
        updated_count = 0
        for item_data in users_data:
            email_val = item_data.get('email')
            username_val = item_data.get('username')

            if not email_val or not username_val:
                self.stdout.write(self.style.ERROR(f"Skipping user data due to missing email or username: {item_data}"))
                continue

            dept_info = item_data.get('department_info', {'id': None, 'name': None})

            defaults = {
                'username': username_val,
                'first_name': item_data['first_name'],
                'last_name': item_data['last_name'],
                'role': item_data['role'],
                'department_id': dept_info.get('id'),
                'department_name': dept_info.get('name'),
                'is_staff': item_data.get('is_staff', False),
                'is_superuser': item_data.get('is_superuser', False),
                'is_active': True,
                'phone_number': item_data.get('phone_number'),
                'email': email_val.lower(),
            }

            try:
                user, created = User.objects.update_or_create(
                    email__iexact=email_val.lower(),
                    defaults=defaults
                )

                # ALWAYS set the password to ensure the seeder file is the source of truth
                user.set_password(item_data['password'])
                user.save()

                if created:
                    created_count += 1
                    self.stdout.write(self.style.SUCCESS(f"Created user: {user.email} (Username: {user.username})"))
                else:
                    updated_count += 1
                    # Add a note that the password was updated
                    self.stdout.write(f"User already exists, verified/updated (and password reset): {user.email} (Username: {user.username})")

            except IntegrityError as e:
                self.stdout.write(self.style.ERROR(f"IntegrityError for email '{email_val}' (target username '{username_val}'): {e}. Check if username is already taken by another email."))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Unexpected error for email '{email_val}': {e}"))

        self.stdout.write(self.style.SUCCESS(f'Processed {len(users_data)} users ({created_count} created, {updated_count} existing/updated).'))


    def prune_and_create_login_attempts(self):
        self.stdout.write('Pruning old login attempts & creating new ones...')
        users = list(User.objects.filter(is_active=True))
        if not users:
            self.stdout.write(self.style.WARNING('No active users for login attempts.'))
            return

        # This "prune and create" strategy is safe for repeated runs.
        current_attempts_count = LoginAttempt.objects.count()
        if current_attempts_count > MAX_LOGIN_ATTEMPTS_TO_KEEP:
            ids_to_delete = LoginAttempt.objects.order_by('timestamp').values_list('id', flat=True)[:current_attempts_count - MAX_LOGIN_ATTEMPTS_TO_KEEP]
            deleted_count, _ = LoginAttempt.objects.filter(id__in=list(ids_to_delete)).delete()
            self.stdout.write(self.style.WARNING(f'Pruned {deleted_count} old login attempts.'))

        new_attempts_data = []
        for i in range(min(20, len(users) * 2)):
            user = random.choice(users) if random.random() < 0.9 else None
            success = random.choices([True, False], weights=[0.8, 0.2], k=1)[0]
            username_input_val = user.email if user else f"ghost_user{i}@example.com"

            new_attempts_data.append(LoginAttempt(
                user=user if user and success else None,
                username_input=username_input_val,
                ip_address=f"172.16.0.{random.randint(1, 100)}",
                user_agent=random.choice(["Chrome/90.0", "Firefox/88.0", "Safari/14.0", "Edge/91.0"]),
                success=success,
                timestamp=timezone.now() - timedelta(minutes=random.randint(1, 60*24*7))
            ))
        if new_attempts_data:
            LoginAttempt.objects.bulk_create(new_attempts_data)
        self.stdout.write(self.style.SUCCESS(f'Created {len(new_attempts_data)} new login attempts.'))


    def prune_and_create_user_activity_logs(self):
        self.stdout.write('Pruning old activity logs & creating new ones...')
        users = list(User.objects.filter(is_active=True))
        if not users:
            self.stdout.write(self.style.WARNING('No active users for activity logs.'))
            return

        current_logs_count = UserActivityLog.objects.count()
        if current_logs_count > MAX_ACTIVITY_LOGS_TO_KEEP:
            ids_to_delete = UserActivityLog.objects.order_by('timestamp').values_list('id', flat=True)[:current_logs_count - MAX_ACTIVITY_LOGS_TO_KEEP]
            deleted_count, _ = UserActivityLog.objects.filter(id__in=list(ids_to_delete)).delete()
            self.stdout.write(self.style.WARNING(f'Pruned {deleted_count} old user activity logs.'))

        log_types_auth = [
            ('LOGIN', 'User logged in successfully.', 'SUCCESS'),
            ('LOGIN', 'Failed login attempt.', 'FAILED'),
            ('LOGOUT', 'User logged out.', 'SUCCESS'),
            ('PROFILE_UPDATE', 'User updated their profile.', 'SUCCESS'),
            ('PASSWORD_CHANGE', 'User changed their password.', 'SUCCESS'),
            ('PASSWORD_RESET_REQUEST', 'Password reset requested for email.', 'ATTEMPTED'),
            ('USER_MANAGEMENT', 'Admin action: New user created.', 'SUCCESS'), # MODIFIED: Changed log type and status to valid choices
        ]
        new_logs_data = []
        for _ in range(min(30, len(users) * 3)):
            user_for_log = random.choice(users)
            log_type, action_template, status = random.choice(log_types_auth)
            
            action_text = action_template.replace("User", user_for_log.username)
            if log_type == 'PASSWORD_RESET_REQUEST':
                action_text = f"Password reset requested for email associated with {user_for_log.username}."
            elif log_type == 'USER_MANAGEMENT':
                admin_user = next((u for u in users if u.role == 'ADMIN'), user_for_log)
                created_user_username = random.choice([u.username for u in users if u != admin_user] or ["new_sample_user"])
                action_text = f"Admin {admin_user.username} created user {created_user_username}."
                user_for_log = admin_user

            new_logs_data.append(UserActivityLog(
                user=user_for_log,
                log_type=log_type,
                action=action_text,
                status=status,
                details={'ip_address': f"10.0.1.{random.randint(1,100)}"} if 'LOGIN' in log_type else {'source': 'seeder_auth'},
                timestamp=timezone.now() - timedelta(hours=random.randint(1, 7*24))
            ))
        if new_logs_data:
            UserActivityLog.objects.bulk_create(new_logs_data)
        self.stdout.write(self.style.SUCCESS(f'Created {len(new_logs_data)} new user activity logs.'))