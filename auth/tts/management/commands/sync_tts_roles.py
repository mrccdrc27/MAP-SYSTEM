"""
Management command to manually sync all TTS roles and user_system_roles to workflow_api.
This is useful when async sync fails due to SQLite concurrency issues.
"""
from django.core.management.base import BaseCommand
from roles.models import Role
from systems.models import System
from system_roles.models import UserSystemRole
from celery import current_app
import time
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Sync all TTS roles and user_system_roles to workflow_api via Celery'

    def add_arguments(self, parser):
        parser.add_argument(
            '--delay',
            type=float,
            default=0.5,
            help='Delay between sync messages (seconds) to avoid SQLite lock issues',
        )
        parser.add_argument(
            '--roles-only',
            action='store_true',
            help='Only sync roles, not user_system_roles',
        )

    def handle(self, *args, **options):
        delay = options.get('delay', 0.5)
        roles_only = options.get('roles_only', False)
        
        try:
            tts_system = System.objects.get(slug='tts')
        except System.DoesNotExist:
            self.stdout.write(self.style.ERROR('TTS system not found'))
            return
        
        # Sync all TTS roles
        self.stdout.write('Syncing TTS roles to workflow_api...')
        roles = Role.objects.filter(system=tts_system)
        
        for role in roles:
            role_data = {
                "role_id": role.id,
                "name": role.name,
                "system": role.system.slug,
                "description": role.description,
                "is_custom": role.is_custom,
                "created_at": role.created_at.isoformat(),
                "action": "create",  # Use create to upsert
            }
            
            try:
                current_app.send_task(
                    'role.tasks.sync_role',
                    args=[role_data],
                    queue='tts.role.sync',
                    routing_key='tts.role.sync',
                )
                self.stdout.write(f'  -> Sent role sync: {role.name} (ID: {role.id})')
                time.sleep(delay)  # Delay to avoid SQLite lock
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  -> Failed to sync role {role.name}: {e}'))
        
        self.stdout.write(self.style.SUCCESS(f'Synced {roles.count()} roles'))
        
        if roles_only:
            return
        
        # Sync all TTS user_system_roles
        self.stdout.write('Syncing TTS user_system_roles to workflow_api...')
        user_system_roles = UserSystemRole.objects.filter(system=tts_system)
        
        for usr in user_system_roles:
            usr_data = {
                "user_system_role_id": usr.id,
                "user_id": usr.user.id,
                "user_email": usr.user.email,
                "user_full_name": usr.user.get_full_name(),
                "system": usr.system.slug,
                "role_id": usr.role.id,
                "role_name": usr.role.name,
                "assigned_at": usr.assigned_at.isoformat(),
                "is_active": usr.is_active,
                "settings": usr.settings,
                "action": "create",  # Use create to upsert
            }
            
            try:
                current_app.send_task(
                    'role.tasks.sync_user_system_role',
                    args=[usr_data],
                    queue='tts.user_system_role.sync',
                    routing_key='tts.user_system_role.sync',
                )
                self.stdout.write(f'  -> Sent user_system_role sync: {usr.user.email} as {usr.role.name}')
                time.sleep(delay)  # Delay to avoid SQLite lock
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  -> Failed to sync user_system_role for {usr.user.email}: {e}'))
        
        self.stdout.write(self.style.SUCCESS(f'Synced {user_system_roles.count()} user_system_roles'))
        self.stdout.write(self.style.SUCCESS('Done! Wait for workers to process the sync messages.'))
